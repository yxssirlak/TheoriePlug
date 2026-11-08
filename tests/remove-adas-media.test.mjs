import { test } from "node:test";
import assert from "node:assert/strict";
import { listAdasMedia, removeAdasMedia } from "../scripts/remove-adas-media.mjs";

function fakeBucket(initial) {
  const paths = new Set(initial);
  return {
    paths,
    async list(folder, { limit, offset }) {
      const entries = new Map();
      for (const path of paths) {
        if (!path.startsWith(`${folder}/`)) continue;
        const [name, ...rest] = path.slice(folder.length + 1).split("/");
        entries.set(name, { name, id: rest.length ? null : name });
      }
      return { data: [...entries.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(offset, offset + limit), error: null };
    },
    async remove(files) {
      files.forEach((file) => paths.delete(file));
      return { error: null };
    },
  };
}

test("vindt en verwijdert uitsluitend ADAS-uploads, inclusief submappen en meerdere pagina's", async () => {
  const images = Array.from({ length: 205 }, (_, i) => `adas_items/item-${i}/image.png`);
  const bucket = fakeBucket([...images, "flashcards/keep.png", "adas_items-other/keep.png"]);
  assert.equal((await listAdasMedia(bucket)).length, 205);
  assert.equal(await removeAdasMedia(bucket), 205);
  assert.deepEqual([...bucket.paths].sort(), ["adas_items-other/keep.png", "flashcards/keep.png"]);
});

test("rapporteert opslagfouten en onvolledige verwijdering", async () => {
  await assert.rejects(listAdasMedia({ list: async () => ({ error: { message: "geen toegang" } }) }), /geen toegang/);
  const bucket = fakeBucket(["adas_items/item/image.png"]);
  bucket.remove = async () => ({ error: null });
  await assert.rejects(removeAdasMedia(bucket), /nog aanwezig/);
});
