import type { Metadata } from "next";
import Image from "next/image";
import MarketingNav from "../../../components/marketing/MarketingNav";

export const metadata: Metadata = { title: "Over ons — TheoriePlug" };

export default function OverOnsPage() {
  const paragraphs = [
    "Bij TheoriePlug geloven we dat je het beste leert als je het naar je zin hebt.",
    "Daarom hebben wij een online theoriecursus ontwikkeld die helemaal aansluit bij deze generatie. Geen eindeloze, saaie teksten of ingewikkelde uitleg, maar duidelijke video’s, herkenbare voorbeelden en een flinke dosis humor.",
    "Ons doel is simpel: jou helpen om de verkeersregels écht te begrijpen op een leuke manier en goed voorbereid je theorie-examen in te gaan. Met onze videocursus, oefenvragen en oefenexamens leer je op je eigen tempo, waar en wanneer je wilt.",
    "We combineren een frisse manier van leren met alles wat je nodig hebt om je theorie te halen.",
    "TheoriePlug. Plug je kennis, Own de weg!"
  ];

  const stickers = ["vernieuwing", "vertrouwen", "vooruitgang"];

  return (
    <div className="min-h-screen overflow-x-clip bg-ink text-paper selection:bg-lime selection:text-ink">
      <section className="hero-fade relative min-h-screen overflow-visible">
        <MarketingNav />
        <div className="relative px-4 pb-24 pt-16 sm:px-10 md:pt-24 lg:px-16 xl:px-24">
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl xl:text-7xl">
            Over <span className="text-lime">ons</span>
          </h1>

          {/* Alinea's netjes onder elkaar met ruimte ertussen */}
          <div className="mt-6 max-w-2xl space-y-4 text-lg text-paper/75 sm:text-xl leading-relaxed">
            {paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          <div className="mt-12 grid max-w-3xl gap-4 sm:grid-cols-3">
            {stickers.map((sticker, index) => (
              <div key={sticker} className="flex aspect-square items-center justify-center rounded-3xl border border-jade/25 bg-surface p-6">
                <Image
                  src={`/brand/png/svg/sticker-${sticker}.svg`}
                  alt=""
                  width={200}
                  height={200}
                  className={`h-full w-full object-contain ${index % 2 ? "rotate-6" : "-rotate-6"}`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}