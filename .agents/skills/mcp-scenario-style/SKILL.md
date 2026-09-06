---
name: mcp-conformance-scenario-style
description: Review, create, or refactor Effect MCP conformance scenario entrypoints so their protocol contract is defined before its implementation and the scenario-specific behavior is easy to compare. Use whenever working in scenarios/*, adding an MCP conformance fixture, standardizing scenario structure, choosing between Tool/Toolkit and low-level McpServer registration, or reducing repeated scenario bootstrap code.
---

# MCP Conformance Scenario Style

Make the behavioral difference between scenarios visible. Organize each scenario as:

1. MCP contracts and schemas
2. implementations
3. MCP registration layers
4. scenario assembly
5. runtime launch

Keep the module deep: scenario code owns the capability and behavior under test, while shared fixture code hides transport and launch mechanics that do not vary.

## Before changing a scenario

1. Read the official conformance scenario source or other supplied specification.
2. Record the exact contract it requires: capability advertisement, request payload, response shape, notifications or reverse requests, and applicable protocol revisions.
3. Read the current scenario and the closest neighboring scenario.
4. When useful, compare with:
   - `../open_effect/packages/effect/MCP.md`
   - `../open_effect/packages/effect/test/unstable/ai/McpServer/McpConformance/McpConformanceFixtures.ts`
   - `../open_effect/packages/effect/test/unstable/ai/McpServer/TestUtils/McpServerLayer.ts`
5. Preserve exact fixture names and wire values expected by the conformance runner.

Start with a read-only review unless the user explicitly asks to implement or refactor.

## Choose the truthful interface

### Ordinary typed tools

Default to Effect's public interface-first path:

1. Define each tool with `Tool.make`.
2. Group tools with `Toolkit.make`.
3. Bind implementations with `Toolkit.toLayer`.
4. Expose the toolkit with `McpServer.toolkit`.

```ts
const SimpleTextTool = Tool.make("test_simple_text", {
  description: "Returns test text.",
  parameters: Tool.EmptyParams,
  success: Schema.String,
});

const SimpleTextToolkit = Toolkit.make(SimpleTextTool);

const SimpleTextHandlers = SimpleTextToolkit.toLayer({
  test_simple_text: () => Effect.succeed("This is a simple text response."),
});

const SimpleTextFeatures = McpServer.toolkit(SimpleTextToolkit).pipe(
  Layer.provide(SimpleTextHandlers),
);
```

The `Tool` and `Toolkit` declarations are the interface. The handler layer is the implementation. Keep them visually separate.

### Wire-specific scenarios

Use low-level `McpServer.McpServer` registration when the scenario needs behavior that the typed toolkit cannot express truthfully, including:

- exact heterogeneous `CallToolResult` content
- `InputRequired` and MRTR flows
- raw request context or request state
- protocol-specific annotations
- custom header schemas
- dynamic registration
- deliberately malformed or unusual wire values

Low-level registration is an escape hatch, not a style failure. Still declare the MCP-facing contract before the implementation:

```ts
const SimpleTextTool = new McpSchema.Tool({
  name: "test_simple_text",
  description: "Returns test text.",
  inputSchema: { type: "object" },
});

const simpleTextHandler = () =>
  Effect.succeed(
    new McpSchema.CallToolResult({
      content: [{ type: "text", text: "This is a simple text response." }],
    }),
  );

const SimpleTextRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((server) =>
    server.addTool({
      tool: SimpleTextTool,
      annotations: Context.empty(),
      handle: simpleTextHandler,
    }),
  ),
);
```

Do not convert a wire-specific scenario to `Tool.make` merely for uniformity. The interface must expose the behavior the scenario actually tests.

### Prompts and resources

Keep the declarative `McpServer.prompt`, `McpServer.resource`, and resource-template constructors. They already combine the public definition with its handler. Give the resulting layer a capability-specific name such as `ImagePrompt`, `TextResource`, or `DocumentTemplate`.

## Canonical file shape

Use this order:

```text
imports
contracts and schemas
toolkit declarations
implementations and handlers
registration or feature layers
ScenarioLive
MainLive or shared launch helper
BunRuntime.runMain(...)
```

For a single capability:

```ts
const ScenarioLive = SimpleTextFeatures.pipe(
  Layer.provideMerge(server("tools-call-simple-text")),
);

const MainLive = ScenarioLive.pipe(
  HttpRouter.serve,
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layerConfig(McpServerConfig)),
);

const main = Layer.launch(MainLive).pipe(Effect.satisfiesServicesType<never>());

BunRuntime.runMain(main);
```

Use this exact assembly spelling for ordinary scenarios. In particular, name the three values `ScenarioLive`, `MainLive`, and `main`; attach the shared server with `Layer.provideMerge(server(...))`; and launch with `Layer.launch(MainLive)`. A fixed tail makes differences above it easier to compare. Deviate only when the transport or lifecycle assembly is itself under test.

If the repository provides a shared launch helper, use it so the scenario entrypoint shows mainly its unique behavior. Keep transport construction local when transport itself is under test, such as DNS rebinding, header admission, SSE, or lifecycle behavior.

For several capabilities, name each feature and merge once:

```ts
const ScenarioFeatures = Layer.mergeAll(
  CacheToolLive,
  CachePrompt,
  CacheResource,
  CacheResourceTemplate,
);
```

## Naming

Name values by their role, not merely their type:

- `SimpleTextTool`
- `SimpleTextToolkit`
- `SimpleTextHandlers`
- `SimpleTextRegistration` or `SimpleTextFeatures`
- `ImagePrompt`
- `TextResource`
- `ScenarioFeatures`
- `ScenarioLive`
- `MainLive`
- `main`

Use PascalCase for contracts and layers. Keep exact protocol wire names inside their definitions. Avoid generic top-level names such as `scenario`, `program`, `tools`, and `resource` when a more specific name would help comparison.

## Duplication

Extract infrastructure that is identical across scenarios, especially the HTTP/Bun launch tail. Keep shared transport and metadata in `packages/mcp-fixture`.

For closely related scenarios, extract only small stable vocabulary such as result constructors, schema fragments, or constant request keys. Keep the scenario's distinguishing payload, branch, state transition, and response inline. A configurable universal scenario factory usually hides the evidence the reader is trying to compare.

## Review checklist

- The interface appears before its implementation.
- The file's unique conformance behavior is visible without reading runtime plumbing.
- High-level `Tool` and `Toolkit` are used when they express the contract truthfully.
- Low-level registration has a concrete wire-level reason.
- Capability layers have specific names.
- Shared fixtures do not own scenario-specific capabilities or handlers.
- Transport customization remains local only when transport is under test.
- Exact wire names, payloads, outputs, and protocol applicability are preserved.
- The scenario contains only what the official check requires.
- Formatting, type-checking, and the focused conformance scenario pass after edits.

## Report format

For a review, report:

1. **Decision**: whether the scenario follows the interface-first structure.
2. **Contract**: what the conformance runner expects.
3. **Structure findings**: concrete deviations with file and line references.
4. **Recommended shape**: the smallest truthful restructuring.
5. **Escape-hatch justification**: why low-level registration is or is not needed.
6. **Validation**: checks run, or state clearly that the work was read-only.

Do not prescribe production behavior that the official scenario does not require.
