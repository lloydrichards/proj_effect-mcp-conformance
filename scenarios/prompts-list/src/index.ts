import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const ListedPrompt = McpServer.prompt({
  name: "test-listed-prompt",
  description: "A prompt used to verify prompt discovery.",
  content: () => Effect.succeed("Listed prompt."),
});

const ScenarioLive = ListedPrompt.pipe(
  Layer.provideMerge(server("prompts-list")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
