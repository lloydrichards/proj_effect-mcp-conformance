import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const SkillManifest = {
  uri: "skill://conformance/enumeration-fixture/SKILL.md",
  name: "enumeration-fixture",
  description: "A skill used to verify enumeration conformance.",
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

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: sep-2640-skills-enumeration",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = FixtureSkill.pipe(Layer.provideMerge(McpHttpLive));

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
