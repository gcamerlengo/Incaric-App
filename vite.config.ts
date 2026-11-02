import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" lets the same build run on Vercel (root) and any sub-path preview.
export default defineConfig({
  base: "./",
  plugins: [react()],

});
