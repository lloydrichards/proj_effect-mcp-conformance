import { Effect, Layer } from "effect";
import { McpServer } from "effect/ai";
import { runHttpScenario, server } from "@repo/mcp-fixture";

const PromptRegistration = Layer.effectDiscard(
  McpServer.registerPrompt({
    name: "test_simple_prompt",
    description: "A simple prompt.",
    content: () => Effect.succeed("This is a simple prompt for testing."),
  }),
);

const ScenarioLive = PromptRegistration.pipe(
  Layer.provideMerge(server("prompts-get-simple-II")),
);

runHttpScenario(ScenarioLive);
