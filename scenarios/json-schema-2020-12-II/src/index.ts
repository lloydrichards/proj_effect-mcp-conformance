import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { McpServer, Tool, Toolkit } from "effect/ai";
import { HttpRouter, HttpServer } from "effect/http";
import { McpProtocolConfig, McpServerConfig } from "@repo/mcp-fixture";

const JsonSchema202012Tool = Tool.dynamic("json_schema_2020_12_tool", {
  description: "Tool with JSON Schema 2020-12 features",
  parameters: {
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
  success: Schema.String,
});

const SchemaToolkit = Toolkit.make(JsonSchema202012Tool);

const SchemaHandlers = SchemaToolkit.toLayer({
  json_schema_2020_12_tool: () =>
    Effect.succeed("JSON Schema 2020-12 tool called"),
});

const SchemaFeatures = McpServer.toolkit(SchemaToolkit).pipe(
  Layer.provide(SchemaHandlers),
);

const McpHttpLive = Effect.map(
  McpProtocolConfig,
  ({ protocols, allowedOrigins }) =>
    McpServer.layerHttp({
      name: "Effect MCP fixture: json-schema-2020-12-II",
      version: "0.1.0",
      path: "/mcp",
      protocols,
      allowedOrigins,
    }),
).pipe(Layer.unwrap);

const ScenarioLive = SchemaFeatures.pipe(Layer.provideMerge(McpHttpLive));

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
