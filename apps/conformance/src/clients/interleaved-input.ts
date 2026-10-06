import { BunRuntime } from "@effect/platform-bun";
import { Deferred, Effect } from "effect";
import { McpClient, McpClientTransport, McpSchema } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { FixtureError, runnerConfiguration } from "./runtime";

// The handler uses a captured service and performs an independent call before
// answering. The outer operation must retain its own continuation state.
const main = Effect.gen(function* () {
  const { scenario, url, protocol } = yield* runnerConfiguration;
  if (scenario !== "sep-2322-client-request-state")
    return yield* new FixtureError({
      message: "Expected request-state scenario",
    });
  const connection = yield* Deferred.make<McpClient.Client>();
  const transport = yield* McpClientTransport.http({ url, protocol });
  const client = yield* McpClient.make({
    protocol,
    clientInfo: { name: "effect-interleaved-input-client", version: "0.0.0" },
    timeout: "10 seconds",
    concurrency: 2,
    handlers: {
      elicitation: {
        form: () =>
          Effect.gen(function* () {
            const active = yield* Deferred.await(connection);
            const list = yield* active.listTools();
            const unrelated = list.tools.find(
              (tool) => tool.name === "test_mrtr_unrelated",
            );
            if (unrelated === undefined)
              return yield* new FixtureError({
                message: "Missing unrelated tool",
              });
            yield* active.callTool({ tool: unrelated, arguments: {} });
            return new McpSchema.ElicitAcceptResult({
              action: "accept",
              content: { confirmed: true },
            });
          }),
      },
    },
  }).pipe(Effect.provideService(McpClientTransport.Transport, transport));
  yield* Deferred.succeed(connection, client);
  const list = yield* client.listTools();
  for (const name of [
    "test_mrtr_echo_state",
    "test_mrtr_no_state",
    "test_mrtr_no_result_type",
  ]) {
    const tool = list.tools.find((tool) => tool.name === name);
    if (tool === undefined)
      return yield* new FixtureError({ message: `Missing tool ${name}` });
    yield* client.callTool({ tool, arguments: {} });
  }
});

main.pipe(
  Effect.scoped,
  Effect.provide(FetchHttpClient.layer),
  BunRuntime.runMain,
);
