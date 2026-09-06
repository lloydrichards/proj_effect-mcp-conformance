import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

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
          data: new Uint8Array([82, 73, 70, 70]),
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

const ScenarioLive = AudioContentRegistration.pipe(
  Layer.provideMerge(server("tools-call-audio")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
