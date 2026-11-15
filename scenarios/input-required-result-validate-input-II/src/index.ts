import { Layer } from "effect";
import { runHttpScenario, server } from "@repo/mcp-fixture";
import { InputValidationTools } from "./tools";

const ScenarioLive = InputValidationTools.pipe(
  Layer.provideMerge(server("mrtr-adversarial-http")),
);

runHttpScenario(ScenarioLive);
