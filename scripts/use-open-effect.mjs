import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repository = resolve(import.meta.dirname, "..");
const openEffect = resolve(
  repository,
  process.env.OPEN_EFFECT_DIR ?? "../open_effect",
);
const packDirectory = resolve(repository, ".cache/open-effect-pack");
const packageJsonPath = resolve(repository, "package.json");
const lockfilePath = resolve(repository, "bun.lock");

const run = (command, arguments_, cwd) => {
  const result = spawnSync(command, arguments_, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    throw new Error(`${command} ${arguments_.join(" ")} failed`);
  }
};

const packedPackage = (prefix) => {
  const filename = readdirSync(packDirectory).find(
    (entry) => entry.startsWith(prefix) && entry.endsWith(".tgz"),
  );
  if (filename === undefined) {
    throw new Error(`Missing packed package ${prefix}*.tgz`);
  }
  return resolve(packDirectory, filename);
};

mkdirSync(packDirectory, { recursive: true });
run("pnpm", ["install"], openEffect);
run(
  "pnpm",
  [
    "--filter",
    "effect",
    "--filter",
    "@effect/platform-node-shared",
    "--filter",
    "@effect/platform-bun",
    "run",
    "build",
  ],
  openEffect,
);

for (const packageDirectory of [
  "packages/effect",
  "packages/platform/node-shared",
  "packages/platform/bun",
]) {
  run(
    "pnpm",
    ["--dir", packageDirectory, "pack", "--pack-destination", packDirectory],
    openEffect,
  );
}

const packageJson = readFileSync(packageJsonPath, "utf8");
const lockfile = readFileSync(lockfilePath);

try {
  const manifest = JSON.parse(packageJson);
  manifest.overrides = {
    "@effect/platform-bun": `file:${packedPackage("effect-platform-bun-")}`,
    "@effect/platform-node-shared": `file:${packedPackage("effect-platform-node-shared-")}`,
    effect: `file:${packedPackage("effect-")}`,
  };
  writeFileSync(packageJsonPath, `${JSON.stringify(manifest, null, 2)}\n`);
  run("bun", ["install", "--force"], repository);
} finally {
  writeFileSync(packageJsonPath, packageJson);
  writeFileSync(lockfilePath, lockfile);
}

console.log(`Using locally packed Effect packages from ${openEffect}`);
