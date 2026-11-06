import { Data, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { selectScenarios, type MatrixSelection } from "../matrix/scenarios";
import { runMatrix } from "../matrix/run";

class UnknownScenario extends Data.TaggedError("UnknownScenario")<{
  readonly scenario: string;
}> {}

const matrixCommand = (direction: MatrixSelection) =>
  Command.make(
    direction,
    {
      selectedScenario: Flag.String("scenario").pipe(
        Flag.optional,
        Flag.withDescription(
          "Limit the matrix to a local or upstream scenario name",
        ),
      ),
      timeout: Flag.Int("timeout").pipe(
        Flag.withDefault(30_000),
        Flag.withDescription("Maximum milliseconds per matrix cell"),
      ),
      // Preserve the original client's positional selectors.
      name: Argument.String("name").pipe(Argument.optional),
      implementation: Argument.String("implementation").pipe(Argument.optional),
    },
    ({ selectedScenario, timeout, name, implementation }) =>
      Effect.gen(function* () {
        const selectedName = Option.getOrUndefined(
          Option.orElse(selectedScenario, () => name),
        );
        const selected = selectScenarios(
          direction,
          selectedName,
          Option.getOrUndefined(implementation),
        );
        if (selected.length === 0)
          return yield* new UnknownScenario({
            scenario: selectedName ?? direction,
          });
        yield* runMatrix(direction, selected, timeout);
      }),
  ).pipe(Command.withDescription(`Run the ${direction} conformance matrix`));

export const all = matrixCommand("all");
export const client = matrixCommand("client");
export const server = matrixCommand("server");
