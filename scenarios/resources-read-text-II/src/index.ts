import { Effect, Layer } from "effect";
import { McpServer } from "effect/ai";
import { runHttpScenario, server } from "@repo/mcp-fixture";

const TextResourceRegistration = Layer.effectDiscard(
  McpServer.registerResource({
    uri: "test://static-text",
    name: "static-text",
    description: "A static text resource.",
    mimeType: "text/plain",
    content: Effect.succeed("This is the content of the static text resource."),
  }),
);

const ScenarioLive = TextResourceRegistration.pipe(
  Layer.provideMerge(server("resources-read-text-II")),
);

runHttpScenario(ScenarioLive);
