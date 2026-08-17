import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { Command } from "effect/unstable/cli";
import { inspect } from "./commands/inspect";
import { run } from "./commands/run";

const root = Command.make("effect-mcp-conformance");
const AllCommands = Command.withSubcommands([run, inspect]);
const RuntimeLayers = Layer.mergeAll(BunServices.layer);

root.pipe(
  AllCommands,
  Command.run({ version: "0.0.0" }),
  Effect.provide(RuntimeLayers),
  BunRuntime.runMain,
);
