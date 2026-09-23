#!/usr/bin/env node
// Mechanical half of the review-fintrack skill: deterministic checks over the
// lines ADDED since the merge-base with the base branch (committed, staged,
// unstaged and untracked). Only added lines are checked so legacy code never
// floods the report — the review is about what this change introduces.
//
// Usage: node .claude/skills/review-fintrack/check.mjs [base=main]
// Exit code: 1 if any "erro" finding, 0 otherwise.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const base = process.argv[2] ?? "main";
const git = (args) =>
  execSync(`git -c core.safecrlf=false ${args}`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
    maxBuffer: 64 * 1024 * 1024,
  });

const findings = [];
const report = (severity, file, line, rule, message) =>
  findings.push({ severity, file, line, rule, message });

// --- Collect added lines per file -------------------------------------------
const added = new Map(); // file -> [{ line, text }]
const push = (file, line, text) => {
  if (!added.has(file)) added.set(file, []);
  added.get(file).push({ line, text });
};

const diff = git(`diff --merge-base ${base} -U0 --no-color --no-ext-diff`);
let current = null;
let lineNo = 0;
for (const raw of diff.split("\n")) {
  if (raw.startsWith("+++ ")) {
    current = raw === "+++ /dev/null" ? null : raw.slice(6);
  } else if (raw.startsWith("@@")) {
    lineNo = Number(/\+(\d+)/.exec(raw)[1]);
  } else if (current && raw.startsWith("+")) {
    push(current, lineNo++, raw.slice(1).replace(/\r$/, ""));
  }
}
for (const file of git("ls-files --others --exclude-standard").split("\n").filter(Boolean)) {
  readFileSync(file, "utf8")
    .split(/\r?\n/)
    .forEach((text, i) => push(file, i + 1, text));
}

const fileLines = (file) => (existsSync(file) ? readFileSync(file, "utf8").split(/\r?\n/) : []);
const isCode = (f) => /\.(js|jsx|mjs)$/.test(f) && !f.startsWith(".claude/");
const isComment = (t) => /^\s*(\/\/|\*|\/\*)/.test(t);
const PT_WORDS = new Set(
  "de da do das dos que não para com uma os é são se na pelo pela quando também porque".split(" ")
);
// Score = distinct PT stopwords + accented words. Needs >= 2, so a lone quoted
// data value ("Alimentação 615 (88% of ...") doesn't count as a PT comment.
const ptWords = (t) =>
  new Set(
    t
      .toLowerCase()
      .split(/[^a-zà-ú]+/)
      .filter((w) => PT_WORDS.has(w) || /[ãõçáéíóúâêô]/.test(w))
  ).size;
const changedFiles = [...added.keys()];

// --- Line checks ---------------------------------------------------------------
for (const [file, lines] of added) {
  if (!isCode(file)) continue;
  const all = fileLines(file);
  const isService = /backend\/src\/modules\/.+\.service\.js$/.test(file);
  const isController = /\.controller\.js$/.test(file);
  const inBackendSrc = file.startsWith("backend/src/");

  for (const { line, text } of lines) {
    const code = text.replace(/\/\/.*$/, "");

    if (isService) {
      // Ownership: every multi-row/lookup query must be scoped by userId.
      // prisma.user is exempt: the User row IS the identity (looked up by
      // id = req.userId or by e-mail), there's no userId column to scope by.
      // The window looks backwards too, since `where` is often prebuilt
      // (e.g. buildTransactionWhere(userId, filters)).
      if (
        /prisma\.(?!user\.)\w+\.(findFirst|findMany|findUnique|count|aggregate|groupBy|updateMany|deleteMany)\(/.test(
          code
        )
      ) {
        const window = all.slice(Math.max(0, line - 13), line + 5).join(" ");
        if (!/userId/.test(window))
          report(
            "erro",
            file,
            line,
            "ownership",
            "Query Prisma sem `userId` no `where` — escopar por usuário (backend/CLAUDE.md: padrão de ownership)."
          );
      }
      // update/delete by id must come after findOwned<X>() in the same function.
      if (/prisma\.(?!user\.)\w+\.(update|delete)\(/.test(code)) {
        const before = all.slice(Math.max(0, line - 8), line - 1).join(" ");
        if (!/findOwned\w+\(/.test(before))
          report(
            "aviso",
            file,
            line,
            "ownership",
            "`update`/`delete` sem `findOwned<Recurso>()` antes — confirme que o recurso pertence ao usuário (404, nunca 403)."
          );
      }
      if (/\bres\.\w+/.test(code))
        report(
          "erro",
          file,
          line,
          "camadas",
          "`res.` dentro de service — service lança `AppError`, quem responde HTTP é o controller."
        );
    }

    if (isController && /\bprisma\b/.test(code))
      report(
        "erro",
        file,
        line,
        "camadas",
        "Prisma no controller — acesso a dados fica no service."
      );

    // Dates: stored as UTC midnight; local getters shift the day in UTC-3.
    if (
      /\.(getMonth|getFullYear|getDate|getDay|setMonth|setFullYear|setDate)\(|toLocaleDateString\(/.test(
        code
      )
    ) {
      if (inBackendSrc)
        report(
          "erro",
          file,
          line,
          "datas-utc",
          "Getter/setter de data local no backend — use a versão UTC (`getUTCMonth()` etc.). Ver backend/CLAUDE.md."
        );
      else if (file.startsWith("frontend/src/") && !/UTC/i.test(code))
        report(
          "aviso",
          file,
          line,
          "datas-utc",
          'Data lida em horário local no frontend — datas do backend são meia-noite UTC; confirme que não desloca um dia (ex.: `timeZone: "UTC"`).'
        );
    }

    if (
      /\bconsole\.(log|error|warn|info|debug)\(/.test(code) &&
      !/(errorHandler|server)\.js$/.test(file) &&
      !file.startsWith("backend/scripts/")
    )
      report(
        "aviso",
        file,
        line,
        "logs",
        "`console.*` fora do `errorHandler`/`server.js` — remova ou justifique."
      );

    if (inBackendSrc || file.startsWith("backend/tests/")) {
      const imp = /from\s+["'](\.{1,2}\/[^"']+)["']/.exec(code);
      if (imp && !/\.(js|json)$/.test(imp[1]))
        report(
          "erro",
          file,
          line,
          "esm",
          `Import relativo sem extensão (\`${imp[1]}\`) — Node ESM exige \`.js\`.`
        );
    }

    if (/\b(TODO|FIXME|XXX)\b/.test(text))
      report(
        "aviso",
        file,
        line,
        "comentarios",
        "TODO/FIXME no código — pendência vira GitHub Issue."
      );

    // Language layer: comments are English. Needs 2+ PT signals (see ptWords),
    // never a single accent — comments legitimately quote PT UI strings/data.
    // An odd number of `"` means the line starts mid-quote (continued from the
    // previous comment line): drop that tail before stripping quoted pairs.
    const unquoted = (
      (text.match(/"/g) ?? []).length % 2 ? text.replace(/^[^"]*"/, "") : text
    ).replace(/(["'`]).*?\1/g, "");
    if (isComment(text) && ptWords(unquoted) >= 2)
      report(
        "aviso",
        file,
        line,
        "idioma",
        "Comentário parece estar em português — comentários de código são em inglês (CLAUDE.md: idioma por camada)."
      );
  }
}

// --- File/structure checks -----------------------------------------------------
// Static sub-routes must be registered before "/:id" (Express would read them as an id).
for (const file of changedFiles.filter((f) => /\.routes\.js$/.test(f))) {
  const seenParam = new Set();
  fileLines(file).forEach((text, i) => {
    const m = /router\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)/.exec(text);
    if (!m) return;
    const [, verb, path] = m;
    if (path.includes("/:")) seenParam.add(verb);
    else if (path !== "/" && seenParam.has(verb))
      report(
        "erro",
        file,
        i + 1,
        "ordem-rotas",
        `\`${verb.toUpperCase()} ${path}\` registrada depois de uma rota com parâmetro — mova para antes de \`/:id\`.`
      );
  });
}

// A new Prisma model must be wiped by resetDb(), or integration tests leak data.
if (added.has("backend/prisma/schema.prisma")) {
  const resetDb = fileLines("backend/tests/setup/db.js").join("\n");
  for (const { line, text } of added.get("backend/prisma/schema.prisma")) {
    const m = /^\s*model\s+(\w+)/.exec(text);
    if (!m) continue;
    const delegate = m[1][0].toLowerCase() + m[1].slice(1);
    if (!resetDb.includes(`prisma.${delegate}.deleteMany`))
      report(
        "erro",
        "backend/prisma/schema.prisma",
        line,
        "testes",
        `Model \`${m[1]}\` novo não está no \`resetDb()\` de backend/tests/setup/db.js.`
      );
  }
}

// A new backend module must be mounted, tested and documented.
const newModules = new Set(
  changedFiles
    .map((f) => /^backend\/src\/modules\/([^/]+)\/\1\.routes\.js$/.exec(f)?.[1])
    .filter(Boolean)
    .filter((m) => !git(`ls-tree --name-only ${base} backend/src/modules/`).includes(m))
);
for (const mod of newModules) {
  if (!readFileSync("backend/src/app.js", "utf8").includes(`./modules/${mod}/${mod}.routes.js`))
    report(
      "erro",
      "backend/src/app.js",
      1,
      "modulo",
      `Módulo \`${mod}\` não está montado no app.js.`
    );
  if (!existsSync(`backend/tests/integration/${mod}.routes.test.js`))
    report(
      "erro",
      `backend/src/modules/${mod}`,
      1,
      "testes",
      `Módulo \`${mod}\` sem backend/tests/integration/${mod}.routes.test.js.`
    );
  if (!readFileSync("backend/CLAUDE.md", "utf8").includes(`\`${mod}\``))
    report(
      "aviso",
      "backend/CLAUDE.md",
      1,
      "doc-viva",
      `Módulo \`${mod}\` não aparece em "Módulos atuais".`
    );
}

// Behavior change without any test change.
const touches = (re) => changedFiles.some((f) => re.test(f));
if (touches(/^backend\/src\//) && !touches(/^backend\/tests\//))
  report(
    "aviso",
    "backend/src",
    0,
    "testes",
    "Código do backend mudou sem nenhuma mudança em backend/tests — há comportamento novo sem teste?"
  );

// --- Output ------------------------------------------------------------------
const order = { erro: 0, aviso: 1 };
findings.sort(
  (a, b) => order[a.severity] - order[b.severity] || a.file.localeCompare(b.file) || a.line - b.line
);
console.log(`review-fintrack: ${changedFiles.length} arquivo(s) alterado(s) desde ${base}`);
if (findings.length === 0) console.log("Nenhum achado mecânico.");
for (const f of findings)
  console.log(`[${f.severity}] ${f.file}${f.line ? `:${f.line}` : ""} (${f.rule}) ${f.message}`);
const errors = findings.filter((f) => f.severity === "erro").length;
console.log(`\n${errors} erro(s), ${findings.length - errors} aviso(s)`);
process.exit(errors > 0 ? 1 : 0);
