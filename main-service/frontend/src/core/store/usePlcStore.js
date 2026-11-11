import { create } from "zustand";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "";

const usePlcStore = create((set, get) => ({
  tags: {},
  socket: null,
  isConnected: false,
  reconnectAttempts: 0,

  initSocket: () => {
    if (get().socket) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
    });

    socket.on("connect", () => {
      set({ isConnected: true, reconnectAttempts: 0 });
      console.log("✅ Connected to PLC WebSocket");
    });

    socket.on("disconnect", (reason) => {
      set({ isConnected: false });
      console.warn(`⚠️ WebSocket disconnected: ${reason}`);
    });

    socket.on("reconnect_attempt", (attempt) => {
      set({ reconnectAttempts: attempt });
      console.log(`🔄 Reconnecting... attempt ${attempt}`);
    });

    socket.on("reconnect", () => {
      console.log("✅ WebSocket reconnected successfully");
      set({ reconnectAttempts: 0 });
    });

    // ⚡ Backend sends batched PLC data as 'plc:batch'
    // Format: { deviceId, timestamp, tags: [{ id, tag, value }, ...] }
    socket.on("plc:batch", (data) => {
      if (!data?.tags || !Array.isArray(data.tags)) return;
      set((state) => {
        const updated = { ...state.tags };
        for (const item of data.tags) {
          updated[item.tag] = {
            value: item.value,
            status: item.value == 1 || item.value === true ? "RUN" : "STOP",
            timestamp: data.timestamp || Date.now(),
          };
        }
        return { tags: updated };
      });
    });

    // Also support single-tag updates if needed in the future
    socket.on("plc:update", (data) => {
      set((state) => ({
        tags: {
          ...state.tags,
          [data.tag]: {
            value: data.value,
            status: data.status,
            timestamp: data.timestamp,
          },
        },
      }));
    });

    set({ socket });
  },

  getTag: (tagName) => {
    return get().tags[tagName] || { value: 0, status: "STOP", timestamp: null };
  },

  sendCommand: (tagId, value, tagName, stationSlug) => {
    const socket = get().socket;
    console.log(`[usePlcStore] sendCommand called! tagId: ${tagId}, value: ${value}, tagName: ${tagName}, stationSlug: ${stationSlug}`);
    console.log(`[usePlcStore] socket exists: ${!!socket}, isConnected: ${get().isConnected}, socket.connected: ${socket ? socket.connected : false}`);
    if (socket && (get().isConnected || socket.connected)) {
      socket.emit("plc:write", { tagId, value, tagName, stationSlug });
      return true;
    }
    return false;
  },

  reconnect: () => {
    const socket = get().socket;
    if (socket && !get().isConnected) {
      socket.connect();
    }
  },
}));

export default usePlcStore;
