import { Layer } from "effect";
import { runHttpScenario, server } from "@repo/mcp-fixture";
import { RequestStateTools } from "@repo/scenario-input-required-result-request-state-II/tools";

const ScenarioLive = RequestStateTools.pipe(
  Layer.provideMerge(server("mrtr-state-machine-http")),
);

runHttpScenario(ScenarioLive);
