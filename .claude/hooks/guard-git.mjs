// PreToolUse hook (Bash): enforces the AGENTS.md rules that a push to `main` deploys straight
// to production (Vercel + Railway) and that hooks/checks are never skipped. Exit 2 blocks the
// command and shows stderr to Claude.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PROTECTED_BRANCH = "main";

const input = JSON.parse(readFileSync(0, "utf8"));
const command = input.tool_input?.command ?? "";
const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR;

// Quoted text is data (commit messages, PR bodies), not flags — "--no-verify" inside a
// commit message must not block the commit.
const unquoted = command.replace(/"(?:[^"\\]|\\.)*"/gs, '""').replace(/'[^']*'/gs, "''");
const segments = unquoted.split(/&&|\|\||;|\||\n/).map((segment) => segment.trim());

const block = (reason) => {
  console.error(`Bloqueado pelo hook guard-git: ${reason}`);
  process.exit(2);
};

const currentBranch = () => {
  try {
    return execFileSync("git", ["branch", "--show-current"], { cwd, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};

const targetsProtectedBranch = (refspec) => {
  const destination = refspec.replace(/^\+/, "").split(":").pop();
  const branch = destination === "HEAD" ? currentBranch() : destination;
  return branch === PROTECTED_BRANCH || branch === `refs/heads/${PROTECTED_BRANCH}`;
};

for (const segment of segments) {
  const git = segment.match(/\bgit\s+(?:-C\s+\S+\s+)?(\w[\w-]*)(.*)$/);
  if (!git) continue;
  const [, subcommand, rest] = git;
  const args = rest.trim().split(/\s+/).filter(Boolean);

  if (args.includes("--no-verify") || (subcommand === "commit" && args.includes("-n"))) {
    block(
      "--no-verify pula os hooks/checks do git. Investigue a causa raiz do que está falhando em vez de contornar (AGENTS.md)."
    );
  }

  if (subcommand !== "push") continue;

  if (args.includes("--all") || args.includes("--mirror")) {
    block(`git push --all/--mirror inclui a \`${PROTECTED_BRANCH}\`, que faz deploy em produção.`);
  }

  // First positional is the remote; the rest are refspecs. No refspec = current branch.
  const positionals = args.filter((arg) => !arg.startsWith("-"));
  const refspecs = positionals.slice(1);
  const pushesProtected =
    refspecs.length === 0
      ? currentBranch() === PROTECTED_BRANCH
      : refspecs.some(targetsProtectedBranch);

  if (pushesProtected) {
    block(
      `push para a \`${PROTECTED_BRANCH}\` vai direto para produção. Use uma branch \`<tipo>/<issue>-<slug>\` e um PR (skills start-issue → ship-pr).`
    );
  }
}
