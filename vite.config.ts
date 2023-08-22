import { defineConfig } from "vite";
import { dependencies } from "./package.json";

const vendor = ["react"];

function renderChunks(deps: Record<string, string>) {
  return Object.keys(dependencies).reduce((chunks, key) => {
    if (!vendor.includes(key)) {
      if (key.startsWith("@nivo")) {
        chunks["@nivo"] = chunks["@nivo"] ? [...chunks["@nivo"], key] : [key];
      } else {
        chunks[key] = [key];
      }
    }
    return chunks;
  }, {});
}

export default defineConfig({
  server: {
    port: 1234,
  },
  build: {
    outDir: "build",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor,
          ...renderChunks(dependencies),
        },
      },
    },
  },
  resolve: {
    preserveSymlinks: true,
  },
});
