import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const ListRootsTool = new McpSchema.Tool({
  name: "test_input_required_result_list_roots",
  description: "Requests client roots through MRTR.",
  inputSchema: { type: "object" },
});

const handleListRoots = () =>
  McpSchema.McpRequestContext.useSync((context) =>
    context.inputResponses?.["client_roots"] === undefined
      ? new McpSchema.InputRequired({
          inputRequests: {
            client_roots: { method: "roots/list", params: {} },
          },
        })
      : new McpSchema.CallToolResult({
          content: [{ type: "text", text: "Client roots received." }],
        }),
  );

const ListRootsRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: ListRootsTool,
      annotations: Context.empty(),
      handle: handleListRoots,
    }),
  ),
);

const ScenarioLive = ListRootsRegistration.pipe(
  Layer.provideMerge(server("input-required-result-basic-list-roots")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
