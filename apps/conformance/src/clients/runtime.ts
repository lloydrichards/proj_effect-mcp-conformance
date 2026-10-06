import { Config, Data, Effect, Schema } from "effect";
import { McpProtocol } from "effect/ai";

export class FixtureError extends Data.TaggedError("FixtureError")<{
  readonly message: string;
}> {}

export const RunnerContext = Schema.Struct({
  toolCalls: Schema.Array(
    Schema.Struct({ name: Schema.String, arguments: Schema.JsonObject }),
  ),
});

export const runnerConfiguration = Effect.gen(function* () {
  const scenario = yield* Config.String("MCP_CONFORMANCE_SCENARIO");
  const version = yield* Config.Literals(
    ["2025-11-25", "2026-07-28"],
    "MCP_CONFORMANCE_PROTOCOL_VERSION",
  );
  const url = process.argv[2];
  if (url === undefined)
    return yield* new FixtureError({ message: "Missing server URL" });
  return {
    scenario,
    url,
    protocol:
      version === "2026-07-28"
        ? McpProtocol.v2026_07_28
        : McpProtocol.v2025_11_25,
  };
});
