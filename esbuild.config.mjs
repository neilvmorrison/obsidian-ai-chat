import esbuild from 'esbuild';
import { copyFileSync } from 'fs';

const prod = process.argv[2] === 'production';

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*'],
  format: 'cjs',
  target: 'es2020',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  minify: prod,
  outfile: 'main.js',
});

copyFileSync('src/styles.css', 'styles.css');
