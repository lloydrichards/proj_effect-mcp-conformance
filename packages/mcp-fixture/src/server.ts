import { Config, Effect, Layer } from "effect";
import { McpProtocol, McpServer } from "effect/unstable/ai";

export const supportedProtocolVersions = ["2025-06-18", "2025-11-25"] as const;

export type ProtocolVersion = (typeof supportedProtocolVersions)[number];

const defaultProtocolVersions = ["2025-11-25", "2025-06-18"];

const protocolFor = (version: string): McpProtocol.ProtocolAdapter => {
  switch (version) {
    case "2025-06-18":
      return McpProtocol.v2025_06_18;
    case "2025-11-25":
      return McpProtocol.v2025_11_25;
    default:
      throw new Error(
        `Unsupported MCP protocol ${JSON.stringify(version)}. ` +
          `Choose one of: ${supportedProtocolVersions.join(", ")}.`,
      );
  }
};

const configuredProtocols = (value: string) => {
  const [first, ...rest] = value
    .split(",")
    .map((version) => version.trim())
    .filter((version) => version.length > 0);

  if (first === undefined) {
    throw new Error("MCP_PROTOCOLS must declare at least one MCP protocol.");
  }

  return [protocolFor(first), ...rest.map(protocolFor)] as const;
};

export const McpServerConfig = Config.all({
  port: Config.number("MCP_PORT").pipe(Config.withDefault(9009)),
  hostname: Config.string("MCP_HOST").pipe(Config.withDefault("0.0.0.0")),
  allowedOrigins: Config.string("MCP_ALLOWED_ORIGINS").pipe(
    Config.withDefault("http://localhost:3000"),
  ),
  protocols: Config.string("MCP_PROTOCOLS").pipe(
    Config.withDefault(defaultProtocolVersions.join(",")),
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
      protocols: configuredProtocols(config.protocols),
      allowedOrigins: config.allowedOrigins
        .split(",")
        .map((origin) => origin.trim()),
    }),
  ).pipe(Layer.unwrap);
