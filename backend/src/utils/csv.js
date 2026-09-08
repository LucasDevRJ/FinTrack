// Minimal RFC 4180-ish CSV serializer. Uses ";" as the delimiter and
// prefixes a UTF-8 BOM so the file opens correctly — with columns split
// right and accented characters intact — when double-clicked in
// Brazilian-locale Excel, which treats "," as the decimal separator
// rather than a field delimiter (a plain comma-delimited CSV would land
// as one unsplit column there).
const DELIMITER = ";";
const BOM = "﻿";

function escapeField(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(DELIMITER) || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers, rows) {
  const lines = [headers.map(escapeField).join(DELIMITER)];
  for (const row of rows) {
    lines.push(row.map(escapeField).join(DELIMITER));
  }
  return BOM + lines.join("\r\n");
}

// Reverse of toCsv above: a small hand-rolled state machine rather than a
// naive split(";")/split("\n"), because a quoted field can itself contain
// the delimiter, a literal quote (escaped as "") or an embedded newline —
// all of which a plain split would break on. Strips the same BOM toCsv
// prefixes files with, and tolerates both "\r\n" and "\n" line endings so a
// CSV re-saved by a non-Windows tool still parses. Returns every row
// (including the header) as an array of raw string fields — callers decide
// what to do with the header row.
export function parseCsv(text) {
  const content = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === DELIMITER) {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // Swallowed here; the paired "\n" (or its absence, for a lone "\r")
      // is what actually ends the row below.
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // No trailing newline on the last line — flush whatever's left, but only
  // if there's actually something there (avoids a phantom empty row when
  // the file does end cleanly with a newline).
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Blank lines (common at the end of a file someone hand-edited) parse as
  // a single empty field — drop those rather than surfacing them as
  // "wrong number of columns" errors downstream.
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
