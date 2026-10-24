// Trusted classroom command hook; writes only beside this copied script.
const fs = require("node:fs");
const path = require("node:path");
const input = JSON.parse(fs.readFileSync(0, "utf8"));
const target = path.join(__dirname, "hook-evidence.json");
const records = JSON.parse(fs.readFileSync(target, "utf8"));
records.push({
  source: "filesystem command hook",
  event: input.hook_event_name,
  user: process.env.LESSON13_FROM_USER || null,
  project: process.env.LESSON13_FROM_PROJECT || null,
  local: process.env.LESSON13_FROM_LOCAL || null,
});
fs.writeFileSync(target, JSON.stringify(records, null, 2));
