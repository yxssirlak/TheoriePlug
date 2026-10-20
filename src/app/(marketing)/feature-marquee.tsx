"use client";

import Image from "next/image";
import { useRef, type PointerEvent } from "react";

const features = [
  { icon: "/brand/sticker-pin.png", title: "De nieuwste vragen én antwoorden", text: "Oefen met actuele theorie" },
  { icon: "/brand/sticker-car.png", title: "Vragen? We helpen je verder", text: "Onze theorie-experts staan voor je klaar" },
  { icon: "/brand/sticker-badge.png", title: "Meer dan 550.000 geslaagde kandidaten", text: "Zet vandaag de eerste stap" },
  { icon: "/brand/sticker-succes.png", title: "Plug je kennis. Own de weg.", text: "Bereid je goed voor op je theorie" },
];

export default function FeatureMarquee() {
  const ref = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    
    // De missende min-tekens (-) zijn hier teruggeplaatst
    el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      role="region"
      aria-label="TheoriePlug in het kort"
      onPointerMove={handlePointerMove}
      className="feature-marquee group relative left-1/2 mt-32 w-screen -translate-x-1/2 overflow-hidden border-y border-white/20 bg-white/10 py-5 text-paper shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:mt-44 sm:py-6"
    >
      <div
        aria-hidden="true"
        className="feature-marquee-spotlight pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      
      <div className="feature-marquee-track relative z-10 flex w-max">
        {[0, 1, 2, 3].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy !== 0}
            className="animate-marquee flex shrink-0 items-center gap-14 pr-14 sm:gap-20 sm:pr-20"
          >
            {features.map((feature) => (
              <div key={feature.title} className="flex items-center gap-5">
                <Image src={feature.icon} alt="" width={80} height={80} className="h-16 w-16 object-contain sm:h-20 sm:w-20" />
                <p className="min-w-72 text-base leading-tight text-paper/80 lg:text-lg">
                  <strong className="block text-lg text-paper lg:text-xl">{feature.title}</strong>
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}