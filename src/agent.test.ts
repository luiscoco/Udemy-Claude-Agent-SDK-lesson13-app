import { test } from "node:test";
import assert from "node:assert/strict";
import { validateConfig, directories, sourceSelection, tenantOptions, lessonOptions, readAllowed, optionPreview, DEFAULT_CONFIG as D } from "./agent.js";
test("fixed source modes and tenant IDs reject path injection", () => {
  for (const v of [null, [], {}, { mode: "unknown", tenant: "alpha" }, { mode: "tenant", tenant: "../beta" }]) assert.throws(() => validateConfig(v));
});
test("omitted and explicit empty sources remain distinct", () => {
  assert.equal(sourceSelection("defaults"), undefined); assert.deepEqual(sourceSelection("none"), []);
  const counters = { callbacks: 0, reads: [] };
  assert.ok(!Object.hasOwn(lessonOptions({ ...D, mode: "defaults" }, () => {}, counters), "settingSources"));
  assert.deepEqual(lessonOptions({ ...D, mode: "none" }, () => {}, counters).settingSources, []);
});
test("classroom tenants have distinct owned cwd/home/config paths", () => {
  const a = directories({ mode: "tenant", tenant: "alpha" }), b = directories({ mode: "tenant", tenant: "beta" });
  for (const key of ["cwd", "home", "sdkHome"] as const) { assert.notEqual(a[key], b[key]); assert.match(a[key], /\.runtime/); }
  const options = tenantOptions({ mode: "tenant", tenant: "alpha" });
  assert.equal(options.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY, "1"); assert.equal(options.strictMcpConfig, true);
});
test("model cannot read configuration files to fake loaded instruction evidence", () => {
  assert.ok(readAllowed(D, "Read", { file_path: "data.md" }));
  for (const path of ["CLAUDE.md", "CLAUDE.local.md", "../sdk-home/CLAUDE.md", "../../.env"]) assert.ok(!readAllowed(D, "Read", { file_path: path }));
  assert.ok(!readAllowed(D, "Bash", { command: "env" }));
});
test("safe projection excludes inherited keys and paths while preserving explicit choices", () => {
  const options = lessonOptions(D, () => {}, { callbacks: 0, reads: [] });
  assert.doesNotMatch(JSON.stringify(optionPreview(options, D)), /ANTHROPIC_API_KEY|USERPROFILE/);
  assert.deepEqual(options.settingSources, ["project"]);
  assert.equal(options.env?.PATH, process.env.PATH);
});
