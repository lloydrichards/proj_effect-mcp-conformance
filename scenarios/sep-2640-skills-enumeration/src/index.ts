import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const SkillManifest = {
  uri: "skill://conformance/enumeration-fixture/SKILL.md",
  name: "enumeration-fixture",
  description: "A skill used to verify enumeration conformance.",
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

// Declaring Skills commits the server to skills/list and skills/get.
// Leave missing Effect methods visible as official conformance failures.
const ScenarioLive = ManifestResource.pipe(
  Layer.provideMerge(
    server("sep-2640-skills-enumeration", {
      extensions: { "io.modelcontextprotocol/skills": {} },
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
