import ContentManager from "../../../../components/admin/ContentManager";

export default function Page() {
  return (
    <ContentManager
      table="flashcards"
      title="Flashcards"
      singular="Flashcard"
      intro="Beheer de kaartjes om snel te herhalen."
      titleKey="front"
      defaults={{ front: "Nieuwe kaart", back: "Antwoord" }}
      fields={[
        { key: "front", label: "Voorkant (vraag)", kind: "textarea" },
        { key: "back", label: "Achterkant (antwoord)", kind: "textarea" },
        { key: "category", label: "Categorie", kind: "text" },
      ]}
    />
  );
}
