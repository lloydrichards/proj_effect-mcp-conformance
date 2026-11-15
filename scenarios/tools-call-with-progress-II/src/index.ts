import { Layer } from "effect";
import { runHttpScenario, server } from "@repo/mcp-fixture";
import { InteractiveTools } from "./tools";

const ScenarioLive = InteractiveTools.pipe(
  Layer.provideMerge(server("stateful-interactive-http")),
);

runHttpScenario(ScenarioLive);
