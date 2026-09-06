import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Bundle our TypeScript workspace packages (they ship .ts source only),
  // but load every other bare dependency from node_modules so CommonJS
  // packages (jsonwebtoken, safe-buffer, bcryptjs, ...) stay CJS-requireable.
  external: [/^[a-zA-Z@]/, /^\.prisma\//],
  noExternal: [/@ctf\/.*/],
});
