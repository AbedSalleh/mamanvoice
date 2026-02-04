import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { metaImagesPlugin } from "./vite-plugin-meta-images";
import tailwindcss from '@tailwindcss/vite';
import path from "path";
import { fileURLToPath } from "url";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        metaImagesPlugin(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["favicon.svg", "robots.txt"], // Add other assets if needed
            manifest: {
                name: "MamanVoice",
                short_name: "MamanVoice",
                description: "An offline-first AAC board for a child",
                theme_color: "#ffffff",
                background_color: "#ffffff",
                display: "standalone",
                orientation: "landscape",
                icons: [
                    {
                        src: "pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                ],
            },
            workbox: {
                // Generate a service worker that caches everything for offline use
                globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
                maximumFileSizeToCacheInBytes: 5000000, // Increase limit for larger assets if needed
            },
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "client", "src"),
            "@shared": path.resolve(__dirname, "shared"),
        },
    },
    root: path.resolve(__dirname, "client"),
    build: {
        outDir: path.resolve(__dirname, "dist/public"),
        emptyOutDir: true,
    },
    base: "/mamanvoice/",
});

