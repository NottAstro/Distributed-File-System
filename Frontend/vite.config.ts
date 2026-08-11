import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      port: 5173,
      strictPort: true, // Fail if 5173 is in use, to guarantee we use the authorized port
      proxy: {
        "/api": "http://localhost:3000",
      },
    },
  },
});
