import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const argumentValues = ["test", "test-report", "release"];

const PromptWithCompletions = McpServer.prompt({
  name: "test_prompt_with_arguments",
  description: "A prompt with completions.",
  parameters: { arg1: Schema.String },
  completion: {
    arg1: (prefix) =>
      Effect.succeed(
        argumentValues.filter((value) => value.startsWith(prefix)),
      ),
  },
  content: ({ arg1 }) => Effect.succeed(`Prompt argument: ${arg1}`),
});

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: completion-complete",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = PromptWithCompletions.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
