import { runHttpScenario, server } from "@repo/mcp-fixture";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";

const ListedResource = new McpSchema.Resource({
  uri: "test://listed-resource",
  name: "listed-resource",
  description: "A resource used to verify resource discovery.",
  mimeType: "text/plain",
});

const TextResource = new McpSchema.Resource({
  uri: "test://static-text",
  name: "static-text",
  description: "A static text resource.",
  mimeType: "text/plain",
});

const ResourceRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((registry) =>
    Effect.gen(function* () {
      yield* registry.addResource({
        resource: ListedResource,
        annotations: Context.empty(),
        handle: Effect.succeed(
          McpSchema.ReadResourceResult.make({
            contents: [
              {
                uri: ListedResource.uri,
                mimeType: "text/plain",
                text: "A listed resource.",
              },
            ],
          }),
        ),
      });
      yield* registry.addResource({
        resource: TextResource,
        annotations: Context.empty(),
        handle: Effect.succeed(
          McpSchema.ReadResourceResult.make({
            contents: [
              {
                uri: TextResource.uri,
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

const ScenarioLive = ResourceRegistration.pipe(
  Layer.provideMerge(server("resources-list-III")),
);

runHttpScenario(ScenarioLive);
