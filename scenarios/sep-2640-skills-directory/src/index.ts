import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const SkillManifest = {
  uri: "skill://conformance/directory-fixture/SKILL.md",
  name: "directory-fixture",
  description: "A skill used to verify directory conformance.",
  mimeType: "text/markdown",
};

const manifestContent = `---
name: ${SkillManifest.name}
description: ${SkillManifest.description}
---

Follow the instructions in this fixture skill.
`;

const ManifestResource = McpServer.resource({
  ...SkillManifest,
  content: Effect.succeed(manifestContent),
});

const ReferencesDirectory = McpServer.resource({
  uri: "skill://conformance/directory-fixture/references",
  name: "references",
  mimeType: "inode/directory",
  content: Effect.succeed(""),
});

const ReferenceResource = McpServer.resource({
  uri: "skill://conformance/directory-fixture/references/example.md",
  name: "example.md",
  mimeType: "text/markdown",
  content: Effect.succeed("A reference inside the skill's subdirectory."),
});

const DirectoryResources = Layer.mergeAll(
  ManifestResource,
  ReferencesDirectory,
  ReferenceResource,
);

// Declare directoryRead so missing resources/directory/read support fails
// the official checker instead of skipping its checks.
const ScenarioLive = DirectoryResources.pipe(
  Layer.provideMerge(
    server("sep-2640-skills-directory", {
      extensions: { "io.modelcontextprotocol/skills": { directoryRead: true } },
    }),
  ),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
