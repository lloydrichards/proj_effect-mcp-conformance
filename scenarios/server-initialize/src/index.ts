import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const program = server("server-initialize").pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);

BunRuntime.runMain(program);
