import { Effect, Layer, Schema } from "effect";
import { McpServer } from "effect/ai";
import { runHttpScenario, server } from "@repo/mcp-fixture";

const argumentValues = ["test", "test-report", "release"];

const PromptRegistration = Layer.effectDiscard(
  McpServer.registerPrompt({
    name: "test_prompt_with_arguments",
    description: "A prompt with required arguments.",
    parameters: { arg1: Schema.String, arg2: Schema.optional(Schema.String) },
    completion: {
      arg1: (prefix) =>
        Effect.succeed(
          argumentValues.filter((value) => value.startsWith(prefix)),
        ),
    },
    content: ({ arg1, arg2 }) =>
      Effect.succeed(
        arg2 === undefined
          ? `Prompt argument: ${arg1}`
          : `Prompt with arguments: arg1='${arg1}', arg2='${arg2}'`,
      ),
  }),
);

const ScenarioLive = PromptRegistration.pipe(
  Layer.provideMerge(server("completion-complete-II")),
);

runHttpScenario(ScenarioLive);
