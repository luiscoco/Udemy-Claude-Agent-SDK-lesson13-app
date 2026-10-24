# Claude Agent SDK · Lesson 13 · Loading settings with settingSources

Based on Lesson13_Loading_Settings_with_settingSources.pptx. Five linked student pages, large readable text and coloured source excerpts for all 13 UML workflow steps.

## What you will learn

- Select three filesystem sources: user, project and local load different settings/instruction locations. The experiment creates safe fixtures in a private project and private SDK config home.
- Distinguish omission from []: With the pinned TypeScript SDK, omission loads all three sources. [] skips them. A listed subset opts in only to the named sources; the app preserves that distinction in its actual options.
- Observe loaded instructions: Compare returned project, user and local instruction markers without supplying them in the prompt. The model can Read only data.md, so it cannot fetch the instruction files with a tool. Compliance is an observation, not a complete configuration audit.
- Compare two hook mechanisms: A trusted command hook from project settings writes a private trace. A programmatic PreToolUse callback guards the data Read and runs even when filesystem sources are [].
- Know the limits of source filtering: Managed policy, global config, auto memory, authenticated connectors and sandbox credential restrictions have separate behavior. [] alone is not complete isolation.
- Build explicit classroom configurations: The Alpha and Beta examples use distinct owned cwd, home and config directories, [], disabled auto memory and strict MCP config. Shared-machine directories and hooks are not a production OS or tenant sandbox.

## Configure and run

Use Node.js 24+, npm and your own Anthropic key with access to the configured model. Python is not required to run the app.

```powershell
git clone https://github.com/luiscoco/Udemy-Claude-Agent-SDK-lesson13-app.git
cd .\Udemy-Claude-Agent-SDK-lesson13-app
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
npm start
```

From presentations use `cd .\agent-sdk\lesson13-setting-sources` instead of cloning. Open http://127.0.0.1:3113 and keep the terminal running. Ctrl+C stops it.

## Create your .env file

Preserve an existing .env, or copy .env.example. Enter your key locally and restart after edits. Start and sample:env explicitly load the optional file. Shell variables take precedence. Never commit the real .env.

```dotenv
ANTHROPIC_API_KEY=your_api_key
CLAUDE_MODEL=claude-sonnet-4-6
PORT=3113
```

On Windows, if required, set `CLAUDE_CODE_GIT_BASH_PATH=C:/Program Files/Git/bin/bash.exe` after confirming the installed path. Keep optional dependencies enabled. A second start recognizes this app; choose another PORT for an unrelated listener.

## Run the comparisons

1. Run project-only sources: Keep Project only and Alpha. Run once. Inspect the actual project instruction marker, project filesystem hook record and programmatic Read callback. The trusted command trace should show project enabled, without user/local fixture flags.
2. Compare with an empty source list: Select No filesystem sources and repeat the same task. Inspect [] in the actual options, no returned fixture rule markers, no filesystem hook record and an actual programmatic callback. The model is still allowed to Read data.md; [] does not erase the whole machine’s configuration.
3. Select user plus project: Run User + project. Observe both corresponding instruction markers and environment flags. Local is not selected. Compare the actual response, filesystem trace and callback evidence rather than replacing them with an expected answer.
4. Omit the option explicitly: Run Omit settingSources. The property is genuinely absent in the object, rather than passed as []. With the pinned runtime the user, project and local fixtures load. Observe the local instruction marker and local trace flag in addition to the other layers.
5. Compare two private classroom directories: Choose Private classroom directory configuration, run Alpha, then Beta. Each has distinct owned cwd/home/config paths, [], disabled auto memory and strict MCP config. Confirm the workspace marker from each actual data read. These shared-machine directories do not establish production isolation.

```powershell
npm run sample:env -- project
npm run sample:env -- none
npm run sample:env -- combined
npm run sample:env -- defaults
npm run sample:env -- tenant alpha
npm run sample:env -- tenant beta
npm test
```

`sample` uses only the launching shell environment. Run web and CLI comparisons sequentially. The model can Read only data.md. The student fixture panel is a host view, not a model prompt. Unexpected compliance or hook behavior stays an actual observation; no saved answer replaces a live failure.

## How the app was built

### 1. Validate source mode and classroom ID

Accept only a listed source mode and Alpha/Beta ID. The browser cannot provide an arbitrary path or executable hook command.

Source: `src/server.ts`, lines 52–52. Selected source; surrounding code omitted.

```typescript
const config = validateConfig(input);
```

### 2. Resolve owned cwd, home and config paths

Resolve separate classroom directories. This path factory demonstrates deliberate configuration, not OS-enforced tenant isolation.

Source: `src/agent.ts`, lines 20–21. Selected source; surrounding code omitted.

```typescript
const root = resolve(ROOT, ".runtime",
  config.mode, config.tenant);
return { root, cwd: resolve(root, "project"),
  home: resolve(root, "home"),
  sdkHome: resolve(root, "sdk-home") };
```

### 3. Prepare non-conflicting instruction fixtures

Write trusted project, private-user and local fixtures before the query. The student sees a host-rendered file view; those file contents are not inserted into the model prompt.

Source: `src/agent.ts`, lines 51–51. Selected source; surrounding code omitted.

```typescript
for (const file of files)
  await writeFile(file.path, file.contents);
```

### 4. Choose explicit sources or omission

Preserve the semantic difference between an omitted option and an empty list. The pinned runtime loads all three sources when the option is omitted.

Source: `src/agent.ts`, lines 24–27. Selected source; surrounding code omitted.

```typescript
if (mode === "defaults") return undefined;
if (mode === "project") return ["project"];
if (mode === "combined") return ["user", "project"];
return [];
```

### 5. Leave the property absent when omitted

The defaults experiment truly omits settingSources. Other modes pass their selected array, including an explicit empty array.

Source: `src/agent.ts`, lines 65–65. Selected source; surrounding code omitted.

```typescript
...(selected === undefined
  ? {} : { settingSources: selected }),
```

### 6. Configure memory and private context separately

Source filtering does not control every input. The app explicitly relocates its config/home, disables auto memory and uses strict MCP config. Managed policy still has its own scope.

Source: `src/agent.ts`, lines 34–35. Selected source; surrounding code omitted.

```typescript
env: { ...env,
  HOME: dirs.home, USERPROFILE: dirs.home,
  CLAUDE_CONFIG_DIR: dirs.sdkHome,
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
  ENABLE_CLAUDEAI_MCP_SERVERS: "false"
},
```

### 7. Start the same real task with selected options

The fixed prompt does not contain rule-marker values. The SDK loads the selected filesystem context and owns the model/tool loop.

Source: `src/agent.ts`, lines 100–100. Selected source; surrounding code omitted.

```typescript
const run = query({
  prompt: PROMPTS.task, options
});
```

### 8. Run the loaded filesystem command hook

Only project settings register this trusted SessionStart command. Its actual private trace records harmless merged fixture flags, independent of model prose.

Source: `fixtures/record-hook.cjs`, lines 7–12. Selected source; surrounding code omitted.

```javascript
records.push({
  source: "filesystem command hook",
  event: input.hook_event_name,
  user: process.env.LESSON13_FROM_USER || null,
  project: process.env.LESSON13_FROM_PROJECT || null,
  local: process.env.LESSON13_FROM_LOCAL || null,
});
```

### 9. Run the explicit programmatic callback

The callback passed in code guards the model Read and runs even with []. Filesystem and programmatic hooks are distinct mechanisms in the same session.

Source: `src/agent.ts`, lines 72–73. Selected source; surrounding code omitted.

```typescript
counters.callbacks++;
emit({ type: "callback",
  event: "PreToolUse", source: "programmatic"
});
```

### 10. Block tool reads of instruction files

Only data.md can be read by the model tool. The agent cannot fetch instruction files to imitate source loading. Internal configuration loading is separate from model tool calls.

Source: `src/agent.ts`, lines 59–59. Selected source; surrounding code omitted.

```typescript
return name === "Read"
  && typeof input.file_path === "string"
  && resolve(directories(config).cwd, input.file_path)
    .toLowerCase() === resolve(
      directories(config).cwd, "data.md"
    ).toLowerCase();
```

### 11. Preserve the actual typed result

Store the actual final text and subtype. Marker extraction reflects model compliance; it is not a complete audit of all filesystem or policy inputs.

Source: `src/agent.ts`, lines 110–110. Selected source; surrounding code omitted.

```typescript
resultText = redact(message.subtype === "success"
  ? message.result : message.errors.join("\n"));
```

### 12. Read the private filesystem trace

After closing the query, read the actual hook trace and retain callback count and completed model Read paths. Empty filesystem evidence is kept as an empty trace.

Source: `src/agent.ts`, lines 120–120. Selected source; surrounding code omitted.

```typescript
const filesystemHooks = JSON.parse(await readFile(
  resolve(directories(config).cwd, "hook-evidence.json"),
  "utf8"
));
```

### 13. Format and compare independent observations

Render actual answers through bundled Markdown parsing and sanitization. Keep options, returned markers, hook traces and directory configuration separate.

Source: `src/client.ts`, lines 28–28. Selected source; surrounding code omitted.

```typescript
if (e.type === "answer")
  renderMarkdown($("answer"), e.text);
```

## Boundaries and reference material

- Source locations: project settings/hooks come from cwd/.claude/settings.json. Project CLAUDE.md and rules can load from cwd and parents. user uses the user config area. local includes settings.local.json and CLAUDE.local.md. Parent discovery is described, not separately tested here.
- Instructions are additive: CLAUDE instruction layers can be additive rather than a strict universal priority ladder. These fixtures use non-conflicting rules. A returned marker demonstrates observed compliance; absence alone is not a complete source-loading diagnosis.
- Inputs outside settingSources: Managed host/server policy, global ~/.claude.json, auto memory, authenticated claude.ai connectors and sandbox credential restrictions have separate behavior. This app does not remove or bypass any policy.
- Additional controls: The lab uses a private CLAUDE_CONFIG_DIR and home, disables auto memory, sets strictMcpConfig and disables connector discovery through its environment. No live authenticated connector or managed-policy test is claimed.
- Extensions and hook types: Skills, commands and subagents can be discovered from selected sources. This lab disables skills and plugins. Only a trusted filesystem command hook and programmatic callbacks execute; HTTP, MCP, prompt and agent hooks are reference types.
- Version and deployment scope: The pinned TypeScript SDK uses CLI-like omitted defaults. The deck notes older Python versions had different empty-list behavior; no Python SDK is executed here. Real tenant isolation needs its own filesystem/process/container design and policy review; this classroom path factory is not that proof.

Fresh runs write only owned fixtures under .runtime. The project command hook is a trusted fixed Node script; model Bash is unavailable. The app explicitly controls memory, connector configuration and private paths, but does not claim [] removes all host inputs or establishes secure production tenant isolation. Source selection is not an OS sandbox. Cost is an SDK estimate, not an invoice guarantee. Actual answers render through bundled Markdown parsing and sanitization.

Real .env, dependencies, private runtime files and teaching media are excluded from Git.

## References

- [Filesystem features and source scope](https://code.claude.com/docs/en/agent-sdk/claude-code-features)
- [SDK configuration](https://code.claude.com/docs/en/agent-sdk/configuration)
- [TypeScript reference](https://code.claude.com/docs/en/agent-sdk/typescript)

Optional documentation regeneration: `python scripts/build-pages.py`. The generator checks actual source anchors.
