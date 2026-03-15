import path from "node:path";
import ts from "typescript";

function formatDiagnostics(diags) {
  return ts.formatDiagnosticsWithColorAndContext(diags, {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => "\n",
  });
}

const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json");
if (!configPath) {
  console.error("No tsconfig.json found.");
  process.exit(2);
}

const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) {
  console.error(formatDiagnostics([configFile.error]));
  process.exit(1);
}

const parsed = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  path.dirname(configPath),
  { noEmit: true },
  configPath
);

const program = ts.createProgram({
  rootNames: parsed.fileNames,
  options: parsed.options,
  projectReferences: parsed.projectReferences,
});

const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(formatDiagnostics(diagnostics));
  process.exit(1);
}

console.log("TypeScript OK");
