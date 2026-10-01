import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import vm from "node:vm";
const require = createRequire(import.meta.url);
const cliPath =
  require.resolve("@modelcontextprotocol/conformance/package.json");
const Ajv = require(
  require.resolve("ajv/dist/2020.js", { paths: [cliPath] }),
).default;
const formats = require(require.resolve("ajv-formats", { paths: [cliPath] }));
const bundle = readFileSync(
  new URL(
    "../../../node_modules/@modelcontextprotocol/conformance/dist/index.js",
    import.meta.url,
  ),
  "utf8",
);
const start = bundle.indexOf("Re={") + 3;
const end = bundle.indexOf(";const ze=", start);
if (start < 3 || end < 0) throw new Error("Bundled schema marker changed");
const core = vm.runInNewContext(
  "(" + bundle.slice(start, end) + ")",
  {},
  { timeout: 5000 },
);
const extension = JSON.parse(
  readFileSync(new URL("./ext-tasks-schema.json", import.meta.url)),
);
function validator(schema, name) {
  const ajv = new Ajv({ strict: false, allErrors: true });
  formats(ajv);
  ajv.addFormat("byte", true);
  ajv.addSchema({ ...schema, $id: "local://schema" });
  return ajv.compile({ $ref: "local://schema#/$defs/" + name });
}
const validateCore = validator(core, "CallToolResult");
const validateExtension = validator(extension, "CreateTaskResult");
const report = JSON.parse(
  readFileSync(new URL("../../conformance-2026-10-01.json", import.meta.url)),
);
const samples = report.cells.flatMap((cell) =>
  cell.checks
    .filter((c) => c.id === "wire-schema-valid" && c.status === "FAILURE")
    .flatMap((check) =>
      (check.details?.violations ?? []).map((v) => ({
        scenario: cell.scenario,
        ...v,
      })),
    ),
);
const checks = samples.map((sample) => ({
  ...sample,
  coreCallToolResultValid: validateCore(sample.message.result),
  coreErrors: structuredClone(validateCore.errors),
  extensionCreateTaskResultValid: validateExtension(sample.message.result),
  extensionErrors: structuredClone(validateExtension.errors),
}));
const result = {
  conformanceVersion: "0.2.0-alpha.11",
  bundleSha256: createHash("sha256").update(bundle).digest("hex"),
  extensionSchemaSha256: createHash("sha256")
    .update(readFileSync(new URL("./ext-tasks-schema.json", import.meta.url)))
    .digest("hex"),
  samples: checks.length,
  scenarios: [...new Set(checks.map((c) => c.scenario))],
  coreRejected: checks.filter((c) => !c.coreCallToolResultValid).length,
  extensionAccepted: checks.filter((c) => c.extensionCreateTaskResultValid)
    .length,
  checks,
};
writeFileSync(
  new URL("./comparison.json", import.meta.url),
  JSON.stringify(result, null, 2) + "\n",
);
writeFileSync(
  new URL("./bundled-core-schema.json", import.meta.url),
  JSON.stringify(core, null, 2) + "\n",
);
console.log(JSON.stringify({ ...result, checks: undefined }, null, 2));
const validateInputs = validator(extension, "InputResponses");
const validateUpdate = validator(extension, "UpdateTaskRequest");
const inputChecks = [
  {
    name: "runner-unknown-malformed",
    inputResponses: { "unknown-key": { ignored: true } },
  },
  {
    name: "unknown-valid-elicitation",
    inputResponses: {
      "unknown-key": { action: "accept", content: { confirm: true } },
    },
  },
].map((sample) => {
  const inputsValid = validateInputs(sample.inputResponses);
  const inputsErrors = structuredClone(validateInputs.errors);
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "tasks/update",
    params: { taskId: "example-task", inputResponses: sample.inputResponses },
  };
  const requestValid = validateUpdate(request);
  return {
    ...sample,
    inputsValid,
    inputsErrors,
    request,
    requestValid,
    requestErrors: structuredClone(validateUpdate.errors),
  };
});
writeFileSync(
  new URL("./input-response-comparison.json", import.meta.url),
  JSON.stringify(inputChecks, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    inputChecks.map(({ name, inputsValid, requestValid }) => ({
      name,
      inputsValid,
      requestValid,
    })),
    null,
    2,
  ),
);
