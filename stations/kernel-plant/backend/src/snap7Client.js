/**
 * Snap7 Client Wrapper for Siemens S7 PLC
 * Di-copy dari plc-collector dan disederhanakan (console log instead of winston)
 */

let S7ClientClass;
let isMock = false;

try {
  const snap7 = await import("node-snap7");
  S7ClientClass = snap7.default.S7Client;
  console.log("[snap7Client] node-snap7 successfully loaded.");
} catch (e) {
  isMock = true;
  console.warn(
    "[snap7Client] node-snap7 not found — PLC connection disabled. Install: npm install node-snap7",
  );
}

const DATA_TYPE_SIZE = { BOOL: 1, INT: 2, DINT: 4, REAL: 4 };

class Snap7ClientWrapper {
  constructor(deviceConfig) {
    this.deviceConfig = deviceConfig;
    if (isMock || !S7ClientClass) {
      this.client = null;
      this.connected = false;
      this.lastError =
        "node-snap7 not installed. Install: npm install node-snap7";
    } else {
      this.client = new S7ClientClass();
      this.connected = false;
      this.lastError = null;
    }
  }

  async connect() {
    if (!this.client) return;
    const { ip_address, rack, slot } = this.deviceConfig;
    await new Promise((resolve, reject) => {
      this.client.ConnectTo(ip_address, rack, slot, (err) => {
        if (err) {
          const text = this.client.ErrorText(err);
          this.connected = false;
          this.lastError = text;
          console.error("[snap7Client] PLC connect error", {
            ip: ip_address,
            error: text,
          });
          return reject(new Error(text));
        }
        this.connected = true;
        this.lastError = null;
        console.log("[snap7Client] PLC connected", { ip_address, rack, slot });
        resolve();
      });
    });
  }

  async ensureConnected() {
    if (!this.connected) {
      await this.connect();
    }
  }

  async readTag(tag) {
    await this.ensureConnected();
    const { db_number, byte_offset, bit_offset, data_type } = tag;
    return new Promise((resolve, reject) => {
      const size = DATA_TYPE_SIZE[data_type] || 4;
      this.client.DBRead(db_number, byte_offset, size, (err, res) => {
        if (err) {
          const text = this.handleReadError(err);
          return reject(new Error(text));
        }
        if (!res) {
          this.lastError = "PLC read returned null";
          return reject(new Error(this.lastError));
        }
        try {
          const value = this.parseBuffer(res, data_type, bit_offset, 0);
          resolve(value);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async readMultipleTags(tags) {
    await this.ensureConnected();
    const grouped = {};
    for (const tag of tags) {
      // Use node_id as memory area identifier for SNAP7 if it exists, default to 'DB'
      const area = (tag.node_id && ['M','I','Q','DB'].includes(tag.node_id.toUpperCase())) ? tag.node_id.toUpperCase() : 'DB';
      const dbNum = area === 'DB' ? tag.db_number : 0;
      const key = `${area}_${dbNum}`;
      if (!grouped[key]) grouped[key] = { area, dbNum, tags: [] };
      grouped[key].tags.push(tag);
    }

    const results = new Map();

    for (const [key, group] of Object.entries(grouped)) {
      const { area, dbNum, tags: dbTags } = group;
      let minOffset = Infinity;
      let maxEndOffset = 0;

      for (const tag of dbTags) {
        const size = DATA_TYPE_SIZE[tag.data_type] || 4;
        if (tag.byte_offset < minOffset) minOffset = tag.byte_offset;
        if (tag.byte_offset + size > maxEndOffset)
          maxEndOffset = tag.byte_offset + size;
      }

      const totalBytes = maxEndOffset - minOffset;

      try {
        const buffer = await new Promise((resolve, reject) => {
          if (area === 'DB') {
            this.client.DBRead(dbNum, minOffset, totalBytes, (err, res) => {
              if (err) return reject(new Error(this.handleReadError(err)));
              if (!res) return reject(new Error("PLC batch DBRead returned null"));
              resolve(res);
            });
          } else {
            // S7AreaPE = 0x81 (Inputs I), S7AreaPA = 0x82 (Outputs Q), S7AreaMK = 0x83 (Merker M)
            let s7Area;
            if (area === 'I') s7Area = this.client.S7AreaPE;
            else if (area === 'Q') s7Area = this.client.S7AreaPA;
            else if (area === 'M') s7Area = this.client.S7AreaMK;
            
            this.client.ReadArea(s7Area, 0, minOffset, totalBytes, this.client.S7WLByte, (err, res) => {
              if (err) return reject(new Error(this.handleReadError(err)));
              if (!res) return reject(new Error("PLC batch ReadArea returned null"));
              resolve(res);
            });
          }
        });

        for (const tag of dbTags) {
          try {
            const localOffset = tag.byte_offset - minOffset;
            const value = this.parseBuffer(
              buffer,
              tag.data_type,
              tag.bit_offset,
              localOffset,
            );
            results.set(tag.id, value);
          } catch (e) {
            console.error(`[snap7Client] Batch parse error: ${tag.tag_name}`, { error: e.message });
          }
        }
      } catch (e) {
        console.error(`[snap7Client] Batch read ${area}${dbNum} failed`, { error: e.message });
        if (this.isNetworkError(e.message)) {
          this.connected = false;
          throw e;
        }
      }
    }

    return results;
  }

  parseBuffer(buffer, dataType, bitOffset, localOffset) {
    switch (dataType) {
      case "BOOL": {
        const byte = buffer.readUInt8(localOffset);
        const bit =
          bitOffset !== null && bitOffset !== undefined ? bitOffset : 0;
        return (byte & (1 << bit)) !== 0;
      }
      case "INT":
        return buffer.readInt16BE(localOffset);
      case "DINT":
        return buffer.readInt32BE(localOffset);
      case "REAL":
        return buffer.readFloatBE(localOffset);
      default:
        throw new Error(`Unsupported data_type: ${dataType}`);
    }
  }

  async writeTag(tag, value) {
    await this.ensureConnected();
    const { db_number, byte_offset, bit_offset, data_type, node_id } = tag;
    const areaStr = (node_id && ['M','I','Q','DB'].includes(node_id.toUpperCase())) ? node_id.toUpperCase() : 'DB';
    const dbNum = areaStr === 'DB' ? db_number : 0;
    
    let s7Area = this.client.S7AreaDB;
    if (areaStr === 'I') s7Area = this.client.S7AreaPE;
    else if (areaStr === 'Q') s7Area = this.client.S7AreaPA;
    else if (areaStr === 'M') s7Area = this.client.S7AreaMK;

    const performRead = (amount) => {
      return new Promise((resolve, reject) => {
        if (areaStr === 'DB') {
          this.client.DBRead(dbNum, byte_offset, amount, (err, res) => {
             if (err) return reject(err);
             resolve(res);
          });
        } else {
          this.client.ReadArea(s7Area, dbNum, byte_offset, amount, this.client.S7WLByte, (err, res) => {
             if (err) return reject(err);
             resolve(res);
          });
        }
      });
    };

    const performWrite = (amount, buf) => {
      return new Promise((resolve, reject) => {
        if (areaStr === 'DB') {
          this.client.DBWrite(dbNum, byte_offset, amount, buf, (err) => {
             if (err) return reject(err);
             resolve();
          });
        } else {
          this.client.WriteArea(s7Area, dbNum, byte_offset, amount, this.client.S7WLByte, buf, (err) => {
             if (err) return reject(err);
             resolve();
          });
        }
      });
    };

    return new Promise(async (resolve, reject) => {
      if (data_type === "BOOL" && bit_offset !== null && bit_offset !== undefined) {
        try {
          const res = await performRead(1);
          if (!res) return reject(new Error("PLC read null (BOOL write)"));
          
          let byte = res.readUInt8(0);
          const mask = 1 << bit_offset;
          if (value) byte |= mask;
          else byte &= ~mask;
          
          const buf = Buffer.alloc(1);
          buf.writeUInt8(byte, 0);
          
          await performWrite(1, buf);
          console.debug(`[snap7Client] Write ${areaStr}${dbNum}.${byte_offset}.${bit_offset} = ${value}`);
          resolve();
        } catch (err) {
          const text = this.client.ErrorText(err);
          this.lastError = text;
          this.connected = false;
          return reject(new Error(text));
        }
      } else {
        const size = DATA_TYPE_SIZE[data_type] || 4;
        const buf = Buffer.alloc(size);
        switch (data_type) {
          case "INT":
            buf.writeInt16BE(Number(value), 0);
            break;
          case "DINT":
            buf.writeInt32BE(Number(value), 0);
            break;
          case "REAL":
            buf.writeFloatBE(Number(value), 0);
            break;
          default:
            return reject(new Error(`Unsupported write data_type: ${data_type}`));
        }

        try {
          await performWrite(size, buf);
          resolve();
        } catch (err) {
          const text = this.client.ErrorText(err);
          this.lastError = text;
          this.connected = false;
          return reject(new Error(text));
        }
      }
    });
  }

  isNetworkError(errorText) {
    if (!errorText) return false;
    const lower = errorText.toLowerCase();
    return (
      lower.includes("connection") ||
      lower.includes("socket") ||
      lower.includes("timeout") ||
      lower.includes("unreachable") ||
      lower.includes("iso on tcp")
    );
  }

  handleReadError(err) {
    const text = this.client.ErrorText(err);
    this.lastError = text;
    if (this.isNetworkError(text)) this.connected = false;
    return text;
  }

  disconnect() {
    try {
      this.client.Disconnect();
    } catch (e) {
      /* ignore */
    }
    this.connected = false;
  }
}

export { Snap7ClientWrapper, isMock };
