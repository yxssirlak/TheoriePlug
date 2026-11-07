import { test } from "node:test";
import assert from "node:assert/strict";
import { availableCards, cardsForCategory, completedCategoryIds, fetchAllPages, nextQueue, shuffleCards, updateCardSelection } from "../src/lib/flashcards.ts";

test("bulkselectie behoudt verborgen kaarten en verwijdert alleen zichtbare selectie", () => {
  const original = new Set(["verborgen"]);
  const selected = updateCardSelection(original, ["een", "twee"], true);
  assert.deepEqual([...selected], ["verborgen", "een", "twee"]);
  assert.deepEqual([...updateCardSelection(selected, ["een", "twee"], false)], ["verborgen"]);
  assert.deepEqual([...original], ["verborgen"]);
});

test("alle kaarten en onderwerpfilter selecteren de juiste kaarten", () => {
  const cards = [{ id: "a", category_id: "one" }, { id: "b", category_id: "two" }];
  assert.deepEqual(cardsForCategory(cards, null), cards);
  assert.deepEqual(cardsForCategory(cards, "one"), [cards[0]]);
  assert.deepEqual(cardsForCategory(cards, "empty"), []);
});

test("alleen onderwerpen met uitsluitend beheerste kaarten zijn afgerond", () => {
  const cards = [
    { id: "a", category_id: "one" }, { id: "b", category_id: "one" },
    { id: "c", category_id: "two" },
  ];
  const progress = { a: "mastered", b: "mastered", c: "doubt" };
  const completed = completedCategoryIds(cards, progress);
  assert.deepEqual([...completed], ["one"]);
  assert.deepEqual(availableCards(cards, completed), [cards[2]]);
  assert.deepEqual([...completedCategoryIds([...cards, { id: "new", category_id: "one" }], progress)], []);
  assert.deepEqual([...completedCategoryIds([], progress)], []);
  assert.deepEqual([...completedCategoryIds(cards, { ...progress, c: "mastered" })].sort(), ["one", "two"]);
  assert.deepEqual([...completedCategoryIds(cards, { b: "mastered", c: "doubt" })], []);
});

test("lastige kaarten komen achteraan en twijfel komt later", () => {
  assert.deepEqual(nextQueue(["a", "b", "c", "d", "e"], "hard"), ["b", "c", "d", "e", "a"]);
  assert.deepEqual(nextQueue(["a", "b", "c", "d", "e"], "doubt"), ["b", "c", "a", "d", "e"]);
  assert.deepEqual(nextQueue(["a", "b"], "doubt"), ["b", "a"]);
  assert.deepEqual(nextQueue(["a"], "doubt"), ["a"]);
  assert.deepEqual(nextQueue(["a"], "hard"), ["a"]);
});

test("beheerst verwijdert alleen de huidige kaart uit de sessie", () => {
  assert.deepEqual(nextQueue(["a", "b"], "mastered"), ["b"]);
  assert.deepEqual(nextQueue(["a"], "mastered"), []);
  assert.deepEqual(nextQueue([], "mastered"), []);
});

test("husselen behoudt alle kaarten en verandert de oorspronkelijke lijst niet", () => {
  const cards = ["a", "b", "c", "d"];
  const shuffled = shuffleCards(cards, () => 0);
  assert.deepEqual(shuffled, ["b", "c", "d", "a"]);
  assert.deepEqual(cards, ["a", "b", "c", "d"]);
});

test("haalt alle pagina's op, ook bij een lagere serverlimiet, en meldt fouten", async () => {
  const rows = [1, 2, 3, 4, 5];
  assert.deepEqual(await fetchAllPages(async (from) => ({ data: rows.slice(from, from + 2), error: null })), rows);
  await assert.rejects(fetchAllPages(async () => ({ data: null, error: { message: "databasefout" } })), /databasefout/);
});
