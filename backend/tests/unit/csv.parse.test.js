// Pure-logic unit tests for parseCsv — no DB. Covers the round-trip with
// toCsv (BOM + ";" delimiter + quoted-field escaping) plus the edge cases a
// hand-rolled parser is most likely to get wrong: quoted fields containing
// the delimiter/quotes/newlines, CRLF vs LF line endings, and a missing
// trailing newline.
import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "../../src/utils/csv.js";

describe("parseCsv", () => {
  it("round-trips what toCsv produces, BOM included", () => {
    const csv = toCsv(
      ["Data", "Tipo", "Categoria", "Descrição", "Valor"],
      [["2026-08-15", "Despesa", "Alimentação", "Supermercado", "99,90"]]
    );

    expect(parseCsv(csv)).toEqual([
      ["Data", "Tipo", "Categoria", "Descrição", "Valor"],
      ["2026-08-15", "Despesa", "Alimentação", "Supermercado", "99,90"],
    ]);
  });

  it("unescapes a quoted field containing the delimiter and a literal quote", () => {
    const csv = 'a;"b;c";"say ""hi"""\n';
    expect(parseCsv(csv)).toEqual([["a", "b;c", 'say "hi"']]);
  });

  it("handles a quoted field containing an embedded newline", () => {
    const csv = 'a;"line1\nline2";c\n';
    expect(parseCsv(csv)).toEqual([["a", "line1\nline2", "c"]]);
  });

  it("accepts both CRLF and LF line endings in the same file", () => {
    const csv = "a;b\r\nc;d\ne;f";
    expect(parseCsv(csv)).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f"],
    ]);
  });

  it("parses the last row even without a trailing newline", () => {
    expect(parseCsv("a;b")).toEqual([["a", "b"]]);
  });

  it("drops blank trailing lines instead of surfacing them as a row", () => {
    expect(parseCsv("a;b\n\n")).toEqual([["a", "b"]]);
  });
});
