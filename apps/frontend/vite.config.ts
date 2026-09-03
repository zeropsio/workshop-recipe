import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { workshopEnvsPlugin } from "./workshop-envs-plugin";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "../..");

export default defineConfig({
  plugins: [react(), tailwindcss(), workshopEnvsPlugin(repoRoot)],
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    // The dev server is reached through the service's Zerops subdomain (frontenddev-<id>-5173.<region>.zerops.app). A leading dot
    // allows every subdomain, so this holds in any region and for any port suffix. Localhost is always allowed.
    allowedHosts: [".zerops.app"],
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [".zerops.app"],
  },
});
