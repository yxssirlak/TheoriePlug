export type SheetBlockType = "text" | "image" | "reveal" | "callout";
export type SheetBlock = {
  id: string;
  type: SheetBlockType;
  title: string;
  body: string;
  image_path: string;
  image_alt: string;
  width: "normal" | "full";
  image_fit: "cover" | "contain";
};

export type SheetPage = {
  id: string;
  title: string;
  subtitle: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  header_text_color: string;
  columns: number;
  blocks: SheetBlock[];
  sort_order: number;
  is_published: boolean;
  created_at: string;
};

export const SHEET_BUCKET = "cheat-sheet-media";

export function newBlock(type: SheetBlockType): SheetBlock {
  return {
    id: crypto.randomUUID(), type, title: "", body: "", image_path: "",
    image_alt: "", width: "normal", image_fit: "cover",
  };
}

export function moveBlock(blocks: SheetBlock[], from: number, to: number): SheetBlock[] {
  if (from < 0 || to < 0 || from >= blocks.length || to >= blocks.length || from === to) return blocks;
  const result = [...blocks];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}
