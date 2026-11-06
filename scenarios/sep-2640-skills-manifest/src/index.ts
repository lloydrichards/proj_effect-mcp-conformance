import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const SkillManifest = {
  uri: "skill://conformance/manifest-fixture/SKILL.md",
  name: "manifest-fixture",
  description: "A skill used to verify manifest conformance.",
};

const manifestContent = `---
name: ${SkillManifest.name}
description: ${SkillManifest.description}
---

Follow the instructions in this fixture skill.
`;

const FixtureSkill = McpServer.skill({
  uri: SkillManifest.uri,
  files: {
    "SKILL.md": manifestContent,
  },
});

const ScenarioLive = FixtureSkill.pipe(
  Layer.provideMerge(server("sep-2640-skills-manifest")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
