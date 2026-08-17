import { Config, Effect, Layer } from "effect";
import { McpProtocol, McpServer } from "effect/unstable/ai";

export const McpServerConfig = Config.all({
  port: Config.number("MCP_PORT").pipe(Config.withDefault(9009)),
  hostname: Config.string("MCP_HOST").pipe(Config.withDefault("0.0.0.0")),
  allowedOrigins: Config.string("MCP_ALLOWED_ORIGINS").pipe(
    Config.withDefault("http://localhost:3000"),
  ),
});

/**
 * The transport and server metadata shared by every conformance fixture.
 *
 * A scenario owns the runtime and capability layers it provides to this
 * server. That keeps each executable fixture responsible for exactly the MCP
 * behavior its conformance scenario exercises.
 */
export const server = (name: string) =>
  Effect.map(McpServerConfig, (config) =>
    McpServer.layerHttp({
      name: `Effect MCP fixture: ${name}`,
      version: "0.1.0",
      path: "/mcp",
      protocols: [McpProtocol.v2025_11_25, McpProtocol.v2025_06_18],
      allowedOrigins: config.allowedOrigins
        .split(",")
        .map((origin) => origin.trim()),
    }),
  ).pipe(Layer.unwrap);
