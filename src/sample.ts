import { runAgent, DEFAULT_CONFIG } from "./agent.js";
import type { Mode } from "./protocol.js";
await runAgent({ mode: (process.argv[2] || DEFAULT_CONFIG.mode) as Mode, tenant: process.argv[3] === "beta" ? "beta" : "alpha" }, event => {
  console.log(JSON.stringify(event));
  if (event.type === "result" && event.status !== "success") process.exitCode = 1;
});
