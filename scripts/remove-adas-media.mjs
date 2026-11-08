import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const bucketName = "course-media";
const root = "adas_items";
const pageSize = 100;

export async function listAdasMedia(bucket) {
  const files = [];
  const folders = [root];
  while (folders.length) {
    const folder = folders.pop();
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await bucket.list(folder, { limit: pageSize, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw new Error(`Bestanden in ${folder} ophalen mislukt: ${error.message}`);
      if (!data) throw new Error(`Geen bestandslijst ontvangen voor ${folder}.`);
      for (const entry of data) {
        if (!entry.name || entry.name.includes("/") || entry.name === "." || entry.name === "..") {
          throw new Error(`Ongeldige bestandsnaam in ${folder}.`);
        }
        const path = `${folder}/${entry.name}`;
        if (entry.id) files.push(path);
        else folders.push(path);
      }
      if (data.length < pageSize) break;
    }
  }
  return files;
}

export async function removeAdasMedia(bucket) {
  const files = await listAdasMedia(bucket);
  for (let index = 0; index < files.length; index += pageSize) {
    const { error } = await bucket.remove(files.slice(index, index + pageSize));
    if (error) throw new Error(`Verwijderen mislukt: ${error.message}`);
  }
  const remaining = await listAdasMedia(bucket);
  if (remaining.length) throw new Error(`${remaining.length} ADAS-bestanden zijn nog aanwezig; voer de opschoning opnieuw uit.`);
  return files.length;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Stel NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in als omgevingsvariabelen.");
  const bucket = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(bucketName);
  if (process.argv[2] !== "--delete") {
    const files = await listAdasMedia(bucket);
    console.log(`${files.length} bestanden gevonden onder ${bucketName}/${root}/. Gebruik --delete om deze definitief te verwijderen.`);
    return;
  }
  console.log(`${await removeAdasMedia(bucket)} ADAS-bestanden definitief verwijderd.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Opschoning mislukt.");
    process.exitCode = 1;
  });
}
