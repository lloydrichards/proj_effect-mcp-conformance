import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const scenario = McpServer.prompt({
  name: "test_prompt_with_arguments",
  description: "A prompt with completions.",
  parameters: { arg1: Schema.String },
  completion: { arg1: () => Effect.succeed(["test"]) },
  content: ({ arg1 }) => Effect.succeed(`Prompt argument: ${arg1}`),
}).pipe(Layer.provideMerge(server("completion-complete")));
const program = scenario.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);
BunRuntime.runMain(program);
