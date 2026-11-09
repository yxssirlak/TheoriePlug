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
  column?: number;
  row_id?: string;
};

export type SheetRow = { id: string; columns: number };

export type SheetPage = {
  id: string;
  title: string;
  chapter_number: number | null;
  subtitle: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  header_text_color: string;
  columns: number;
  blocks: SheetBlock[];
  sheet_rows: SheetRow[] | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
};

export const SHEET_BUCKET = "cheat-sheet-media";
export const LAST_EDITED_SHEET_KEY = "theorieplug:last-edited-cheat-sheet";

export function lastEditedSheet<T extends { id: string; created_at: string }>(pages: T[], lastEditedId: string | null): T | null {
  return pages.find((page) => page.id === lastEditedId)
    ?? pages.reduce<T | null>((latest, page) => !latest || page.created_at > latest.created_at ? page : latest, null);
}

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

export function blocksByColumn(blocks: SheetBlock[], columns: number): SheetBlock[][] {
  const grouped: SheetBlock[][] = Array.from({ length: columns }, () => []);
  let nextColumn = 0;
  for (const block of blocks) {
    const column = Number.isInteger(block.column) && block.column! >= 0 && block.column! < columns ? block.column! : nextColumn;
    grouped[column].push(block);
    nextColumn = (nextColumn + 1) % columns;
  }
  return grouped;
}

export function sheetBlockSections(blocks: SheetBlock[]): ({ kind: "columns"; blocks: SheetBlock[] } | { kind: "full"; block: SheetBlock })[] {
  const sections: ({ kind: "columns"; blocks: SheetBlock[] } | { kind: "full"; block: SheetBlock })[] = [];
  let current: SheetBlock[] = [];
  for (const block of blocks) {
    if (block.width === "full") {
      if (current.length) sections.push({ kind: "columns", blocks: current });
      sections.push({ kind: "full", block });
      current = [];
    } else {
      current.push(block);
    }
  }
  if (current.length) sections.push({ kind: "columns", blocks: current });
  return sections;
}

export function assignBlockColumns(blocks: SheetBlock[], columns: number): SheetBlock[] {
  let nextColumn = 0;
  return blocks.map((block) => {
    if (block.width === "full") {
      nextColumn = 0;
      return block;
    }
    const column = Number.isInteger(block.column) && block.column! >= 0 && block.column! < columns ? block.column! : nextColumn;
    nextColumn = (nextColumn + 1) % columns;
    return { ...block, column };
  });
}

export function removeLastBlockColumn(blocks: SheetBlock[], columns: number): SheetBlock[] {
  if (columns <= 1) return blocks;
  return assignBlockColumns(blocks, columns).map((block) =>
    block.width === "full" ? block : { ...block, column: Math.min(block.column ?? 0, columns - 2) },
  );
}

export function moveBlockToColumn(blocks: SheetBlock[], blockId: string, column: number, beforeId?: string): SheetBlock[] {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return blocks;
  const remaining = blocks.filter((item) => item.id !== blockId);
  const target = beforeId ? remaining.findIndex((item) => item.id === beforeId) : -1;
  remaining.splice(target < 0 ? remaining.length : target, 0, { ...block, width: "normal", column });
  return remaining;
}

export function legacySheetRows(blocks: SheetBlock[], columns: number, makeId: () => string = () => crypto.randomUUID()): { rows: SheetRow[]; blocks: SheetBlock[] } {
  const rows: SheetRow[] = [];
  const result: SheetBlock[] = [];
  const explicitColumns = blocks.some((block) => block.column !== undefined);
  for (const section of sheetBlockSections(blocks)) {
    if (section.kind === "full") {
      const id = makeId();
      rows.push({ id, columns: 1 });
      result.push({ ...section.block, row_id: id, column: 0, width: "normal" });
    } else if (explicitColumns) {
      const id = makeId();
      rows.push({ id, columns });
      result.push(...assignBlockColumns(section.blocks, columns).map((block) => ({ ...block, row_id: id })));
    } else {
      for (let index = 0; index < section.blocks.length; index += columns) {
        const id = makeId();
        rows.push({ id, columns });
        result.push(...section.blocks.slice(index, index + columns).map((block, column) => ({ ...block, row_id: id, column })));
      }
    }
  }
  if (!rows.length) rows.push({ id: makeId(), columns });
  return { rows, blocks: result };
}

export function setSheetRowColumns(rows: SheetRow[], blocks: SheetBlock[], rowId: string, columns: number): { rows: SheetRow[]; blocks: SheetBlock[] } {
  if (!Number.isInteger(columns) || columns < 1 || columns > 3 || !rows.some((row) => row.id === rowId)) return { rows, blocks };
  return {
    rows: rows.map((row) => row.id === rowId ? { ...row, columns } : row),
    blocks: blocks.map((block) => block.row_id === rowId ? { ...block, column: Math.min(block.column ?? 0, columns - 1) } : block),
  };
}

export function moveSheetBlock(blocks: SheetBlock[], blockId: string, rowId: string, column: number, beforeId?: string): SheetBlock[] {
  const block = blocks.find((item) => item.id === blockId);
  if (!block || blockId === beforeId) return blocks;
  const remaining = blocks.filter((item) => item.id !== blockId);
  const target = beforeId ? remaining.findIndex((item) => item.id === beforeId && item.row_id === rowId) : -1;
  remaining.splice(target < 0 ? remaining.length : target, 0, { ...block, row_id: rowId, column, width: "normal" });
  return remaining;
}
