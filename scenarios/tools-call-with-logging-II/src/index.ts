import { Layer } from "effect";
import { runHttpScenario, server } from "@repo/mcp-fixture";
import { InteractiveTools } from "@repo/scenario-tools-call-with-progress-II/tools";

const ScenarioLive = InteractiveTools.pipe(
  Layer.provideMerge(server("stateful-interactive-http")),
);

runHttpScenario(ScenarioLive);
