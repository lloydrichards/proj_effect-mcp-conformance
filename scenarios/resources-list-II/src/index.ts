import { Effect, Layer } from "effect";
import { McpServer } from "effect/ai";
import { runHttpScenario, server } from "@repo/mcp-fixture";

const ResourceRegistration = Layer.effectDiscard(
  Effect.gen(function* () {
    yield* McpServer.registerResource({
      uri: "test://listed-resource",
      name: "listed-resource",
      description: "A resource used to verify resource discovery.",
      mimeType: "text/plain",
      content: Effect.succeed("A listed resource."),
    });

    yield* McpServer.registerResource({
      uri: "test://static-text",
      name: "static-text",
      description: "A static text resource.",
      mimeType: "text/plain",
      content: Effect.succeed(
        "This is the content of the static text resource.",
      ),
    });
  }),
);

const ScenarioLive = ResourceRegistration.pipe(
  Layer.provideMerge(server("resources-list-II")),
);

runHttpScenario(ScenarioLive);
