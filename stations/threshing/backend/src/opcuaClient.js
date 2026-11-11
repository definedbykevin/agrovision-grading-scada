/**
 * OPC UA Client Wrapper for Siemens S7 PLC - Threshing Station
 * Menggunakan node-opcua-client untuk membaca tag secara symbolic (Node ID)
 */

let OPCUAClient, AttributeIds, ClientSubscription, TimestampsToReturn, ClientMonitoredItem;
let isOpcUaAvailable = false;

try {
  const opcua = await import("node-opcua-client");
  OPCUAClient = opcua.OPCUAClient;
  AttributeIds = opcua.AttributeIds;
  ClientSubscription = opcua.ClientSubscription;
  TimestampsToReturn = opcua.TimestampsToReturn;
  ClientMonitoredItem = opcua.ClientMonitoredItem;
  isOpcUaAvailable = true;
  console.log("[opcuaClient] node-opcua-client successfully loaded.");
} catch (e) {
  isOpcUaAvailable = false;
  console.warn("[opcuaClient] node-opcua-client not available / disabled.");
}

export class OpcUaClientWrapper {
  constructor(deviceConfig) {
    this.deviceConfig = deviceConfig;
    if (isOpcUaAvailable && OPCUAClient) {
      this.client = OPCUAClient.create({
        endpointMustExist: false,
        connectionStrategy: {
          maxRetry: 1,
        }
      });
    } else {
      this.client = null;
    }
    this.session = null;
    this.subscription = null;
    this.connected = false;
    this.lastError = null;
    this.monitoredItems = new Map(); // key: tagId -> ClientMonitoredItem
  }

  async connect() {
    if (!this.client) return;
    if (this.connected && this.session) return;
    
    const endpointUrl = `opc.tcp://${this.deviceConfig.ip_address}:4840`;

    try {
      await this.client.connect(endpointUrl);
      this.session = await this.client.createSession();
      this.connected = true;
      this.lastError = null;
      console.log(`[opcuaClient] ✅ Connected to ${endpointUrl}`);
    } catch (err) {
      this.connected = false;
      this.lastError = err.message;
      console.error(`[opcuaClient] Connect error to ${endpointUrl}: ${err.message}`);
      throw err;
    }
  }

  disconnect() {
    return new Promise(async (resolve) => {
      try {
        if (this.subscription) {
          await this.subscription.terminate();
          this.subscription = null;
        }
        if (this.session) {
          await this.session.close();
          this.session = null;
        }
        if (this.client) {
          await this.client.disconnect();
        }
      } catch (e) {
        /* ignore */
      }
      this.connected = false;
      this.monitoredItems.clear();
      resolve();
    });
  }

  async ensureConnected() {
    if (!this.connected || !this.session) {
      await this.connect();
    }
  }

  async readMultipleTags(tags) {
    await this.ensureConnected();

    const nodesToRead = [];
    const validTags = [];

    for (const tag of tags) {
      if (!tag.node_id) continue;
      nodesToRead.push({
        nodeId: tag.node_id,
        attributeId: AttributeIds.Value
      });
      validTags.push(tag);
    }

    if (nodesToRead.length === 0) return new Map();

    const results = new Map();
    try {
      const dataValues = await this.session.read(nodesToRead);
      for (let i = 0; i < dataValues.length; i++) {
        const dv = dataValues[i];
        const tag = validTags[i];
        if (dv.statusCode.isGood() && dv.value) {
          results.set(tag.id, dv.value.value);
        } else {
          console.warn(`[opcuaClient] Bad status or null value for tag ${tag.tag_name} (${tag.node_id}): ${dv.statusCode.toString()}`);
        }
      }
    } catch (err) {
      this.connected = false;
      throw err;
    }

    return results;
  }

  async writeTag(tag, value) {
    await this.ensureConnected();
    if (!tag.node_id) {
      throw new Error(`Tag ${tag.tag_name} does not have a node_id configured for OPC UA.`);
    }

    let opcType;
    switch ((tag.data_type || '').toUpperCase()) {
      case 'BOOL':
        opcType = { dataType: 1, value: Boolean(value) };
        break;
      case 'INT':
        opcType = { dataType: 4, value: parseInt(value, 10) };
        break;
      case 'DINT':
        opcType = { dataType: 6, value: parseInt(value, 10) };
        break;
      case 'REAL':
        opcType = { dataType: 8, value: parseFloat(value) };
        break;
      default:
        throw new Error(`Unsupported OPC UA data_type: ${tag.data_type}`);
    }

    const nodeToWrite = {
      nodeId: tag.node_id,
      attributeId: AttributeIds.Value,
      value: {
        value: opcType
      }
    };

    const statusCode = await this.session.write(nodeToWrite);
    if (!statusCode.isGood()) {
      throw new Error(`OPC UA write failed with code: ${statusCode.toString()}`);
    }
  }

  async browseNode(nodeId = "RootFolder") {
    await this.ensureConnected();
    const browseResult = await this.session.browse(nodeId);
    return browseResult.references.map(ref => ({
      nodeId: ref.nodeId.toString(),
      browseName: ref.browseName.toString(),
      displayName: ref.displayName.text,
      nodeClass: ref.nodeClass.toString(),
      typeDefinition: ref.typeDefinition.toString()
    }));
  }
}
