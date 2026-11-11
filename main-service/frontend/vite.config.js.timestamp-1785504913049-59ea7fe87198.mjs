// vite.config.js
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "file:///D:/PT%20PREMIER/AgroVision%20Group/PT%20SKL/Program/agrovision-skl/main-service/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///D:/PT%20PREMIER/AgroVision%20Group/PT%20SKL/Program/agrovision-skl/main-service/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///D:/PT%20PREMIER/AgroVision%20Group/PT%20SKL/Program/agrovision-skl/main-service/frontend/vite.config.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@core": fileURLToPath(new URL("./src/core", __vite_injected_original_import_meta_url)),
      "@overview": fileURLToPath(new URL("./src/overview", __vite_injected_original_import_meta_url)),
      "@pages": fileURLToPath(new URL("./src/core/pages", __vite_injected_original_import_meta_url)),
      "@stations/security": fileURLToPath(
        new URL("../../stations/security/frontend", __vite_injected_original_import_meta_url)
      ),
      "@stations/weighbridge": fileURLToPath(
        new URL("../../stations/weighbridge/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@stations/grading-ramp": fileURLToPath(
        new URL("../../stations/grading-ramp/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@stations/loading-ramp": fileURLToPath(
        new URL("../../stations/loading-ramp/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@stations/sterilizer-station": fileURLToPath(
        new URL("../../stations/sterilizer/frontend", __vite_injected_original_import_meta_url)
      ),
      "@stations/threshing-station": fileURLToPath(
        new URL("../../stations/threshing/frontend", __vite_injected_original_import_meta_url)
      ),
      "@stations/efb-plant": fileURLToPath(
        new URL("../../stations/efb-plant/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@stations/press-station": fileURLToPath(
        new URL("../../stations/press/frontend", __vite_injected_original_import_meta_url)
      ),
      "@stations/kernel-plant": fileURLToPath(
        new URL("../../stations/kernel-plant/frontend", __vite_injected_original_import_meta_url)
      ),
      "@stations/oil-clarification": fileURLToPath(
        new URL(
          "../../stations/oil-clarification/frontend/src",
          __vite_injected_original_import_meta_url
        )
      ),
      "@stations/boiler-house": fileURLToPath(
        new URL("../../stations/boiler-house/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@stations/engine-room": fileURLToPath(
        new URL("../../stations/engine-room/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@stations/raw-water": fileURLToPath(
        new URL(
          "../../stations/raw-water-treatment/frontend/src",
          __vite_injected_original_import_meta_url
        )
      ),
      "@stations/daf-osr": fileURLToPath(
        new URL("../../stations/daf-osr/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@stations/cmrs": fileURLToPath(
        new URL("../../stations/cmrs/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@stations/effluent-treatment": fileURLToPath(
        new URL(
          "../../stations/effluent-treatment/frontend/src",
          __vite_injected_original_import_meta_url
        )
      ),
      "@stations": fileURLToPath(new URL("./src/stations", __vite_injected_original_import_meta_url)),
      "@reports": fileURLToPath(
        new URL("./src/reports-logsheet", __vite_injected_original_import_meta_url)
      ),
      "@alarm": fileURLToPath(
        new URL("../../alarm/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@maintenance": fileURLToPath(
        new URL("../../maintenance/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@setting": fileURLToPath(new URL("./src/setting", __vite_injected_original_import_meta_url)),
      "@contact": fileURLToPath(
        new URL("../../contacts/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@home": fileURLToPath(new URL("./src/home", __vite_injected_original_import_meta_url)),
      react: fileURLToPath(new URL("./node_modules/react", __vite_injected_original_import_meta_url)),
      "react-dom": fileURLToPath(
        new URL("./node_modules/react-dom", __vite_injected_original_import_meta_url)
      ),
      "react-icons": fileURLToPath(
        new URL("./node_modules/react-icons", __vite_injected_original_import_meta_url)
      ),
      "qrcode.react": fileURLToPath(
        new URL("./node_modules/qrcode.react", __vite_injected_original_import_meta_url)
      ),
      "html-to-image": fileURLToPath(
        new URL("./node_modules/html-to-image", __vite_injected_original_import_meta_url)
      ),
      "xlsx": fileURLToPath(
        new URL("./node_modules/xlsx", __vite_injected_original_import_meta_url)
      ),
      "xlsx-js-style": fileURLToPath(
        new URL("./node_modules/xlsx-js-style", __vite_injected_original_import_meta_url)
      ),
      "leaflet": fileURLToPath(
        new URL("./node_modules/leaflet", __vite_injected_original_import_meta_url)
      ),
      "react-leaflet": fileURLToPath(
        new URL("./node_modules/react-leaflet", __vite_injected_original_import_meta_url)
      ),
      "leaflet-rotate": fileURLToPath(
        new URL("./node_modules/leaflet-rotate", __vite_injected_original_import_meta_url)
      )
    }
  },
  assetsInclude: ["**/*.glb", "**/*.gltf"],
  server: {
    host: "0.0.0.0",
    fs: {
      allow: ["../.."]
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
      "/api/contacts": "http://localhost:3400"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxQVCBQUkVNSUVSXFxcXE1ld2FoIEdyb3VwXFxcXFBUIFNLTFxcXFxQcm9ncmFtXFxcXG1ld2FoLXNrbFxcXFxtYWluLXNlcnZpY2VcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXFBUIFBSRU1JRVJcXFxcTWV3YWggR3JvdXBcXFxcUFQgU0tMXFxcXFByb2dyYW1cXFxcbWV3YWgtc2tsXFxcXG1haW4tc2VydmljZVxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovUFQlMjBQUkVNSUVSL01ld2FoJTIwR3JvdXAvUFQlMjBTS0wvUHJvZ3JhbS9tZXdhaC1za2wvbWFpbi1zZXJ2aWNlL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZmlsZVVSTFRvUGF0aCwgVVJMIH0gZnJvbSBcIm5vZGU6dXJsXCI7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAY29yZVwiOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoXCIuL3NyYy9jb3JlXCIsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgICAgXCJAb3ZlcnZpZXdcIjogZmlsZVVSTFRvUGF0aChuZXcgVVJMKFwiLi9zcmMvb3ZlcnZpZXdcIiwgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgICBcIkBwYWdlc1wiOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoXCIuL3NyYy9jb3JlL3BhZ2VzXCIsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgICAgXCJAc3RhdGlvbnMvc2VjdXJpdHlcIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcIi4uLy4uL3N0YXRpb25zL3NlY3VyaXR5L2Zyb250ZW5kXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJAc3RhdGlvbnMvd2VpZ2hicmlkZ2VcIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcIi4uLy4uL3N0YXRpb25zL3dlaWdoYnJpZGdlL2Zyb250ZW5kL3NyY1wiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwiQHN0YXRpb25zL2dyYWRpbmctcmFtcFwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvZ3JhZGluZy1yYW1wL2Zyb250ZW5kL3NyY1wiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwiQHN0YXRpb25zL2xvYWRpbmctcmFtcFwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvbG9hZGluZy1yYW1wL2Zyb250ZW5kL3NyY1wiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwiQHN0YXRpb25zL3N0ZXJpbGl6ZXItc3RhdGlvblwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvc3RlcmlsaXplci9mcm9udGVuZFwiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwiQHN0YXRpb25zL3RocmVzaGluZy1zdGF0aW9uXCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9zdGF0aW9ucy90aHJlc2hpbmcvZnJvbnRlbmRcIiwgaW1wb3J0Lm1ldGEudXJsKSxcbiAgICAgICksXG4gICAgICBcIkBzdGF0aW9ucy9lZmItcGxhbnRcIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcIi4uLy4uL3N0YXRpb25zL2VmYi1wbGFudC9mcm9udGVuZC9zcmNcIiwgaW1wb3J0Lm1ldGEudXJsKSxcbiAgICAgICksXG4gICAgICBcIkBzdGF0aW9ucy9wcmVzcy1zdGF0aW9uXCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9zdGF0aW9ucy9wcmVzcy9mcm9udGVuZFwiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwiQHN0YXRpb25zL2tlcm5lbC1wbGFudFwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMva2VybmVsLXBsYW50L2Zyb250ZW5kXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJAc3RhdGlvbnMvb2lsLWNsYXJpZmljYXRpb25cIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcbiAgICAgICAgICBcIi4uLy4uL3N0YXRpb25zL29pbC1jbGFyaWZpY2F0aW9uL2Zyb250ZW5kL3NyY1wiLFxuICAgICAgICAgIGltcG9ydC5tZXRhLnVybCxcbiAgICAgICAgKSxcbiAgICAgICksXG4gICAgICBcIkBzdGF0aW9ucy9ib2lsZXItaG91c2VcIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcIi4uLy4uL3N0YXRpb25zL2JvaWxlci1ob3VzZS9mcm9udGVuZC9zcmNcIiwgaW1wb3J0Lm1ldGEudXJsKSxcbiAgICAgICksXG4gICAgICBcIkBzdGF0aW9ucy9lbmdpbmUtcm9vbVwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvZW5naW5lLXJvb20vZnJvbnRlbmQvc3JjXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJAc3RhdGlvbnMvcmF3LXdhdGVyXCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXG4gICAgICAgICAgXCIuLi8uLi9zdGF0aW9ucy9yYXctd2F0ZXItdHJlYXRtZW50L2Zyb250ZW5kL3NyY1wiLFxuICAgICAgICAgIGltcG9ydC5tZXRhLnVybCxcbiAgICAgICAgKSxcbiAgICAgICksXG4gICAgICBcIkBzdGF0aW9ucy9kYWYtb3NyXCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9zdGF0aW9ucy9kYWYtb3NyL2Zyb250ZW5kL3NyY1wiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwiQHN0YXRpb25zL2NtcnNcIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcIi4uLy4uL3N0YXRpb25zL2NtcnMvZnJvbnRlbmQvc3JjXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJAc3RhdGlvbnMvZWZmbHVlbnQtdHJlYXRtZW50XCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXG4gICAgICAgICAgXCIuLi8uLi9zdGF0aW9ucy9lZmZsdWVudC10cmVhdG1lbnQvZnJvbnRlbmQvc3JjXCIsXG4gICAgICAgICAgaW1wb3J0Lm1ldGEudXJsLFxuICAgICAgICApLFxuICAgICAgKSxcbiAgICAgIFwiQHN0YXRpb25zXCI6IGZpbGVVUkxUb1BhdGgobmV3IFVSTChcIi4vc3JjL3N0YXRpb25zXCIsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgICAgXCJAcmVwb3J0c1wiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi9zcmMvcmVwb3J0cy1sb2dzaGVldFwiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwiQGFsYXJtXCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9hbGFybS9mcm9udGVuZC9zcmNcIiwgaW1wb3J0Lm1ldGEudXJsKSxcbiAgICAgICksXG4gICAgICBcIkBtYWludGVuYW5jZVwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vbWFpbnRlbmFuY2UvZnJvbnRlbmQvc3JjXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJAc2V0dGluZ1wiOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoXCIuL3NyYy9zZXR0aW5nXCIsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgICAgXCJAY29udGFjdFwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vY29udGFjdHMvZnJvbnRlbmQvc3JjXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJAaG9tZVwiOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoXCIuL3NyYy9ob21lXCIsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgICAgcmVhY3Q6IGZpbGVVUkxUb1BhdGgobmV3IFVSTChcIi4vbm9kZV9tb2R1bGVzL3JlYWN0XCIsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgICAgXCJyZWFjdC1kb21cIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcIi4vbm9kZV9tb2R1bGVzL3JlYWN0LWRvbVwiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwicmVhY3QtaWNvbnNcIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcIi4vbm9kZV9tb2R1bGVzL3JlYWN0LWljb25zXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJxcmNvZGUucmVhY3RcIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcIi4vbm9kZV9tb2R1bGVzL3FyY29kZS5yZWFjdFwiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwiaHRtbC10by1pbWFnZVwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi9ub2RlX21vZHVsZXMvaHRtbC10by1pbWFnZVwiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwieGxzeFwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi9ub2RlX21vZHVsZXMveGxzeFwiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwieGxzeC1qcy1zdHlsZVwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi9ub2RlX21vZHVsZXMveGxzeC1qcy1zdHlsZVwiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwibGVhZmxldFwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi9ub2RlX21vZHVsZXMvbGVhZmxldFwiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwicmVhY3QtbGVhZmxldFwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi9ub2RlX21vZHVsZXMvcmVhY3QtbGVhZmxldFwiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwibGVhZmxldC1yb3RhdGVcIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcIi4vbm9kZV9tb2R1bGVzL2xlYWZsZXQtcm90YXRlXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgIH0sXG4gIH0sXG4gIGFzc2V0c0luY2x1ZGU6IFtcIioqLyouZ2xiXCIsIFwiKiovKi5nbHRmXCJdLFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiAnMC4wLjAuMCcsXG4gICAgZnM6IHtcbiAgICAgIGFsbG93OiBbXCIuLi8uLlwiXSxcbiAgICB9LFxuICAgIHBvcnQ6IDUxNzMsXG4gICAgcHJveHk6IHtcbiAgICAgIFwiL2F1dGhcIjogXCJodHRwOi8vbG9jYWxob3N0OjMwMDlcIixcbiAgICAgIFwiL2FwaS9hZG1pblwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwOVwiLFxuICAgICAgXCIvYXBpL2FjdGl2aXR5XCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMDA5XCIsXG4gICAgICBcIi9hcGkvY29uZmlnXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMDA5XCIsXG4gICAgICBcIi9zb2NrZXQuaW9cIjogeyB0YXJnZXQ6IFwiaHR0cDovL2xvY2FsaG9zdDozMDAyXCIsIHdzOiB0cnVlIH0sXG4gICAgICBcIi9hcGkvc3RhdGlvblwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwM1wiLFxuICAgICAgXCIvYXBpL3NldHRpbmdzXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMDAzXCIsXG4gICAgICBcIi9hcGkvbG9nc2hlZXRcIjogXCJodHRwOi8vbG9jYWxob3N0OjMwMDNcIixcbiAgICAgIFwiL2FwaS9tYWludGVuYW5jZVwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzIwMFwiLFxuICAgICAgXCIvYXBpL2xvZ3NoZWV0LWZvcm1cIjogXCJodHRwOi8vbG9jYWxob3N0OjMwMDVcIixcbiAgICAgIFwiL2FwaS9ncmFkaW5nXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMDA2XCIsXG4gICAgICBcIi9hcGkvcmVwb3J0c1wiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwN1wiLFxuICAgICAgXCIvYXBpL3NlY3VyaXR5XCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTAxXCIsXG4gICAgICBcIi9hcGkvd2VpZ2hicmlkZ2VcIjogXCJodHRwOi8vbG9jYWxob3N0OjMxMDJcIixcbiAgICAgIFwiL2FwaS9ncmFkaW5nLXJhbXBcIjogXCJodHRwOi8vbG9jYWxob3N0OjMxMDNcIixcbiAgICAgIFwiL2FwaS9sb2FkaW5nLXJhbXBcIjogXCJodHRwOi8vbG9jYWxob3N0OjMxMDRcIixcbiAgICAgIFwiL2FwaS9zdGVyaWxpemVyXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTA1XCIsXG4gICAgICBcIi9hcGkvdGhyZXNoaW5nXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTA2XCIsXG4gICAgICBcIi9hcGkvZWZiLXBsYW50XCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTA3XCIsXG4gICAgICBcIi9hcGkvcHJlc3NcIjogXCJodHRwOi8vbG9jYWxob3N0OjMxMDhcIixcbiAgICAgIFwiL2FwaS9rZXJuZWwtcGxhbnRcIjogXCJodHRwOi8vbG9jYWxob3N0OjMxMDlcIixcbiAgICAgIFwiL2FwaS9vaWwtY2xhcmlmaWNhdGlvblwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzExMFwiLFxuICAgICAgXCIvYXBpL2JvaWxlci1ob3VzZVwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzExMVwiLFxuICAgICAgXCIvYXBpL2VuZ2luZS1yb29tXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTEyXCIsXG4gICAgICBcIi9hcGkvcmF3LXdhdGVyLXRyZWF0bWVudFwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzExM1wiLFxuICAgICAgXCIvYXBpL2RhZi1vc3JcIjogXCJodHRwOi8vbG9jYWxob3N0OjMxMTRcIixcbiAgICAgIFwiL2FwaS9jbXJzXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTE1XCIsXG4gICAgICBcIi9hcGkvZWZmbHVlbnQtdHJlYXRtZW50XCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTE2XCIsXG4gICAgICBcIi9hcGkvYWxhcm1cIjogXCJodHRwOi8vbG9jYWxob3N0OjMzMDBcIixcbiAgICAgIFwiL2FwaS9jb250YWN0c1wiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzQwMFwiLFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBZ2EsU0FBUyxlQUFlLFdBQVc7QUFDbmMsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxXQUFXO0FBRnFQLElBQU0sMkNBQTJDO0FBSXhULElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxTQUFTLGNBQWMsSUFBSSxJQUFJLGNBQWMsd0NBQWUsQ0FBQztBQUFBLE1BQzdELGFBQWEsY0FBYyxJ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
