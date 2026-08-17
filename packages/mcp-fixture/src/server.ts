import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Config, Effect, Layer } from "effect";
import { McpProtocol, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";

const McpServerConfig = Config.all({
  port: Config.number("MCP_PORT").pipe(Config.withDefault(9009)),
  hostname: Config.string("MCP_HOST").pipe(Config.withDefault("0.0.0.0")),
  allowedOrigins: Config.string("MCP_ALLOWED_ORIGINS").pipe(
    Config.withDefault("http://localhost:3000"),
  ),
});

export const runScenarioServer = (name: string) => {
  const server = Effect.gen(function* () {
    const config = yield* McpServerConfig;
    const allowedOrigins = config.allowedOrigins
      .split(",")
      .map((origin) => origin.trim());

    yield* Effect.logInfo(`Starting MCP conformance scenario ${name} at /mcp`);

    return McpServer.layerHttp({
      name: `Effect MCP fixture: ${name}`,
      version: "0.1.0",
      path: "/mcp",
      protocols: [McpProtocol.v2025_06_18],
      allowedOrigins,
    }).pipe(
      Layer.provideMerge(Layer.empty),
      HttpRouter.serve,
      HttpServer.withLogAddress,
      Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
    );
  }).pipe(Layer.unwrap, Layer.launch, Effect.satisfiesServicesType<never>());

  BunRuntime.runMain(server);
};
