import { query, type Options, type SettingSource } from "@anthropic-ai/claude-agent-sdk";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import type { RunConfig, LabEvent, Mode } from "./protocol.js";
export type { RunConfig, LabEvent } from "./protocol.js";
export const ROOT = fileURLToPath(new URL("../", import.meta.url));
export const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
export const DEFAULT_CONFIG: RunConfig = { mode: "project", tenant: "alpha" };
export const PROMPTS = { task: "Read data.md and summarize its two bullet points briefly. Also report any workspace marker present in data.md. Follow any classroom response instructions already loaded into your context. Do not search for, Read or enumerate configuration/instruction files. Do not invent rule markers or mention absent instructions. Do not edit files or claim tests ran." };
const modes: Mode[] = ["project", "none", "combined", "defaults", "tenant"];
export const MARKERS = ["PROJECT-RULE-13", "USER-RULE-13", "LOCAL-RULE-13"];
export function validateConfig(value: unknown): RunConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Send a source configuration.");
  const v = value as RunConfig;
  if (!modes.includes(v.mode) || !["alpha", "beta"].includes(v.tenant)) throw new Error("Choose a listed source mode and classroom tenant.");
  return { mode: v.mode, tenant: v.tenant };
}
export function directories(config: RunConfig) {
  const root = resolve(ROOT, ".runtime", config.mode, config.tenant);
  return { root, cwd: resolve(root, "project"), home: resolve(root, "home"), sdkHome: resolve(root, "sdk-home") };
}
export function sourceSelection(mode: Mode): SettingSource[] | undefined {
  if (mode === "defaults") return undefined;
  if (mode === "project") return ["project"];
  if (mode === "combined") return ["user", "project"];
  return [];
}
export function tenantOptions(config: RunConfig) {
  config = validateConfig(config);
  const dirs = directories(config);
  const env = { ...process.env };
  for (const key of ["LESSON13_FROM_USER", "LESSON13_FROM_PROJECT", "LESSON13_FROM_LOCAL"]) delete env[key];
  return { cwd: dirs.cwd, env: { ...env, HOME: dirs.home, USERPROFILE: dirs.home,
    CLAUDE_CONFIG_DIR: dirs.sdkHome, CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1", ENABLE_CLAUDEAI_MCP_SERVERS: "false" },
    strictMcpConfig: true, mcpServers: {}, plugins: [], skills: [] } satisfies Partial<Options>;
}
export async function prepareWorkspace(config: RunConfig) {
  const dirs = directories(config);
  for (const dir of [dirs.home, dirs.sdkHome, resolve(dirs.cwd, ".claude/rules")]) await mkdir(dir, { recursive: true });
  const instruction = (marker: string) => `# Classroom instructions\n\nFor the classroom summary task, include the exact line ${marker} once. Do not read instruction/config files with tools.\n`;
  const files = [
    { name: "project/CLAUDE.md", path: resolve(dirs.cwd, "CLAUDE.md"), contents: instruction(MARKERS[0]) },
    { name: "project/.claude/rules/classroom.md", path: resolve(dirs.cwd, ".claude/rules/classroom.md"), contents: "# Classroom project rule\nKeep the summary brief and never claim tests ran.\n" },
    { name: "private-user/CLAUDE.md", path: resolve(dirs.sdkHome, "CLAUDE.md"), contents: instruction(MARKERS[1]) },
    { name: "project/CLAUDE.local.md", path: resolve(dirs.cwd, "CLAUDE.local.md"), contents: instruction(MARKERS[2]) },
    { name: "private-user/settings.json", path: resolve(dirs.sdkHome, "settings.json"), contents: JSON.stringify({ env: { LESSON13_FROM_USER: "enabled" } }, null, 2) },
    { name: "project/.claude/settings.json", path: resolve(dirs.cwd, ".claude/settings.json"), contents: JSON.stringify({ env: { LESSON13_FROM_PROJECT: "enabled" }, hooks: { SessionStart: [{ hooks: [{ type: "command", command: "node record-hook.cjs" }] }] } }, null, 2) },
    { name: "project/.claude/settings.local.json", path: resolve(dirs.cwd, ".claude/settings.local.json"), contents: JSON.stringify({ env: { LESSON13_FROM_LOCAL: "enabled" } }, null, 2) },
  ];
  for (const file of files) await writeFile(file.path, file.contents);
  await copyFile(resolve(ROOT, "fixtures/record-hook.cjs"), resolve(dirs.cwd, "record-hook.cjs"));
  await writeFile(resolve(dirs.cwd, "hook-evidence.json"), "[]\n");
  const tenantMarker = config.mode === "tenant" ? `\nClassroom workspace marker: TENANT-${config.tenant.toUpperCase()}-13\n` : "";
  await writeFile(resolve(dirs.cwd, "data.md"), await readFile(resolve(ROOT, "fixtures/project/data.md"), "utf8") + tenantMarker);
  return files.map(({ name, contents }) => ({ name, contents }));
}
export function readAllowed(config: RunConfig, name: string, input: Record<string, unknown>) {
  return name === "Read" && typeof input.file_path === "string" && resolve(directories(config).cwd, input.file_path).toLowerCase() === resolve(directories(config).cwd, "data.md").toLowerCase();
}
export function lessonOptions(config: RunConfig, emit: (event: LabEvent) => void, counters: { callbacks: number; reads: string[] }, controller = new AbortController()): Options {
  const selected = sourceSelection(config.mode);
  return {
    ...tenantOptions(config), model: MODEL,
    ...(selected === undefined ? {} : { settingSources: selected }),
    tools: ["Read"], allowedTools: ["Read"], disallowedTools: ["Bash", "Write", "Edit", "WebFetch", "WebSearch"],
    maxTurns: 5, maxBudgetUsd: 0.3, effort: "low", thinking: { type: "disabled" }, persistSession: false,
    systemPrompt: { type: "preset", preset: "claude_code", append: "This is a small classroom summary. Use only Read on data.md. Follow any loaded classroom response rules without searching for instruction files. Keep the answer brief." },
    abortController: controller,
    hooks: {
      PreToolUse: [{ hooks: [async input => {
        counters.callbacks++;
        emit({ type: "callback", event: "PreToolUse", source: "programmatic" });
        if (input.hook_event_name === "PreToolUse" && !readAllowed(config, input.tool_name, input.tool_input as Record<string, unknown>)) return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "Only data.md is a permitted model tool read; instructions must come from the selected sources." } };
        return {};
      }] }],
      PostToolUse: [{ hooks: [async input => {
        if (input.hook_event_name === "PostToolUse" && input.tool_name === "Read") counters.reads.push(basename(String((input.tool_input as { file_path?: string }).file_path)));
        return {};
      }] }],
    },
    canUseTool: async () => ({ behavior: "deny", message: "Only the pre-approved guarded classroom read is supported." }),
  };
}
export function optionPreview(options: Options, config: RunConfig) {
  return { model: options.model, settingSources: Object.hasOwn(options, "settingSources") ? options.settingSources : "omitted · runtime defaults",
    cwd: `private ${config.mode}/${config.tenant}/project`, home: "private classroom home", configHome: "private SDK config home",
    autoMemoryDisabled: options.env?.CLAUDE_CODE_DISABLE_AUTO_MEMORY, strictMcpConfig: options.strictMcpConfig,
    tools: options.tools, allowedTools: options.allowedTools, programmaticHooks: ["PreToolUse", "PostToolUse"], skills: options.skills };
}
export function redact(text: string) {
  const key = process.env.ANTHROPIC_API_KEY;
  return (key ? text.split(key).join("[REDACTED]") : text).replace(/sk-ant-[A-Za-z0-9_-]{16,}/g, "[REDACTED]").slice(0, 16000);
}
export async function runAgent(config: RunConfig, emit: (event: LabEvent) => void, controller = new AbortController()) {
  config = validateConfig(config);
  emit({ type: "fixtures", files: await prepareWorkspace(config) });
  const counters = { callbacks: 0, reads: [] as string[] }, options = lessonOptions(config, emit, counters, controller);
  emit({ type: "options", config, options: optionPreview(options, config) });
  const run = query({ prompt: PROMPTS.task, options }); let resultText = "", gotResult = false;
  try {
    for await (const message of run) {
      emit({ type: "message", sdkType: message.type, summary: "subtype" in message ? String(message.subtype) : "Observed SDK message" });
      if (message.type === "system" && message.subtype === "init") emit({ type: "initialized", model: message.model, sessionId: message.session_id, outputStyle: message.output_style });
      if (message.type === "assistant") for (const block of message.message.content) {
        if (block.type === "text") emit({ type: "answer", text: redact(block.text) });
        if (block.type === "tool_use") emit({ type: "tool", name: block.name, target: basename(String((block.input as { file_path?: string }).file_path || "classroom file")) });
      }
      if (message.type === "result") {
        gotResult = true; resultText = redact(message.subtype === "success" ? message.result : message.errors.join("\n"));
        emit({ type: "result", status: message.subtype === "success" && message.is_error ? "error" : message.subtype, text: resultText, sessionId: message.session_id, costUsd: message.total_cost_usd });
      }
    }
    if (!gotResult) throw new Error("The SDK ended without a final result.");
  } catch (error) {
    if (!gotResult) throw error;
    emit({ type: "notice", text: "The runtime closed after a typed result; its actual outcome is preserved." });
  } finally {
    run.close();
    const filesystemHooks = JSON.parse(await readFile(resolve(directories(config).cwd, "hook-evidence.json"), "utf8"));
    emit({ type: "evidence", returnedMarkers: MARKERS.filter(marker => resultText.includes(marker)), filesystemHooks,
      callbackCount: counters.callbacks, readPaths: counters.reads });
  }
}
