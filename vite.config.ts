import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" lets the same build run on Firebase Hosting (root) and GitHub Pages (/incaric-app/).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { chunkSizeWarningLimit: 700, rollupOptions: { output: { manualChunks: { firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/messaging"] } } } },
});
