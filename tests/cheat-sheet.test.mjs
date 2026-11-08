import { test } from "node:test";
import assert from "node:assert/strict";
import { assignBlockColumns, blocksByColumn, legacySheetRows, moveBlock, moveBlockToColumn, moveSheetBlock, newBlock, removeLastBlockColumn, setSheetRowColumns, sheetBlockSections } from "../src/lib/cheat-sheet.ts";

test("blokken kunnen in beide richtingen worden verplaatst zonder de originele lijst te wijzigen", () => {
  const blocks = [newBlock("text"), newBlock("image"), newBlock("reveal")];
  assert.deepEqual(moveBlock(blocks, 0, 2).map((block) => block.id), [blocks[1].id, blocks[2].id, blocks[0].id]);
  assert.deepEqual(moveBlock(blocks, 2, 0).map((block) => block.id), [blocks[2].id, blocks[0].id, blocks[1].id]);
  assert.equal(blocks[0].type, "text");
  assert.deepEqual(moveBlock(blocks, -1, 2), blocks);
  assert.deepEqual(moveBlock(blocks, 0, 3), blocks);
});

test("oude blokken krijgen kolommen zonder brede blokken of de oorspronkelijke gegevens te verliezen", () => {
  const blocks = [newBlock("text"), newBlock("image"), { ...newBlock("callout"), width: "full" }, newBlock("reveal")];
  const assigned = assignBlockColumns(blocks, 2);
  assert.deepEqual(assigned.map((block) => block.column), [0, 1, undefined, 0]);
  assert.equal(assigned[2].width, "full");
  assert.equal(blocks[0].column, undefined);
  assert.deepEqual(sheetBlockSections(assigned).map((section) => section.kind), ["columns", "full", "columns"]);
});

test("blokken kunnen tussen kolommen en binnen een kolom worden versleept", () => {
  const [a, b, c] = assignBlockColumns([newBlock("text"), newBlock("image"), newBlock("callout")], 2);
  const moved = moveBlockToColumn([a, b, c], a.id, 1, b.id);
  assert.deepEqual(blocksByColumn(moved, 2).map((column) => column.map((block) => block.id)), [[c.id], [a.id, b.id]]);
  const reordered = moveBlockToColumn(moved, a.id, 1);
  assert.deepEqual(blocksByColumn(reordered, 2)[1].map((block) => block.id), [b.id, a.id]);
  assert.equal(a.column, 0);
});

test("een blok kan voor een bestaand breed blok naar een kolom worden verplaatst", () => {
  const a = { ...newBlock("text"), column: 0 };
  const wide = { ...newBlock("callout"), width: "full" };
  const b = { ...newBlock("image"), column: 1 };
  const moved = moveBlockToColumn([a, wide, b], b.id, 1, wide.id);
  assert.deepEqual(moved.map((block) => block.id), [a.id, b.id, wide.id]);
  assert.deepEqual(sheetBlockSections(moved).map((section) => section.kind), ["columns", "full"]);
});

test("een verwijderde kolom verplaatst kaarten zonder inhoud te verwijderen", () => {
  const blocks = [newBlock("text"), newBlock("image"), newBlock("reveal"), { ...newBlock("callout"), width: "full" }];
  const remaining = removeLastBlockColumn(blocks, 3);
  assert.deepEqual(remaining.map((block) => block.id), blocks.map((block) => block.id));
  assert.deepEqual(remaining.map((block) => block.column), [0, 1, 1, undefined]);
  assert.equal(remaining[3].width, "full");
  assert.equal(removeLastBlockColumn(blocks, 1), blocks);
});

test("oude pagina met brede blokken behoudt volgorde en inhoud in afzonderlijke rijen", () => {
  const blocks = [newBlock("text"), newBlock("image"), { ...newBlock("callout"), width: "full" }, newBlock("reveal")];
  let id = 0;
  const layout = legacySheetRows(blocks, 2, () => `rij-${++id}`);
  assert.deepEqual(layout.rows.map((row) => row.columns), [2, 1, 2]);
  assert.deepEqual(layout.blocks.map((block) => [block.id, block.row_id, block.column]), [
    [blocks[0].id, "rij-1", 0], [blocks[1].id, "rij-1", 1],
    [blocks[2].id, "rij-2", 0], [blocks[3].id, "rij-3", 0],
  ]);
  assert.equal(blocks[2].width, "full");
});

test("rijen hebben onafhankelijke aantallen kolommen en behouden blokken bij verkleinen", () => {
  const rows = [{ id: "a", columns: 3 }, { id: "b", columns: 2 }];
  const blocks = [{ ...newBlock("text"), row_id: "a", column: 2 }, { ...newBlock("image"), row_id: "b", column: 1 }];
  const updated = setSheetRowColumns(rows, blocks, "a", 1);
  assert.deepEqual(updated.rows.map((row) => row.columns), [1, 2]);
  assert.deepEqual(updated.blocks.map((block) => block.column), [0, 1]);
  assert.deepEqual(updated.blocks.map((block) => block.id), blocks.map((block) => block.id));
  assert.equal(blocks[0].column, 2);
  assert.equal(setSheetRowColumns(rows, blocks, "a", 4).rows, rows);
});

test("blokken kunnen naar een andere rij en voor een doelblok worden verplaatst", () => {
  const a = { ...newBlock("text"), row_id: "a", column: 0 };
  const b = { ...newBlock("image"), row_id: "b", column: 1 };
  const moved = moveSheetBlock([a, b], a.id, "b", 1, b.id);
  assert.deepEqual(moved.map((block) => block.id), [a.id, b.id]);
  assert.equal(moved[0].row_id, "b");
  assert.equal(moved[0].column, 1);
  assert.equal(a.row_id, "a");
});

test("een lege pagina krijgt een blijvende bewerkbare rij", () => {
  const layout = legacySheetRows([], 2, () => "leeg");
  assert.deepEqual(layout, { rows: [{ id: "leeg", columns: 2 }], blocks: [] });
});
