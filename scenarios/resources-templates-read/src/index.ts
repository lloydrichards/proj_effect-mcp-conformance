import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const resource =
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

const scenario = resource.pipe(
  Layer.provideMerge(server("resources-templates-read")),
);

const program = scenario.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
  Layer.launch,
  Effect.satisfiesServicesType<never>(),
);

BunRuntime.runMain(program);
