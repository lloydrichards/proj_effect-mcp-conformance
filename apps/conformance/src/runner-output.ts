import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const latestScenarioChecks = (
  directory: string,
  scenario: string,
): unknown => {
  const latest = readdirSync(directory)
    .filter(
      (name) =>
        name.startsWith(`server-${scenario}-`) &&
        /^\d{4}-\d{2}-\d{2}T/.test(name.slice(`server-${scenario}-`.length)),
    )
    .sort()
    .at(-1);
  if (latest === undefined)
    throw new Error(
      "Conformance runner did not save any results for " + scenario,
    );
  return JSON.parse(
    readFileSync(join(directory, latest, "checks.json"), "utf8"),
  );
};
