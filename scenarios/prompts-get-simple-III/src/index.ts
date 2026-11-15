import { runHttpScenario, server } from "@repo/mcp-fixture";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/ai";

const SimplePrompt = new McpSchema.Prompt({
  name: "test_simple_prompt",
  description: "A simple prompt.",
});

const PromptRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((registry) =>
    registry.addPrompt({
      prompt: SimplePrompt,
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
    }),
  ),
);

const ScenarioLive = PromptRegistration.pipe(
  Layer.provideMerge(server("prompts-get-simple-III")),
);

runHttpScenario(ScenarioLive);
