export type Mode = "project" | "none" | "combined" | "defaults" | "tenant";
export type RunConfig = { mode: Mode; tenant: "alpha" | "beta" };
export type LabEvent =
  | { type: "options"; config: RunConfig; options: Record<string, unknown> }
  | { type: "fixtures"; files: { name: string; contents: string }[] }
  | { type: "initialized"; model: string; sessionId: string; outputStyle: string }
  | { type: "message"; sdkType: string; summary: string }
  | { type: "callback"; event: string; source: "programmatic" }
  | { type: "tool"; name: string; target: string }
  | { type: "answer"; text: string }
  | { type: "result"; status: string; text: string; sessionId: string; costUsd: number }
  | { type: "evidence"; returnedMarkers: string[]; filesystemHooks: Record<string, unknown>[]; callbackCount: number; readPaths: string[] }
  | { type: "notice" | "error"; text: string };
