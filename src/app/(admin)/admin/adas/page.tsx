import ContentManager from "../../../../components/admin/ContentManager";

export default function Page() {
  return (
    <ContentManager
      table="adas_items"
      title="ADAS"
      singular="Onderdeel"
      intro="Beheer de uitleg over rijhulpsystemen."
      titleKey="title"
      defaults={{ title: "Nieuw onderdeel" }}
      fields={[
        { key: "title", label: "Titel", kind: "text" },
        { key: "body", label: "Uitleg", kind: "textarea", hint: 'Begin een regel met "- " voor een bulletpoint' },
        { key: "image_url", label: "Afbeelding (optioneel)", kind: "image" },
      ]}
    />
  );
}
