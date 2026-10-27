import { startServer } from "../server-process";
import { repository } from "../repository";
import { Console, Data, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { ChildProcess } from "effect/process";
import {
  supportedProtocolVersions,
  type ProtocolVersion,
} from "@repo/mcp-fixture";
import {
  conformanceNameFor,
  entrypointFor,
  findScenario,
  scenarioNames,
} from "../scenarios";

const scenario = Argument.String("scenario").pipe(
  Argument.withDescription("Conformance server scenario to run"),
);

const verbose = Flag.Boolean("verbose").pipe(
  Flag.withDescription("Show the conformance runner's detailed output"),
  Flag.optional,
);

const protocol = Flag.Literals("protocol", supportedProtocolVersions).pipe(
  Flag.withDefault("2025-11-25"),
  Flag.withDescription("Protocol version offered by the handshake probe"),
);

const protocolCase = Flag.Literals("protocol-case", [
  "only",
  "with-fallback",
  "fallback-only",
] as const).pipe(
  Flag.withDefault("only"),
  Flag.withDescription("How the server's ordered adapter list is configured"),
);

const fallbackProtocol = Flag.Literals(
  "fallback-protocol",
  supportedProtocolVersions,
).pipe(
  Flag.optional,
  Flag.withDescription("Fallback adapter used by fallback protocol cases"),
);

const outputDir = Flag.String("output-dir").pipe(
  Flag.optional,
  Flag.withDescription("Directory for the official runner's raw checks"),
);

class UnknownScenario extends Data.TaggedError("UnknownScenario")<{
  readonly scenario: string;
}> {}

class InvalidProtocolCase extends Data.TaggedError("InvalidProtocolCase")<{
  readonly protocolCase: string;
  readonly protocol: ProtocolVersion;
  readonly message: string;
}> {}

class UnsupportedScenarioProtocol extends Data.TaggedError(
  "UnsupportedScenarioProtocol",
)<{
  readonly scenario: string;
  readonly protocol: ProtocolVersion;
}> {}

class ProtocolNegotiationMismatch extends Data.TaggedError(
  "ProtocolNegotiationMismatch",
)<{
  readonly expected: ProtocolVersion;
  readonly actual: string;
}> {}

const protocolsForCase = (
  protocol: ProtocolVersion,
  protocolCase: "only" | "with-fallback" | "fallback-only",
  fallbackProtocol: Option.Option<ProtocolVersion>,
): Effect.Effect<
  readonly [ProtocolVersion, ...Array<ProtocolVersion>],
  InvalidProtocolCase
> => {
  switch (protocolCase) {
    case "only":
      return Effect.succeed([protocol]);
    case "with-fallback":
    case "fallback-only": {
      if (Option.isNone(fallbackProtocol)) {
        return Effect.fail(
          new InvalidProtocolCase({
            protocolCase,
            protocol,
            message: "--fallback-protocol is required for this protocol case.",
          }),
        );
      }
      if (fallbackProtocol.value === protocol) {
        return Effect.fail(
          new InvalidProtocolCase({
            protocolCase,
            protocol,
            message: "--fallback-protocol must differ from --protocol.",
          }),
        );
      }
      return Effect.succeed(
        protocolCase === "with-fallback"
          ? [protocol, fallbackProtocol.value]
          : [fallbackProtocol.value],
      );
    }
  }
};

const protocolProbe = (url: string, offeredProtocol: ProtocolVersion) =>
  Effect.promise(async () => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "protocol-probe",
        method: "initialize",
        params: {
          protocolVersion: offeredProtocol,
          capabilities: {},
          clientInfo: { name: "effect-mcp-conformance", version: "0.0.0" },
        },
      }),
    });
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("result" in body)) {
      throw new Error(
        "Protocol probe received an invalid initialize response.",
      );
    }
    const result = body.result;
    if (
      typeof result !== "object" ||
      result === null ||
      !("protocolVersion" in result) ||
      typeof result.protocolVersion !== "string"
    ) {
      throw new Error(
        "Protocol probe response did not include protocolVersion.",
      );
    }
    return result.protocolVersion;
  });

export const run = Command.make(
  "run",
  { scenario, verbose, protocol, protocolCase, fallbackProtocol, outputDir },
  ({
    scenario,
    verbose,
    protocol,
    protocolCase,
    fallbackProtocol,
    outputDir,
  }) =>
    Effect.scoped(
      Effect.gen(function* () {
        const scenarioDefinition = findScenario(scenario);
        if (scenarioDefinition === undefined) {
          yield* Console.error(
            `Unknown scenario ${JSON.stringify(scenario)}. ` +
              `Choose one of: ${scenarioNames.join(", ")}.`,
          );
          return yield* new UnknownScenario({ scenario });
        }

        const configuredProtocols = yield* protocolsForCase(
          protocol,
          protocolCase,
          fallbackProtocol,
        );
        const expectedProtocol = configuredProtocols[0];
        if (!scenarioDefinition.protocolVersions.includes(expectedProtocol)) {
          return yield* new UnsupportedScenarioProtocol({
            scenario,
            protocol: expectedProtocol,
          });
        }

        const url = yield* startServer(
          entrypointFor(scenarioDefinition),
          configuredProtocols,
        );
        if (expectedProtocol === "2026-07-28") {
          yield* Console.log(
            `Protocol: configured stateless ${expectedProtocol}.`,
          );
        } else {
          const negotiatedProtocol = yield* protocolProbe(url, protocol);
          if (negotiatedProtocol !== expectedProtocol) {
            return yield* new ProtocolNegotiationMismatch({
              expected: expectedProtocol,
              actual: negotiatedProtocol,
            });
          }
          yield* Console.log(
            `Protocol: offered ${protocol}; configured [${configuredProtocols.join(
              ", ",
            )}]; negotiated ${negotiatedProtocol}.`,
          );
        }
        const exitCode = yield* ChildProcess.make(
          "bunx",
          [
            "@modelcontextprotocol/conformance",
            "server",
            "--url",
            url,
            "--scenario",
            conformanceNameFor(scenarioDefinition),
            ...(expectedProtocol === "2026-07-28"
              ? ["--spec-version", expectedProtocol]
              : []),
            ...Option.match(outputDir, {
              onNone: () => [],
              onSome: (path) => ["--output-dir", path],
            }),
            ...(Option.getOrElse(verbose, () => false) ? ["--verbose"] : []),
          ],
          {
            cwd: repository,
            extendEnv: true,
            stderr: "inherit",
            stdout: "inherit",
          },
        ).pipe(Effect.flatMap((handle) => handle.exitCode));
        process.exitCode = exitCode;
      }),
    ),
).pipe(Command.withDescription("Start and test one MCP server scenario"));
