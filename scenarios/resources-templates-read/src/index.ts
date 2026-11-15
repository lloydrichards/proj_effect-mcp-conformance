import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const DocumentTemplate =
  McpServer.resource`test://template/${McpSchema.param("id", Schema.String)}/data`(
    {
      name: "template-resource",
      description: "A resource template with an identifier.",
      mimeType: "application/json",
      content: (uri, id) =>
        Effect.succeed(
          McpSchema.ReadResourceResult.make({
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify({
                  id,
                  templateTest: true,
                  data: `Data for ID: ${id}`,
                }),
              },
            ],
          }),
        ),
    },
  );

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: resources-templates-read",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = DocumentTemplate.pipe(Layer.provideMerge(McpHttpLive));

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
