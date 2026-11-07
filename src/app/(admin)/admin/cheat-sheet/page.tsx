import ContentManager from "../../../../components/admin/ContentManager";
import CheatSheetManager from "../../../../components/admin/CheatSheetManager";

export default function Page() {
  return (
    <>
    <CheatSheetManager />
    <ContentManager
      table="cheat_sheet_items"
      title="Bestaande cheat sheet onderdelen"
      singular="Onderdeel"
      intro="Beheer alle regels op één blad."
      titleKey="title"
      defaults={{ title: "Nieuw onderdeel" }}
      fields={[
        { key: "title", label: "Titel", kind: "text" },
        { key: "body", label: "Inhoud", kind: "textarea", hint: 'Begin een regel met "- " voor een bulletpoint' },
        { key: "category", label: "Categorie", kind: "text" },
      ]}
    />
    </>
  );
}
