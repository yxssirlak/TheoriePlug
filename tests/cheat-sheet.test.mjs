import { test } from "node:test";
import assert from "node:assert/strict";
import { moveBlock, newBlock } from "../src/lib/cheat-sheet.ts";

test("blokken kunnen in beide richtingen worden verplaatst zonder de originele lijst te wijzigen", () => {
  const blocks = [newBlock("text"), newBlock("image"), newBlock("reveal")];
  assert.deepEqual(moveBlock(blocks, 0, 2).map((block) => block.id), [blocks[1].id, blocks[2].id, blocks[0].id]);
  assert.deepEqual(moveBlock(blocks, 2, 0).map((block) => block.id), [blocks[2].id, blocks[0].id, blocks[1].id]);
  assert.equal(blocks[0].type, "text");
  assert.deepEqual(moveBlock(blocks, -1, 2), blocks);
  assert.deepEqual(moveBlock(blocks, 0, 3), blocks);
});
