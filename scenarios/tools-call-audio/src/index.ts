import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";
import { toneWav } from "@repo/mcp-fixture/media";

const AudioContentTool = new McpSchema.Tool({
  name: "test_audio_content",
  description: "Returns test audio.",
  inputSchema: { type: "object" },
});

const audioContentHandler = () =>
  Effect.succeed(
    new McpSchema.CallToolResult({
      content: [
        {
          type: "audio",
          data: toneWav,
          mimeType: "audio/wav",
        },
      ],
    }),
  );

const AudioContentRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: AudioContentTool,
      annotations: Context.empty(),
      handle: audioContentHandler,
    }),
  ),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: tools-call-audio",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = AudioContentRegistration.pipe(
  Layer.provideMerge(McpHttpLive),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
