import { cpSync, existsSync } from "node:fs";

const assets = [
  ["public", ".next/standalone/public"],
  [".next/static", ".next/standalone/.next/static"],
];

for (const [source, destination] of assets) {
  if (existsSync(source)) {
    cpSync(source, destination, { recursive: true, force: true });
  }
}
