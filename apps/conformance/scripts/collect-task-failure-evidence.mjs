import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { once } from "node:events";
import { resolve } from "node:path";
import { randomInt } from "node:crypto";
import { Effect, Schema } from "effect";
import { McpSchema, McpTasks } from "effect/ai";

const repository = resolve(import.meta.dirname, "../../..");
const output = resolve(
  repository,
  process.env.MCP_EVIDENCE_DIR ?? "reports/task-failure-evidence",
);
await mkdir(output, { recursive: true });
const metadata = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientCapabilities": {
    elicitation: {},
    extensions: { "io.modelcontextprotocol/tasks": {} },
  },
  "io.modelcontextprotocol/clientInfo": {
    name: "FailureEvidence",
    version: "1.0.0",
  },
};

async function withFixture(name, entrypoint, run) {
  const port = randomInt(20000, 40000);
  const log = createWriteStream(resolve(output, `${name}-server.log`));
  const process_ = spawn("bun", ["run", entrypoint], {
    cwd: repository,
    env: {
      ...process.env,
      MCP_HOST: "127.0.0.1",
      MCP_PORT: String(port),
      MCP_PROTOCOLS: "2026-07-28",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  process_.stdout.pipe(log, { end: false });
  process_.stderr.pipe(log, { end: false });
  const exchanges = [];
  const url = `http://127.0.0.1:${port}/mcp`;
  let id = 0;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (process_.exitCode !== null)
        throw new Error(`${name} exited before readiness`);
      try {
        await fetch(url, { signal: AbortSignal.timeout(200) });
        ready = true;
        break;
      } catch {
        await Bun.sleep(50);
      }
    }
    if (!ready) throw new Error(`${name} did not start`);
    const request = async (label, method, params) => {
      const body = {
        jsonrpc: "2.0",
        id: ++id,
        method,
        params: { ...params, _meta: metadata },
      };
      const nameHeader = params.name ?? params.taskId;
      const headers = {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": "2026-07-28",
        "Mcp-Method": method,
        ...(nameHeader === undefined ? {} : { "Mcp-Name": nameHeader }),
      };
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      const text = await response.text();
      let parsed;
      if (response.headers.get("content-type")?.includes("text/event-stream")) {
        const data = text
          .split("\n")
          .filter((line) => line.startsWith("data: "))
          .map((line) => JSON.parse(line.slice(6)));
        parsed = data.find((message) => message.id === body.id);
      } else parsed = JSON.parse(text);
      exchanges.push({
        label,
        request: { headers, body },
        response: {
          status: response.status,
          headers: Object.fromEntries(response.headers),
          body: parsed,
          rawBody: text,
        },
      });
      return parsed;
    };
    const poll = async (taskId, target) => {
      for (let attempt = 0; attempt < 100; attempt++) {
        const response = await request(`poll-${target}`, "tasks/get", {
          taskId,
        });
        if (response.error) throw new Error(JSON.stringify(response.error));
        if (
          response.result.status === target ||
          ["completed", "failed", "cancelled"].includes(response.result.status)
        )
          return response.result;
        await Bun.sleep(20);
      }
      throw new Error(`Task did not reach ${target}`);
    };
    const findings = await run({ request, poll, url });
    await writeFile(
      resolve(output, `${name}.json`),
      `${JSON.stringify({ name, findings, exchanges }, null, 2)}\n`,
    );
    console.log(name, JSON.stringify(findings));
  } finally {
    process_.kill("SIGTERM");
    if (process_.exitCode === null) await once(process_, "exit");
    log.end();
  }
}

const runner = resolve(
  repository,
  "node_modules/@modelcontextprotocol/conformance/dist/index.js",
);
async function runChecker(name, scenario, url, script = runner) {
  const child = spawn(
    "node",
    [
      script,
      "server",
      "--url",
      url,
      "--scenario",
      scenario,
      "--spec-version",
      "2026-07-28",
      "--force",
      "--output-dir",
      resolve(output, name),
      "--verbose",
    ],
    { cwd: repository, stdio: ["ignore", "pipe", "pipe"] },
  );
  const chunks = [];
  child.stdout.on("data", (chunk) => chunks.push(chunk));
  child.stderr.on("data", (chunk) => chunks.push(chunk));
  const [exitCode] = await once(child, "exit");
  await writeFile(resolve(output, `${name}-runner.log`), Buffer.concat(chunks));
  const folders = (await readdir(resolve(output, name)))
    .filter((entry) => entry.startsWith("server-"))
    .sort();
  const checks = JSON.parse(
    await readFile(
      resolve(output, name, folders.at(-1), "checks.json"),
      "utf8",
    ),
  );
  return {
    exitCode,
    checks: checks.map(({ id, status, errorMessage }) => ({
      id,
      status,
      errorMessage,
    })),
  };
}

const temporary = resolve(
  repository,
  "apps/conformance/.cache/lifecycle-handler-defect.ts",
);
await mkdir(resolve(temporary, ".."), { recursive: true });
const source = await readFile(
  resolve(repository, "scenarios/tasks-lifecycle/src/index.ts"),
  "utf8",
);
const controlled = source
  .replace(
    'protocol_error_job: { mode: "required", timeout: "40 millis" }',
    'protocol_error_job: { mode: "required" }',
  )
  .replace(
    "protocol_error_job: () => Effect.never",
    'protocol_error_job: () => Effect.die("Expected protocol failure")',
  );
if (controlled === source || controlled.includes('timeout: "40 millis"'))
  throw new Error("Failed to construct handler defect control");
await writeFile(temporary, controlled);

await withFixture("toolkit-defect", temporary, async ({ request, poll }) => {
  const created = await request("create-protocol-error-job", "tools/call", {
    name: "protocol_error_job",
    arguments: {},
  });
  const terminal = await poll(created.result.taskId, "failed");
  assert.equal(terminal.status, "completed");
  assert.equal(terminal.result.isError, true);
  assert.equal(terminal.error, undefined);
  return { terminal };
});

await withFixture(
  "dispatch-input-responses",
  "scenarios/tasks-dispatch-and-envelope/src/index.ts",
  async ({ request, poll, url }) => {
    const created = await request("create-confirmation-task", "tools/call", {
      name: "confirm_delete",
      arguments: { filename: "evidence.txt" },
    });
    const taskId = created.result.taskId;
    const initial = await poll(taskId, "input_required");
    const key = Object.keys(initial.inputRequests)[0];
    const malformedUnknown = await request(
      "unknown-malformed",
      "tasks/update",
      { taskId, inputResponses: { "unknown-key": { ignored: true } } },
    );
    const validUnknown = await request("unknown-valid", "tasks/update", {
      taskId,
      inputResponses: {
        "unknown-key": { action: "accept", content: { confirm: true } },
      },
    });
    const afterUnknown = await request(
      "state-after-unknown-responses",
      "tasks/get",
      { taskId },
    );
    const malformedKnown = await request("known-malformed", "tasks/update", {
      taskId,
      inputResponses: { [key]: { ignored: true } },
    });
    const validKnown = await request("known-valid", "tasks/update", {
      taskId,
      inputResponses: {
        [key]: { action: "accept", content: { confirm: true } },
      },
    });
    const terminal = await poll(taskId, "completed");
    assert.equal(malformedUnknown.error.code, -32602);
    assert.equal(malformedKnown.error.code, -32602);
    assert.equal(validUnknown.result.resultType, "complete");
    assert.equal(afterUnknown.result.status, "input_required");
    assert.deepEqual(afterUnknown.result.inputRequests, initial.inputRequests);
    assert.equal(validKnown.result.resultType, "complete");
    assert.equal(terminal.status, "completed");
    const bundle = await readFile(runner, "utf8");
    const original = 'inputResponses:{"unknown-key":{ignored:!0}}';
    const replacement =
      'inputResponses:{"unknown-key":{action:"accept",content:{confirm:!0}}}';
    if (bundle.split(original).length !== 2)
      throw new Error("Runner dispatch probe marker changed");
    const correctedRunner = resolve(
      runner,
      "../evidence-dispatch-valid-input.js",
    );
    await writeFile(correctedRunner, bundle.replace(original, replacement));
    let correctedCheck;
    try {
      correctedCheck = await runChecker(
        "dispatch-valid-input-control",
        "tasks-dispatch-and-envelope",
        url,
        correctedRunner,
      );
    } finally {
      await unlink(correctedRunner);
    }
    assert.equal(
      correctedCheck.checks.find(
        (check) =>
          check.id === "tasks-result-type-complete-on-non-task-responses",
      ).status,
      "SUCCESS",
    );
    return {
      initial,
      malformedUnknown,
      validUnknown,
      afterUnknown,
      malformedKnown,
      validKnown,
      terminal,
      correctedCheck,
      diagnosticRunnerChange: { original, replacement },
    };
  },
);

await withFixture(
  "toolkit-protocol-timeout",
  "scenarios/tasks-lifecycle/src/index.ts",
  async ({ request, poll, url }) => {
    const created = await request("create-timeout-control", "tools/call", {
      name: "protocol_error_job",
      arguments: {},
    });
    const terminal = await poll(created.result.taskId, "failed");
    assert.equal(terminal.status, "failed");
    assert.equal(terminal.error.code, -32603);
    const conformance = await runChecker(
      "lifecycle-timeout-control",
      "tasks-lifecycle",
      url,
    );
    assert.equal(
      conformance.checks.find(
        (check) => check.id === "sep-2663-tasks-get-status-failed",
      ).status,
      "SUCCESS",
    );
    return {
      terminal,
      control:
        "Handler never finishes; required task policy timeout is 40 milliseconds.",
      conformance,
    };
  },
);

const context = McpSchema.McpRequestContext.of({
  clientId: 1,
  protocolVersion: "2026-07-28",
  clientCapabilities: metadata["io.modelcontextprotocol/clientCapabilities"],
});
const backend = await Effect.runPromise(
  Effect.gen(function* () {
    const execution = yield* McpTasks.Execution;
    const results = [];
    for (const [name, run] of [
      ["direct-defect", Effect.die("Expected protocol failure")],
      [
        "explicit-jsonrpc-error",
        Effect.fail(
          new McpTasks.TaskError({
            code: -32603,
            message: "Explicit protocol failure",
          }),
        ),
      ],
      [
        "tool-error-result",
        Effect.succeed(
          new McpSchema.CallToolResult({
            isError: true,
            content: [{ type: "text", text: "Expected tool failure" }],
          }),
        ),
      ],
    ]) {
      const task = yield* execution.create(run, context, {});
      let terminal;
      for (let attempt = 0; attempt < 100; attempt++) {
        yield* Effect.yieldNow;
        terminal = yield* execution.get(task.taskId, context);
        if (["completed", "failed", "cancelled"].includes(terminal.status))
          break;
      }
      results.push({
        name,
        task: yield* Schema.encodeEffect(McpTasks.DetailedTask)(terminal),
      });
    }
    return results;
  }).pipe(
    Effect.provide(
      McpTasks.layerMemory({ owner: "shared", maxActive: 4, maxRecords: 10 }),
    ),
    Effect.scoped,
  ),
);
assert.deepEqual(
  backend.map((item) => item.task.status),
  ["failed", "failed", "completed"],
);
await writeFile(
  resolve(output, "backend-error-controls.json"),
  `${JSON.stringify(backend, null, 2)}\n`,
);
console.log(
  "backend-controls",
  backend.map((item) => ({
    name: item.name,
    status: item.task.status,
    error: item.task.error,
  })),
);
