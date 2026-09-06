import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Context, Effect, Layer } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { McpServerConfig, server } from "@repo/mcp-fixture";

const JsonSchema202012Tool = new McpSchema.Tool({
  name: "json_schema_2020_12_tool",
  description: "Tool with JSON Schema 2020-12 features",
  inputSchema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    $defs: {
      address: {
        $anchor: "addressDef",
        type: "object",
        properties: { street: { type: "string" }, city: { type: "string" } },
      },
    },
    properties: {
      name: { type: "string" },
      address: { $ref: "#/$defs/address" },
      contactMethod: { type: "string", enum: ["phone", "email"] },
      phone: { type: "string" },
      email: { type: "string" },
    },
    allOf: [{ anyOf: [{ required: ["phone"] }, { required: ["email"] }] }],
    if: {
      properties: { contactMethod: { const: "phone" } },
      required: ["contactMethod"],
    },
    // oxlint-disable-next-line unicorn/no-thenable -- `then` is a JSON Schema conditional keyword.
    then: { required: ["phone"] },
    else: { required: ["email"] },
    additionalProperties: false,
  },
});
const SchemaRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((mcp) =>
    mcp.addTool({
      tool: JsonSchema202012Tool,
      annotations: Context.empty(),
      handle: () =>
        Effect.succeed(
          new McpSchema.CallToolResult({
            content: [
              { type: "text", text: "JSON Schema 2020-12 tool called" },
            ],
          }),
        ),
    }),
  ),
);
const ScenarioLive = SchemaRegistration.pipe(
  Layer.provideMerge(server("schema-edge-cases-http")),
);
const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);
const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());
BunRuntime.runMain(main);
