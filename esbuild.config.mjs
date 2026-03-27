import esbuild from "esbuild";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const prod = process.argv[2] === "production";

const extensions = [".tsx", ".ts", ".jsx", ".js"];

// Resolve @/* path alias to src/*, trying common extensions
const aliasPlugin = {
  name: "alias",
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => {
      const base = path.resolve("src", args.path.slice(2));
      // If the path already has an extension that exists, use it
      if (fs.existsSync(base)) return { path: base };
      // Try appending extensions
      for (const ext of extensions) {
        const full = base + ext;
        if (fs.existsSync(full)) return { path: full };
      }
      return { path: base };
    });
  },
};

// Build Tailwind CSS
console.log("Building Tailwind CSS...");
execSync(
  `npx @tailwindcss/cli -i ./src/styles.css -o ./styles.css${prod ? " --minify" : ""}`,
  { stdio: "inherit" }
);

// Bundle JS/TS with esbuild
await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  minify: prod,
  jsx: "automatic",
  outfile: "main.js",
  plugins: [aliasPlugin],
});
