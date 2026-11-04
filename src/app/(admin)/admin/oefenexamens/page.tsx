import ContentManager from "../../../../components/admin/ContentManager";

export default function Page() {
  return (
    <ContentManager
      table="exam_questions"
      title="Oefenexamens"
      singular="Vraag"
      intro="Beheer de CBR-stijl examenvragen."
      titleKey="question"
      defaults={{ question: "Nieuwe vraag", options: ["Antwoord A", "Antwoord B", "Antwoord C"], correct_option: 0 }}
      fields={[
        { key: "question", label: "Vraag", kind: "textarea" },
        { key: "image_url", label: "Afbeelding (optioneel)", kind: "image" },
        { key: "options", label: "Antwoordopties", kind: "options" },
        { key: "explanation", label: "Uitleg", kind: "textarea" },
        { key: "category", label: "Categorie", kind: "text", hint: "Bijv. voorrang, borden" },
      ]}
    />
  );
}
