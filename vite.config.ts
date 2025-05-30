import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from "vite-plugin-top-level-await";


export default defineConfig({
    publicDir: "./public",
    
    plugins: [
        react(), 
        wasm(),
        topLevelAwait()
    ],
    worker: {
        format: "iife",
        plugins: () => [
            topLevelAwait(),
            wasm()
        ],
        
    },
    server: {
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp"
        }
    },
    build: {
        target: "es2020",
        assetsDir: "assets"
    },
    esbuild: {
        /* Workaround until this issue is resolved: https://github.com/Menci/vite-plugin-top-level-await/issues/61 */
        target: "esnext"
    },
    optimizeDeps: {
        esbuildOptions: {
            target: "es2020"
        }
    }
})
