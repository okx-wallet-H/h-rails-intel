import { execFileSync } from "node:child_process";

export function runOnchainos(args) {
  const output = execFileSync("onchainos", args, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  const parsed = JSON.parse(output);
  if (!parsed.ok) throw new Error(output);
  return parsed.data;
}