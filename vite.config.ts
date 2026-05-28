import { defineConfig } from "vite";

// base: "./" keeps asset paths relative so the static build can be hosted
// from any subdirectory (GitHub Pages, S3, a plain file server, etc.).
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    sourcemap: false,
  },
});
