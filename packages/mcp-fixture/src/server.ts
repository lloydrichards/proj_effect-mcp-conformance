import { Config } from "effect";
import { McpProtocol } from "effect/ai";

export const supportedProtocolVersions = [
  "2024-11-05",
  "2025-03-26",
  "2025-06-18",
  "2025-11-25",
  "2026-07-28",
] as const;

export type ProtocolVersion = (typeof supportedProtocolVersions)[number];

const defaultProtocolVersions = supportedProtocolVersions;

const protocolFor = (version: string): McpProtocol.ProtocolAdapter => {
  switch (version) {
    case "2026-07-28":
      return McpProtocol.v2026_07_28;
    case "2025-11-25":
      return McpProtocol.v2025_11_25;
    case "2025-06-18":
      return McpProtocol.v2025_06_18;
    case "2025-03-26":
      return McpProtocol.v2025_03_26;
    case "2024-11-05":
      return McpProtocol.v2024_11_05;
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
  port: Config.Number("MCP_PORT").pipe(Config.withDefault(9009)),
  hostname: Config.String("MCP_HOST").pipe(Config.withDefault("0.0.0.0")),
});

export const McpProtocolConfig = Config.all({
  allowedOrigins: Config.String("MCP_ALLOWED_ORIGINS").pipe(
    Config.withDefault("http://localhost:3000"),
    Config.map((value) => value.split(",").map((origin) => origin.trim())),
  ),
  protocols: Config.String("MCP_PROTOCOLS").pipe(
    Config.withDefault(defaultProtocolVersions.join(",")),
    Config.map(configuredProtocols),
  ),
});
