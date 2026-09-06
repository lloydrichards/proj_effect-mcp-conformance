import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { McpServerConfig, server } from "@repo/mcp-fixture";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";

const RawRegistryCapabilities = Layer.effectDiscard(
  McpServer.McpServer.use((registry) =>
    Effect.gen(function* () {
      yield* registry.addTool({
        tool: new McpSchema.Tool({
          name: "test_tool",
          description: "A minimal tool used to verify MCP tool discovery.",
          inputSchema: {
            type: "object",
            properties: { input: { type: "string" } },
          },
        }),
        annotations: Context.empty(),
        handle: () =>
          Effect.succeed(
            new McpSchema.CallToolResult({
              content: [{ type: "text", text: "tool discovery is working" }],
            }),
          ),
      });
      yield* registry.addTool({
        tool: new McpSchema.Tool({
          name: "test_simple_text",
          description: "Returns test text.",
          inputSchema: { type: "object" },
        }),
        annotations: Context.empty(),
        handle: () =>
          Effect.succeed(
            new McpSchema.CallToolResult({
              content: [
                {
                  type: "text",
                  text: "This is a simple text response for testing.",
                },
              ],
            }),
          ),
      });
      yield* registry.addPrompt({
        prompt: new McpSchema.Prompt({
          name: "test-listed-prompt",
          description: "A prompt used to verify prompt discovery.",
        }),
        annotations: Context.empty(),
        completions: {},
        handle: () =>
          Effect.succeed(
            McpSchema.GetPromptResult.make({
              messages: [
                {
                  role: "user",
                  content: { type: "text", text: "Listed prompt." },
                },
              ],
            }),
          ),
      });
      yield* registry.addPrompt({
        prompt: new McpSchema.Prompt({
          name: "test_simple_prompt",
          description: "A simple prompt.",
        }),
        annotations: Context.empty(),
        completions: {},
        handle: () =>
          Effect.succeed(
            McpSchema.GetPromptResult.make({
              messages: [
                {
                  role: "user",
                  content: {
                    type: "text",
                    text: "This is a simple prompt for testing.",
                  },
                },
              ],
            }),
          ),
      });
      yield* registry.addResource({
        resource: new McpSchema.Resource({
          uri: "test://listed-resource",
          name: "listed-resource",
          description: "A resource used to verify resource discovery.",
          mimeType: "text/plain",
        }),
        annotations: Context.empty(),
        handle: Effect.succeed(
          McpSchema.ReadResourceResult.make({
            contents: [
              {
                uri: "test://listed-resource",
                mimeType: "text/plain",
                text: "A listed resource.",
              },
            ],
          }),
        ),
      });
      yield* registry.addResource({
        resource: new McpSchema.Resource({
          uri: "test://static-text",
          name: "static-text",
          description: "A static text resource.",
          mimeType: "text/plain",
        }),
        annotations: Context.empty(),
        handle: Effect.succeed(
          McpSchema.ReadResourceResult.make({
            contents: [
              {
                uri: "test://static-text",
                mimeType: "text/plain",
                text: "This is the content of the static text resource.",
              },
            ],
          }),
        ),
      });
    }),
  ),
);

const ScenarioLive = RawRegistryCapabilities.pipe(
  Layer.provideMerge(server("raw-registry-http")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
