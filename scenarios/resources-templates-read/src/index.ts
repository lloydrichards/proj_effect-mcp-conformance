import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

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

const ScenarioLive = DocumentTemplate.pipe(
  Layer.provideMerge(server("resources-templates-read")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
