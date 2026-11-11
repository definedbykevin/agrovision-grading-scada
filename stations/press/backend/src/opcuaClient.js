/**
 * OPC UA Client Wrapper for Siemens S7 PLC
 * Menggunakan node-opcua-client untuk membaca tag secara symbolic (Node ID)
 */

import { OPCUAClient, AttributeIds, ClientSubscription, TimestampsToReturn, ClientMonitoredItem } from "node-opcua-client";

export class OpcUaClientWrapper {
  constructor(deviceConfig) {
    this.deviceConfig = deviceConfig;
    this.client = OPCUAClient.create({
      endpointMustExist: false,
      connectionStrategy: {
        maxRetry: 1,
      }
    });
    this.session = null;
    this.subscription = null;
    this.connected = false;
    this.lastError = null;
    this.monitoredItems = new Map(); // key: tagId -> ClientMonitoredItem
  }

  async connect() {
    if (this.connected && this.session) return;
    
    // Asumsi ip_address di database diset seperti '10.0.0.10'
    // Port default OPC UA Siemens biasanya 4840
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
        await this.client.disconnect();
      } catch (e) {
        console.error("[opcuaClient] Disconnect error:", e.message);
      } finally {
        this.connected = false;
        this.monitoredItems.clear();
        resolve();
      }
    });
  }

  /**
   * Subscribe ke list of tags
   * @param {Array} tags - Array of tag objects dari DB (harus punya node_id)
   * @param {Function} onChange - Callback (tagId, value)
   */
  async subscribeTags(tags, onChange) {
    if (!this.session) throw new Error("No active OPC UA session");

    // Buat subscription jika belum ada
    if (!this.subscription) {
      this.subscription = await ClientSubscription.create(this.session, {
        requestedPublishingInterval: 200,
        requestedLifetimeCount: 100,
        requestedMaxKeepAliveCount: 10,
        maxNotificationsPerPublish: 100,
        publishingEnabled: true,
        priority: 10
      });
      
      this.subscription.on("started", () => {
        console.log("[opcuaClient] Subscription started - ID:", this.subscription.subscriptionId);
      });
      this.subscription.on("terminated", () => {
        console.log("[opcuaClient] Subscription terminated");
      });
    }

    const itemsToCreate = [];
    const validTags = [];

    for (const tag of tags) {
      if (!tag.node_id) {
        console.warn(`[opcuaClient] Tag ${tag.tag_name} does not have node_id, skipped.`);
        continue;
      }

      if (this.monitoredItems.has(tag.id)) continue; // Already monitored

      itemsToCreate.push({
        nodeId: tag.node_id,
        attributeId: AttributeIds.Value
      });
      validTags.push(tag);
    }

    if (itemsToCreate.length === 0) return;

    try {
      for (const tag of validTags) {
        const item = await ClientMonitoredItem.create(
          this.subscription,
          { nodeId: tag.node_id, attributeId: AttributeIds.Value },
          { samplingInterval: 200, discardOldest: true, queueSize: 1 },
          TimestampsToReturn.Neither
        );

        item.on("err", (errMessage) => {
          console.error(`[opcuaClient] Tag ${tag.tag_name} (${tag.node_id}) error: ${errMessage}`);
        });

        // node-opcua will fire 'changed' immediately upon successful creation with the current value
        item.on("changed", (dataValue) => {
          if (dataValue.statusCode && dataValue.statusCode.name !== "Good") {
             console.warn(`[opcuaClient] Tag ${tag.tag_name} value has bad status: ${dataValue.statusCode.name}`);
             return;
          }
          if (dataValue.value) {
            let val = dataValue.value.value;
            onChange(tag.id, val);
          }
        });

        // Also check if the creation itself returned a bad status code
        if (item.statusCode && item.statusCode.name !== "Good") {
           console.error(`[opcuaClient] Failed to monitor tag ${tag.tag_name} (${tag.node_id}), Status: ${item.statusCode.name}`);
        } else {
           this.monitoredItems.set(tag.id, item);
        }
      }
      
      console.log(`[opcuaClient] Subscribed to ${validTags.length} tags.`);
    } catch (err) {
      console.error("[opcuaClient] Failed to create monitored items:", err.message);
    }
  }

  async writeTag(tag, value) {
    if (!this.session || !tag.node_id) throw new Error("Not connected or missing node_id");
    
    // Construct variant based on tag.data_type
    const { DataType } = await import("node-opcua-client");
    let dataType;
    if (tag.data_type === "BOOL") dataType = DataType.Boolean;
    else if (tag.data_type === "INT") dataType = DataType.Int16;
    else if (tag.data_type === "DINT") dataType = DataType.Int32;
    else if (tag.data_type === "REAL") dataType = DataType.Float;
    else dataType = DataType.String;

    const nodesToWrite = [{
      nodeId: tag.node_id,
      attributeId: AttributeIds.Value,
      value: {
        value: {
          dataType: dataType,
          value: value
        }
      }
    }];

    const statusCodes = await this.session.write(nodesToWrite);
    if (statusCodes[0].name !== 'Good') {
      throw new Error(`Write failed with status ${statusCodes[0].name}`);
    }
  }

  /**
   * Browse a node in the OPC UA server
   * @param {string} nodeId - The Node ID to browse (e.g. "RootFolder" or "ns=3;s=DataBlocksGlobal")
   * @returns {Promise<Array>} List of references/children
   */
  async browseNode(nodeId = "RootFolder") {
    if (!this.session) throw new Error("Not connected to OPC UA server");
    try {
      const browseResult = await this.session.browse(nodeId);
      
      return browseResult.references.map((ref) => {
        let nClass = "Unknown";
        let val = ref.nodeClass;
        if (typeof val === 'object' && val !== null) {
          val = val.value; // Get numeric value if it's an enum object
        } else if (typeof val === 'string') {
          val = parseInt(val, 10);
        }
        
        if (val === 1) nClass = "Object";
        else if (val === 2) nClass = "Variable";
        else if (val === 4) nClass = "Method";
        else if (val === 8) nClass = "ObjectType";
        else if (val === 16) nClass = "VariableType";
        else if (val === 32) nClass = "ReferenceType";
        else if (val === 64) nClass = "DataType";
        else if (val === 128) nClass = "View";
        else if (ref.nodeClass && typeof ref.nodeClass.toString === 'function') {
           nClass = ref.nodeClass.toString();
        }
        
        // Sometimes folders are Objects, so we just treat them the same in frontend
        return {
          nodeId: ref.nodeId.toString(),
          browseName: ref.browseName.name || "Unknown",
          displayName: ref.displayName ? ref.displayName.text : "",
          nodeClass: nClass
        };
      });
    } catch (err) {
      console.error(`[opcuaClient] Error browsing node ${nodeId}:`, err.message);
      throw err;
    }
  }
}
