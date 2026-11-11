import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@core": fileURLToPath(new URL("./src/core", import.meta.url)),
      "@overview": fileURLToPath(new URL("./src/overview", import.meta.url)),
      "@pages": fileURLToPath(new URL("./src/core/pages", import.meta.url)),
      "@stations/security": fileURLToPath(
        new URL("../../stations/security/frontend", import.meta.url),
      ),
      "@stations/weighbridge": fileURLToPath(
        new URL("../../stations/weighbridge/frontend/src", import.meta.url),
      ),
      "@stations/grading-ramp": fileURLToPath(
        new URL("../../stations/grading-ramp/frontend", import.meta.url),
      ),
      "@stations/loading-ramp": fileURLToPath(
        new URL("../../stations/loading-ramp/frontend", import.meta.url),
      ),
      "@stations/sterilizer-station": fileURLToPath(
        new URL("../../stations/sterilizer/frontend", import.meta.url),
      ),
      "@stations/threshing-station": fileURLToPath(
        new URL("../../stations/threshing/frontend", import.meta.url),
      ),
      "@stations/efb-plant": fileURLToPath(
        new URL("../../stations/efb-plant/frontend/src", import.meta.url),
      ),
      "@stations/press-station": fileURLToPath(
        new URL("../../stations/press/frontend", import.meta.url),
      ),
      "@stations/kernel-plant": fileURLToPath(
        new URL("../../stations/kernel-plant/frontend", import.meta.url),
      ),
      "@stations/oil-clarification": fileURLToPath(
        new URL(
          "../../stations/oil-clarification/frontend/src",
          import.meta.url,
        ),
      ),
      "@stations/boiler-house": fileURLToPath(
        new URL("../../stations/boiler-house/frontend/src", import.meta.url),
      ),
      "@stations/engine-room": fileURLToPath(
        new URL("../../stations/engine-room/frontend/src", import.meta.url),
      ),
      "@stations/raw-water": fileURLToPath(
        new URL(
          "../../stations/raw-water-treatment/frontend/src",
          import.meta.url,
        ),
      ),
      "@stations/daf-osr": fileURLToPath(
        new URL("../../stations/daf-osr/frontend/src", import.meta.url),
      ),
      "@stations/cmrs": fileURLToPath(
        new URL("../../stations/cmrs/frontend/src", import.meta.url),
      ),
      "@stations/effluent-treatment": fileURLToPath(
        new URL(
          "../../stations/effluent-treatment/frontend/src",
          import.meta.url,
        ),
      ),
      "@stations": fileURLToPath(new URL("./src/stations", import.meta.url)),
      "@reports": fileURLToPath(
        new URL("./src/reports-logsheet", import.meta.url),
      ),
      "@alarm": fileURLToPath(
        new URL("../../alarm/frontend/src", import.meta.url),
      ),
      "@maintenance": fileURLToPath(
        new URL("../../maintenance/frontend/src", import.meta.url),
      ),
      "@setting": fileURLToPath(new URL("./src/setting", import.meta.url)),
      "@contact": fileURLToPath(
        new URL("../../contacts/frontend/src", import.meta.url),
      ),
      "@home": fileURLToPath(new URL("./src/home", import.meta.url)),
      react: fileURLToPath(new URL("./node_modules/react", import.meta.url)),
      "react-dom": fileURLToPath(
        new URL("./node_modules/react-dom", import.meta.url),
      ),
      "react-icons": fileURLToPath(
        new URL("./node_modules/react-icons", import.meta.url),
      ),
      "qrcode.react": fileURLToPath(
        new URL("./node_modules/qrcode.react", import.meta.url),
      ),
      "html-to-image": fileURLToPath(
        new URL("./node_modules/html-to-image", import.meta.url),
      ),
      "xlsx": fileURLToPath(
        new URL("./node_modules/xlsx", import.meta.url),
      ),
      "xlsx-js-style": fileURLToPath(
        new URL("./node_modules/xlsx-js-style", import.meta.url),
      ),
      "leaflet": fileURLToPath(
        new URL("./node_modules/leaflet", import.meta.url),
      ),
      "react-leaflet": fileURLToPath(
        new URL("./node_modules/react-leaflet", import.meta.url),
      ),
      "leaflet-rotate": fileURLToPath(
        new URL("./node_modules/leaflet-rotate", import.meta.url),
      ),
      "socket.io-client": fileURLToPath(
        new URL("./node_modules/socket.io-client/build/esm/index.js", import.meta.url),
      ),
    },
  },
  assetsInclude: ["**/*.glb", "**/*.gltf"],
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    fs: {
      allow: ["../.."],
    },
    port: 5173,
    proxy: {
      "/auth": "http://localhost:3009",
      "/api/admin": "http://localhost:3009",
      "/api/activity": "http://localhost:3009",
      "/api/config": "http://localhost:3009",
      "/socket.io": { target: "http://localhost:3002", ws: true },
      "/api/station": "http://localhost:3003",
      "/api/settings": "http://localhost:3003",
      "/api/logsheet": "http://localhost:3003",
      "/api/maintenance": "http://localhost:3200",
      "/api/logsheet-form": "http://localhost:3005",
      "/api/grading": "http://localhost:3006",
      "/api/reports": "http://localhost:3007",
      "/api/security": "http://localhost:3101",
      "/api/weighbridge": "http://localhost:3102",
      "/api/grading-ramp": "http://localhost:3103",
      "/api/loading-ramp": "http://localhost:3104",
      "/api/sterilizer": "http://localhost:3105",
      "/api/threshing": "http://localhost:3106",
      "/api/efb-plant": "http://localhost:3107",
      "/api/press": "http://localhost:3108",
      "/api/kernel-plant": "http://localhost:3109",
      "/api/oil-clarification": "http://localhost:3110",
      "/api/boiler-house": "http://localhost:3111",
      "/api/engine-room": "http://localhost:3112",
      "/api/raw-water-treatment": "http://localhost:3113",
      "/api/daf-osr": "http://localhost:3114",
      "/api/cmrs": "http://localhost:3115",
      "/api/effluent-treatment": "http://localhost:3116",
      "/api/alarm": "http://localhost:3300",
      "/api/contacts": "http://localhost:3400",
      "/api/sterilizer-ai": "http://localhost:4105",
    },
  },
});
