import test from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "../../lib/csv.js";

const columns = [
  { key: "name", label: "Name" },
  { key: "note", label: "Note" },
];

test("toCsv writes a header and quotes cells that need it", () => {
  const csv = toCsv(columns, [{ name: "Cat, dog", note: 'He said "hi"' }]);
  assert.equal(csv, 'Name,Note\r\n"Cat, dog","He said ""hi"""\r\n');
});

test("toCsv neutralises spreadsheet formulas and keeps numbers and nulls", () => {
  const csv = toCsv(columns, [{ name: "=SUM(A1)", note: null }, { name: 5, note: -3 }]);
  assert.equal(csv, "Name,Note\r\n'=SUM(A1),\r\n5,-3\r\n");
});
