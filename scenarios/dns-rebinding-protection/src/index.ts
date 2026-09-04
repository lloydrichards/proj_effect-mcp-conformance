import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpProtocol, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig } from "@repo/mcp-fixture";

const DnsRebindingProtectedServer = Effect.map(McpServerConfig, (config) =>
  McpServer.layerHttp({
    name: "Effect MCP fixture: dns-rebinding-protection",
    version: "0.1.0",
    path: "/mcp",
    protocols: [McpProtocol.v2026_07_28, McpProtocol.v2025_11_25],
    allowedOrigins: [
      `http://localhost:${config.port}`,
      `http://127.0.0.1:${config.port}`,
      `http://[::1]:${config.port}`,
    ],
  }),
).pipe(Layer.unwrap);

const MainLive = DnsRebindingProtectedServer.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
