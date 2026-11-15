import { Effect, Layer, Schema } from "effect";
import { McpServer } from "effect/ai";
import { runHttpScenario, server } from "@repo/mcp-fixture";

const PromptRegistration = Layer.effectDiscard(
  McpServer.registerPrompt({
    name: "test_prompt_with_arguments",
    description: "A prompt with required arguments.",
    parameters: { arg1: Schema.String, arg2: Schema.String },
    content: ({ arg1, arg2 }) =>
      Effect.succeed(`Prompt with arguments: arg1='${arg1}', arg2='${arg2}'`),
  }),
);

const ScenarioLive = PromptRegistration.pipe(
  Layer.provideMerge(server("prompts-get-with-args-II")),
);

runHttpScenario(ScenarioLive);
