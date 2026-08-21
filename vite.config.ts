import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(
    readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

// Practice Companion is a fully static single-page app. Every user record stays
// in the browser, so the service worker only has to precache the build output
// for the app to keep working offline.
export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(version),
    },
    build: {
        target: "es2022",
        sourcemap: false,
        assetsInlineLimit: 0,
    },
    plugins: [
        react(),
        VitePWA({
            registerType: "prompt",
            injectRegister: null,
            includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
            manifest: {
                id: "/",
                name: "Practice Companion",
                short_name: "Practice",
                description:
                    "Planeje, conduza e revise seus estudos de piano e teclado. Rotinas, cronômetro, metrônomo e histórico, tudo no seu dispositivo.",
                lang: "pt-BR",
                dir: "ltr",
                start_url: "/",
                scope: "/",
                display: "standalone",
                orientation: "any",
                background_color: "#f6f7f5",
                theme_color: "#1f4d3a",
                categories: ["education", "music", "productivity"],
                icons: [
                    {
                        src: "icons/icon-192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "icons/icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "icons/icon-maskable-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
                navigateFallback: "index.html",
                cleanupOutdatedCaches: true,
                clientsClaim: false,
                skipWaiting: false,
            },
        }),
    ],
});
