import fs from "node:fs";
import path from "node:path";

function safeUnlink(filePath) {
  try {
    fs.unlinkSync(filePath);
    console.log(`[postinstall] Removed Windows-incompatible shim: ${filePath}`);
  } catch {
    // ignore
  }
}

if (process.platform !== "win32") {
  process.exit(0);
}

const projectRoot = process.cwd();
const binDir = path.join(projectRoot, "node_modules", ".bin");
const tscShim = path.join(binDir, "tsc");
const tscPs1 = path.join(binDir, "tsc.ps1");

try {
  const contents = fs.readFileSync(tscShim, "utf8");
  // The TypeScript package ships a Unix shell shim named `tsc` that breaks on Windows when
  // spawned without a shell. Keeping `tsc.cmd` is enough.
  if (contents.startsWith("#!/bin/sh")) {
    safeUnlink(tscShim);
  }
} catch {
  // ignore
}

// PowerShell shims can be blocked by ExecutionPolicy, causing `spawn('tsc')` to fail with EPERM.
// Keeping `tsc.cmd` is sufficient.
safeUnlink(tscPs1);
