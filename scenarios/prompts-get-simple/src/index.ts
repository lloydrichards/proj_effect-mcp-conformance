import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const SimplePrompt = McpServer.prompt({
  name: "test_simple_prompt",
  description: "A simple prompt.",
  content: () => Effect.succeed("This is a simple prompt for testing."),
});

const ScenarioLive = SimplePrompt.pipe(
  Layer.provideMerge(server("prompts-get-simple")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
