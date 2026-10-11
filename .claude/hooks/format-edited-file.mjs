// PostToolUse hook (Edit/Write): formats the file Claude just edited, so the diff never
// depends on the CI `format:check` catching it later. Same scope as `npm run format`.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const FORMATTED_EXTENSIONS = new Set([".js", ".jsx", ".mjs"]);

const input = JSON.parse(readFileSync(0, "utf8"));
const filePath = input.tool_input?.file_path;
const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;

if (!filePath || !FORMATTED_EXTENSIONS.has(path.extname(filePath))) process.exit(0);

const relative = path.relative(projectDir, path.resolve(projectDir, filePath));
if (relative.startsWith("..") || path.isAbsolute(relative)) process.exit(0);

// Runs the CLI through `node` instead of node_modules/.bin, whose shims differ on Windows.
const prettierCli = path.join(projectDir, "node_modules", "prettier", "bin", "prettier.cjs");
if (!existsSync(prettierCli)) {
  // Exit 2 on PostToolUse doesn't undo the edit; it only shows stderr to Claude.
  console.error("Prettier não encontrado: rode `npm install` na raiz do repo para formatar.");
  process.exit(2);
}

// cwd = repo root so .prettierrc.json and .prettierignore apply exactly as in `npm run format`.
const result = spawnSync(
  process.execPath,
  [prettierCli, "--write", "--no-color", "--log-level", "warn", relative],
  {
    cwd: projectDir,
    encoding: "utf8",
  }
);

if (result.status !== 0) {
  console.error(`Prettier falhou em ${relative} (provável erro de sintaxe):\n${result.stderr}`);
  process.exit(2);
}
