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
