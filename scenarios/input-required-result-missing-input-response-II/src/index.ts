import { Layer } from "effect";
import { runHttpScenario, server } from "@repo/mcp-fixture";
import { InputValidationTools } from "@repo/scenario-input-required-result-validate-input-II/tools";

const ScenarioLive = InputValidationTools.pipe(
  Layer.provideMerge(server("mrtr-adversarial-http")),
);

runHttpScenario(ScenarioLive);
