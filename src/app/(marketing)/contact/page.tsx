import type { Metadata } from "next";
import Image from "next/image";
import MarketingNav from "../../../components/marketing/MarketingNav";

export const metadata: Metadata = { title: "Contact — TheoriePlug" };

export default function ContactPage() {
  const paragraphs = [
    "Heb je een vraag over onze cursussen, loop je ergens tegenaan of wil je wat kwetsen? Wij staan voor je klaar.",
    "Je kunt ons bereiken via e-mail of via onze social media kanalen. We reageren zo snel mogelijk zodat jij weer door kunt met je voorbereiding.",
    "Plug je kennis, Own de weg!"
  ];

  const stickers = ["vernieuwing", "vertrouwen", "vooruitgang"];

  return (
    <div className="min-h-screen overflow-x-clip bg-ink text-paper selection:bg-lime selection:text-ink">
      <section className="hero-fade relative min-h-screen overflow-visible">
        <MarketingNav />
        <div className="relative px-4 pb-24 pt-16 sm:px-10 md:pt-24 lg:px-16 xl:px-24">
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl xl:text-7xl">
            Neem <span className="text-lime">contact</span> op
          </h1>

          <div className="mt-6 max-w-2xl space-y-4 text-lg text-paper/75 sm:text-xl leading-relaxed">
            {paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
            <div className="pt-4 font-semibold text-lime">
              E-mail: info@theorieplug.nl
            </div>
          </div>

          <div className="mt-12 grid max-w-3xl gap-4 sm:grid-cols-3">
            {stickers.map((sticker, index) => (
              <div key={sticker} className="flex aspect-square items-center justify-center rounded-3xl border border-jade/25 bg-[#050b14] p-6">
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