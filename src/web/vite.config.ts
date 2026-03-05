import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
    plugins: [react()],
    root: resolve(__dirname),
    server: {
        port: 5173,
        proxy: {
            "/api": "http://localhost:3001",
            "/health": "http://localhost:3001",
        },
    },
    build: {
        outDir: resolve(__dirname, "../../dist/web"),
        emptyOutDir: true,
    },
});
