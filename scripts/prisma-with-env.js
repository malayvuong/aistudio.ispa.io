const { loadEnvConfig } = require("@next/env");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

loadEnvConfig(process.cwd());

const prismaBin =
  process.platform === "win32"
    ? path.resolve(__dirname, "../node_modules/.bin/prisma.cmd")
    : path.resolve(__dirname, "../node_modules/.bin/prisma");
const args = process.argv.slice(2);

const result = spawnSync(prismaBin, args, {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
