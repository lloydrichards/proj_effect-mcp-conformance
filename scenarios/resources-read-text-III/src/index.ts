import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";
import { runHttpScenario, server } from "@repo/mcp-fixture";

const TextResource = new McpSchema.Resource({
  uri: "test://static-text",
  name: "static-text",
  description: "A static text resource.",
  mimeType: "text/plain",
});

const TextResourceRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((registry) =>
    registry.addResource({
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
    }),
  ),
);

const ScenarioLive = TextResourceRegistration.pipe(
  Layer.provideMerge(server("resources-read-text-III")),
);

runHttpScenario(ScenarioLive);
