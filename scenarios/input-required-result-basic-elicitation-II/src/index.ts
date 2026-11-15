import { Layer } from "effect";
import { runHttpScenario, server } from "@repo/mcp-fixture";
import { ClientInputTools } from "./tools";

const ScenarioLive = ClientInputTools.pipe(
  Layer.provideMerge(server("mrtr-happy-path-http")),
);

runHttpScenario(ScenarioLive);
