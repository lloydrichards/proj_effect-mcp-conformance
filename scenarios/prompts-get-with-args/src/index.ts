import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";
const scenario = McpServer.prompt({
  name: "test_prompt_with_arguments",
  description: "A prompt with required arguments.",
  parameters: { arg1: Schema.String, arg2: Schema.String },
  content: ({ arg1, arg2 }) =>
    Effect.succeed(`Prompt with arguments: arg1='${arg1}', arg2='${arg2}'`),
}).pipe(Layer.provideMerge(server("prompts-get-with-args")));
const program = scenario.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);
BunRuntime.runMain(program);
