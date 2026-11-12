"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, Variants, AnimatePresence, useScroll, useSpring, useMotionValue } from "framer-motion";
import { useLenis } from "lenis/react";
import FeatureMarquee from "../../components/marketing/feature-marquee";
import PackageButton from "../../components/marketing/package-button";
import MarketingNav from "../../components/marketing/MarketingNav";
import RoadmapSteps from "../../components/marketing/roadmap-steps";
import { CONSENT_EVENT, OPEN_CONSENT_EVENT, readPreference, writePreference } from "../../lib/consent";



// --- BESTAANDE DATA ---
const values = [
  ["Vernieuwing", "Theorie leren zoals het nu hoort: fris, digitaal en zonder stoffige boeken."],
  ["Begrip", "Je leert niet alleen antwoorden, maar snapt waarom het zo is."],
  ["Vooruitgang", "Zie per oefenexamen en foutenanalyse precies waar je groeit."],
  ["Vertrouwen", "Oefen onder echte CBR-omstandigheden en loop zelfverzekerd binnen."],
  ["Toegankelijkheid", "Overal beschikbaar: op je telefoon, tablet of laptop."],
];

import { packages } from "../../components/marketing/packages-data";

const reviews = [
  { name: "Sarah de Vries", text: "Na 2 keer zakken uit boeken eindelijk geslaagd! De proefexamens lijken écht op het CBR.", rating: 5 },
  { name: "Kevin", text: "Super chill om gewoon op je tel te oefenen in de trein. Video's zijn duidelijk.", rating: 5 },
  { name: "Fenna", text: "Ik raakte altijd in paniek bij de gevaarherkenning, maar jullie systeem heeft me echt gered. Thanks!", rating: 4 },
];

const faqs = [
  { q: "Lijken de oefenexamens op die van het CBR?", a: "Ja. De oefenexamens combineren de vraagtypen, video's en situaties in één examen met een globale tijdslimiet en uitslag." },
  { q: "Kan ik op mijn telefoon oefenen?", a: "Absoluut. Ons platform is volledig geoptimaliseerd voor zowel je mobiel, tablet als laptop. Leer waar en wanneer je wilt." },
  { q: "Gaan de pakketten direct in?", a: "De tijd van je pakket gaat pas lopen op het moment dat je voor het eerst inlogt op het leerplatform, niet op het moment van aankoop." },
  { q: "Wat is 'Adaptive' leren?", a: "Ons systeem herkent welke onderwerpen je lastig vindt (bijv. voorrangsregels) en laat je daar gerichte flashcards en extra vragen over zien." },
];

// --- ANIMATIE VARIANTEN ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

const fadeUpVariants: Variants = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

// Zwevende animatie voor de stickers
const floatAnimation: any = {
  y: [-5, 5, -5],
  rotate: [-2, 2, -2],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

const LEGAL_LINKS = [
  { href: "/algemene-voorwaarden", label: "Algemene voorwaarden" },
  { href: "/privacybeleid", label: "Privacybeleid" },
  { href: "/herroepingsrecht", label: "Herroepingsrecht" },
];

// Vul het KvK-nummer in; het wordt pas in de footer getoond als het gevuld is.
const KVK_NUMMER = "";

const PAYMENT_METHODS = ["iDEAL", "Klarna", "Apple Pay", "Visa", "Mastercard"];

const PaymentBadges = ({ light = false }: { light?: boolean }) => (
  <ul aria-label="Betaalmethodes" className="flex flex-wrap items-center justify-center gap-2">
    {PAYMENT_METHODS.map((method) => (
      <li
        key={method}
        className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${
          light ? "border-ink/15 bg-white text-ink" : "border-paper/20 bg-paper/5 text-paper/80"
        }`}
      >
        {method}
      </li>
    ))}
  </ul>
);

// Vaste "willekeurige" posities (geen Math.random i.v.m. hydration); elk plaatje heeft een eigen tempo.
const CTA_STICKERS: {
  name: string; top: string; left?: string; right?: string; size: string;
  tilt: number; amp: number; duration: number; delay: number; mobile: boolean;
}[] = [
  { name: "rijbewijs", top: "40%", left: "6%", size: "w-24 lg:w-28", tilt: -12, amp: 7, duration: 3.1, delay: 0, mobile: false },
  { name: "thumbsup", top: "34%", right: "8%", size: "w-20 lg:w-24", tilt: 14, amp: 5, duration: 4.3, delay: 0.7, mobile: false },
  { name: "car", top: "64%", right: "16%", size: "w-20 lg:w-24", tilt: 8, amp: 9, duration: 5.2, delay: 1.4, mobile: false },
];

// --- FAQ COMPONENT ---
const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-paper/10 py-6">
      <button onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between text-left group">
        <span className="font-display text-lg lg:text-xl font-bold group-hover:text-lime transition-colors">{question}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="ml-4 flex-shrink-0 text-lime">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="mt-4 text-paper/70 text-lg">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};



const VALUES_SEEN_KEY = "tp-values-carousel-seen" as const;

export default function LandingPage() {
  const valuesSectionRef = useRef<HTMLElement>(null);
  const valuesTrackRef = useRef<HTMLDivElement>(null);
  const lastWheelNavigationRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchNavigatedRef = useRef(false);
  const [activeValue, setActiveValue] = useState(0);
  // Na de eerste keer helemaal doorlopen blijft de sectie een gewone (niet-vastgepinde) carrousel
  const [valuesSeen, setValuesSeen] = useState(false);
  const valuesSeenRef = useRef(false);
  const reachedLastValueRef = useRef(false);
  const layoutAnchorTopRef = useRef<number | null>(null);
  const lenis = useLenis();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const [cursorSide, setCursorSide] = useState<"left" | "right" | null>(null);

  const scrollValues = (direction: -1 | 1) => {
    const nextValue = Math.max(0, Math.min(values.length - 1, activeValue + direction));
    selectValue(nextValue);
  };

  const cursorDirection = cursorSide === "left" ? -1 : 1;
  const cursorEnabled =
    cursorSide !== null &&
    (cursorSide === "left" ? activeValue > 0 : activeValue < values.length - 1);

  const handleCarouselMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    cursorX.set(x);
    cursorY.set(event.clientY - rect.top);
    setCursorSide(x < rect.width / 2 ? "left" : "right");
  };

  const selectValue = useCallback((index: number) => {
    const section = valuesSectionRef.current;
    const track = valuesTrackRef.current;
    if (!section || !track) return;

    setActiveValue(index);
    const card = track.querySelectorAll<HTMLElement>("[data-value-card]")[index];
    if (card) {
      const trackCenter = track.getBoundingClientRect().left + track.clientWidth / 2;
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      track.scrollTo({ left: track.scrollLeft + cardCenter - trackCenter, behavior: "smooth" });
    }

    if (valuesSeenRef.current) return;
    const scrollRange = section.offsetHeight - window.innerHeight;
    if (scrollRange <= 0) return;

    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    const progress = index / (values.length - 1);
    const targetScroll = sectionTop + scrollRange * progress;
    if (lenis) {
      lenis.scrollTo(targetScroll, { immediate: true });
    } else {
      window.scrollTo({ top: targetScroll, behavior: "instant" });
    }
  }, [lenis]);

  useEffect(() => {
    const section = valuesSectionRef.current;
    if (!section) return;

    const getCurrentValue = () =>
      Array.from(section.querySelectorAll<HTMLButtonElement>("[aria-label^='Toon ']")).findIndex(
        (indicator) => indicator.getAttribute("aria-current") === "true",
      );

    const handleWheel = (event: WheelEvent) => {
      if (valuesSeenRef.current) return;
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

      const direction = event.deltaY > 0 ? 1 : -1;
      const currentValue = getCurrentValue();
      const nextValue = currentValue + direction;
      if (currentValue < 0) return;
      if (direction > 0 && currentValue === values.length - 1) return;
      if (direction < 0 && currentValue === 0) return;

      Object.assign(event, { lenisStopPropagation: true });
      event.preventDefault();
      const now = performance.now();
      if (now - lastWheelNavigationRef.current < 650) return;

      lastWheelNavigationRef.current = now;
      selectValue(nextValue);
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      touchNavigatedRef.current = false;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (valuesSeenRef.current) return;
      const start = touchStartRef.current;
      const touch = event.touches[0];
      if (!start || !touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      if (Math.abs(deltaY) < 20 || Math.abs(deltaY) <= Math.abs(deltaX)) return;

      const direction = deltaY < 0 ? 1 : -1;
      const currentValue = getCurrentValue();
      const nextValue = currentValue + direction;
      if (currentValue < 0 || nextValue < 0 || nextValue >= values.length) return;

      Object.assign(event, { lenisStopPropagation: true });
      event.preventDefault();
      if (touchNavigatedRef.current) return;

      touchNavigatedRef.current = true;
      selectValue(nextValue);
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
    };

    section.addEventListener("wheel", handleWheel, { passive: false });
    section.addEventListener("touchstart", handleTouchStart, { passive: true });
    section.addEventListener("touchmove", handleTouchMove, { passive: false });
    section.addEventListener("touchend", handleTouchEnd);
    section.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      section.removeEventListener("wheel", handleWheel);
      section.removeEventListener("touchstart", handleTouchStart);
      section.removeEventListener("touchmove", handleTouchMove);
      section.removeEventListener("touchend", handleTouchEnd);
      section.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [selectValue]);

  useEffect(() => {
    const restore = () => {
      if (!readPreference(VALUES_SEEN_KEY)) return;
      valuesSeenRef.current = true;
      setValuesSeen(true);
    };
    // Toestemming die later wordt gegeven geldt ook voor wat je net al hebt gezien
    const persist = () => {
      if (reachedLastValueRef.current) writePreference(VALUES_SEEN_KEY);
    };

    restore();
    window.addEventListener(CONSENT_EVENT, persist);
    return () => window.removeEventListener(CONSENT_EVENT, persist);
  }, []);

  useEffect(() => {
    if (activeValue !== values.length - 1) return;
    reachedLastValueRef.current = true;
    writePreference(VALUES_SEEN_KEY);
  }, [activeValue]);

  // Pas als de sectie na de laatste kaart naar boven uit beeld is, klappen we hem in
  useEffect(() => {
    const section = valuesSectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (
        entry.isIntersecting ||
        entry.boundingClientRect.bottom > 0 ||
        !reachedLastValueRef.current ||
        valuesSeenRef.current
      ) {
        return;
      }

      layoutAnchorTopRef.current = document.getElementById("pakketten")?.getBoundingClientRect().top ?? null;
      valuesSeenRef.current = true;
      setValuesSeen(true);
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Houd de content onder de sectie op dezelfde plek wanneer de sectie krimpt
  useLayoutEffect(() => {
    const before = layoutAnchorTopRef.current;
    layoutAnchorTopRef.current = null;
    const anchor = document.getElementById("pakketten");
    if (before === null || !anchor) return;

    const shift = anchor.getBoundingClientRect().top - before;
    if (Math.abs(shift) < 1) return;

    const target = window.scrollY + shift;
    if (lenis) {
      lenis.scrollTo(target, { immediate: true });
    } else {
      window.scrollTo({ top: target, behavior: "instant" });
    }
  }, [valuesSeen, lenis]);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-ink text-paper selection:bg-lime selection:text-ink">
      
      {/* DE SCROLL PROGRESS BALK */}
      <motion.div 
        style={{ scaleX }} 
        className="fixed top-0 left-0 right-0 h-px bg-lime origin-left z-[100]" 
      />
      
      {/* HERO SECTION */}
      <section className="hero-fade relative overflow-visible">
        <MarketingNav />

        {/* Hero Content */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative px-4 sm:px-10 lg:px-16 xl:px-24 pt-32 pb-16 md:pt-32 md:pb-20">
          
          {/* HERO STICKERS */}


          <motion.h1 variants={itemVariants} className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] max-w-3xl xl:max-w-4xl mb-6 relative z-20">
            Plug je kennis. <span className="text-lime">Own</span> de weg.
          </motion.h1>
          <motion.p variants={itemVariants} className="text-lg sm:text-xl lg:text-2xl text-paper/75 mb-10 max-w-xl lg:max-w-2xl relative z-20">
            Slaag in één keer voor je autotheorie. Oefen met examens die lijken op het echte CBR.
          </motion.p>
          <motion.div variants={itemVariants} className="flex flex-wrap gap-4 mb-16 relative z-20">
            <Link href="#pakketten" className="bg-lime text-ink px-8 py-4 rounded-full font-bold text-base sm:text-lg lg:text-xl hover:brightness-110 transition-all active:scale-95">
              Bekijk Pakketten
            </Link>
            <Link href="/demo" className="border border-paper/40 px-8 py-4 rounded-full font-bold text-base sm:text-lg lg:text-xl hover:bg-paper/10 transition-colors active:scale-95">
              Probeer Demo
            </Link>
          </motion.div>
          <motion.div variants={itemVariants} className="relative z-20">
             <FeatureMarquee />
          </motion.div>
        </motion.div>
      </section>

      {/* PLATFORM SNEAK PEEK */}
<section id="platform" className="py-24 sm:py-32 relative overflow-hidden">
  {/* Gebruik w-full en padding links om hem strak tegen de kant te plaatsen */}
  <div className="w-full pl-4 sm:pl-6 lg:pl-12 pr-4 sm:pr-6 lg:pr-12 relative z-10">
    <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
      
      {/* Video / Sneak Peek Links (strak uitgelijnd aan de linkerzijde) */}
      <div className="lg:col-span-7">
        <motion.div 
          initial={{ opacity: 0, y: 60 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }} 
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative aspect-video w-full rounded-2xl sm:rounded-[2rem] border border-white/10 bg-ink overflow-hidden shadow-[0_0_100px_rgba(204,255,0,0.15)] flex items-center justify-center group cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-lime/10 to-jade/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="z-10 text-center">
             <div className="h-20 w-20 mx-auto rounded-full bg-lime/20 flex items-center justify-center backdrop-blur-md border border-lime/30 group-hover:scale-110 transition-transform duration-500">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-lime translate-x-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
             </div>
             <p className="mt-4 font-display font-bold text-xl text-lime tracking-wide">Bekijk het platform</p>
          </div>
        </motion.div>
      </div>

      {/* Tekst Rechts */}
      <div className="lg:col-span-5 text-left pr-4 lg:pr-12">
        <motion.div
          initial={{ opacity: 0, x: 40 }} 
          whileInView={{ opacity: 1, x: 0 }} 
          viewport={{ once: true, margin: "-100px" }} 
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >

          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight mb-4">
            Ervaar hoe het werkt
          </h2>
          <p className="text-gray-400 leading-relaxed mb-6">
            Neem een kijkje in ons platform en ontdek hoe onze slimme oefenexamens, actuele theorie en realistische simulaties jou helpen om in één keer te slagen voor je examen.
          </p>
          <ul className="space-y-3 text-gray-300 text-sm font-medium">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-lime" /> Levensechte CBR-examenomgeving
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-lime" /> Directe feedback op je fouten
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-lime" /> Oefen waar en wanneer je wilt
            </li>
          </ul>
        </motion.div>
      </div>

    </div>
  </div>
</section>
      {/* DE RIJDENDE AUTO STAPPEN SECTIE (Vervangt de oude statische 3 stappen) */}
      <RoadmapSteps />

  

      {/* WAARDEN - Scroll geanimeerd & Links uitgelijnd */}
      <section
        ref={valuesSectionRef}
        id="over-ons"
        className="relative bg-ink"
        style={valuesSeen ? undefined : { height: `calc(${values.length} * 100vh)` }}
      >
        <div
          className={
            valuesSeen
              ? "flex flex-col justify-center px-4 py-24 sm:px-10 lg:px-16 xl:px-24"
              : "sticky top-0 flex h-screen flex-col justify-center px-4 py-8 sm:px-10 lg:px-16 xl:px-24"
          }
        >
          <div className="mb-12 flex flex-col items-center text-center">
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUpVariants} className="font-display font-extrabold text-3xl md:text-4xl lg:text-5xl mb-6">
              Waar wij <span className="text-lime">voor staan</span>
            </motion.h2>
            
            <motion.div initial={{ opacity: 0, rotate: -6, scale: 0.9 }} whileInView={{ opacity: 1, rotate: -2, scale: 1 }} viewport={{ once: true }} transition={{ type: "spring", bounce: 0.5, duration: 0.8, delay: 0.2 }} className="relative inline-block bg-lime px-5 py-4 text-center font-display text-xl font-extrabold text-ink shadow-xl sm:px-8 sm:text-2xl lg:text-3xl">
              Plug je kennis. Own de weg.
            </motion.div>
          </div>

          <div className="relative left-1/2 w-screen -translate-x-1/2">
            <div
              className="relative"
              style={{ cursor: cursorEnabled ? "none" : "default" }}
              onPointerMove={handleCarouselMove}
              onPointerLeave={() => setCursorSide(null)}
              onClick={() => {
                if (cursorEnabled) scrollValues(cursorDirection);
              }}
            >
            <motion.div
              ref={valuesTrackRef}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={containerVariants}
              onScroll={(event) => {
                const track = event.currentTarget;
                const trackCenter = track.getBoundingClientRect().left + track.clientWidth / 2;
                const cards = Array.from(track.querySelectorAll<HTMLElement>("[data-value-card]"));
                const nearestIndex = cards.reduce(
                  (nearest, card, index) => {
                    const cardRect = card.getBoundingClientRect();
                    const nearestRect = cards[nearest].getBoundingClientRect();
                    return Math.abs(cardRect.left + cardRect.width / 2 - trackCenter) <
                      Math.abs(nearestRect.left + nearestRect.width / 2 - trackCenter)
                      ? index
                      : nearest;
                  },
                  0,
                );
                setActiveValue(nearestIndex);
              }}
              role="region"
              aria-label="TheoriePlug-waarden"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") scrollValues(-1);
                if (event.key === "ArrowRight") scrollValues(1);
              }}
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 5%, #000 95%, transparent 100%)",
                maskImage: "linear-gradient(to right, transparent 0%, #000 5%, #000 95%, transparent 100%)",
              }}
              className="flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain px-[4%] pb-16 pt-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/90 focus-visible:outline-offset-8 sm:px-[10%] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {values.map(([title, text], index) => (
                <motion.div
                  key={title}
                  data-value-card
                  variants={itemVariants}
                  animate={{
                    scale: activeValue === index ? 1 : 0.88,
                    opacity: activeValue === index ? 1 : 0.35,
                    filter: activeValue === index ? "blur(0px)" : "blur(4px)",
                  }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  whileHover={{ y: -5 }}
                  className="flex w-[94%] shrink-0 snap-center items-center gap-2 rounded-[1.5rem] bg-lime p-4 text-ink shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition-shadow hover:shadow-[0_24px_70px_rgba(204,255,0,0.18)] sm:w-[80%] sm:gap-6 sm:rounded-[2rem] sm:p-6 md:gap-8 md:p-10 lg:w-[min(65vw,880px)]"
                >
                  <div className="min-w-0 flex-1 [container-type:inline-size]">
                    <h3 className="mb-3 font-display font-extrabold leading-tight [font-size:min(2.25rem,7.2cqw)]">{title}</h3>
                    <p className="text-sm font-medium sm:text-lg lg:text-xl">{text}</p>
                  </div>
                  <Image
                    src={`/brand/png/svg/sticker-${title.toLowerCase()}.svg`}
                    alt=""
                    width={200}
                    height={200}
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
                    className="pointer-events-none h-14 w-14 shrink-0 select-none object-contain sm:h-20 sm:w-20 md:h-28 md:w-28 lg:h-36 lg:w-36"
                  />
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              aria-hidden="true"
              style={{ x: cursorX, y: cursorY }}
              className="pointer-events-none absolute left-0 top-0 z-20 hidden md:block"
            >
              <motion.div
                initial={false}
                animate={{ scale: cursorEnabled ? 1 : 0, opacity: cursorEnabled ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="-ml-10 -mt-10 flex h-20 w-20 items-center justify-center rounded-full bg-[#09090b] text-4xl font-bold text-lime shadow-[0_0_30px_rgba(204,255,0,0.25)]"
              >
                {cursorDirection === -1 ? "←" : "→"}
              </motion.div>
            </motion.div>
            </div>

            <div className="mt-2 flex justify-center">
              <div className="flex gap-2" aria-label="Kies een waarde">
                {values.map(([title], index) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => selectValue(index)}
                    aria-label={`Toon ${title}`}
                    aria-current={activeValue === index ? "true" : undefined}
                    className={`h-2.5 rounded-full transition-all ${
                      activeValue === index ? "w-8 bg-lime" : "w-2.5 bg-paper/30 hover:bg-paper/60"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAKKETTEN - PREMIUM COMPACTE VERSIE (FIXED) */}
      <section id="pakketten" className="py-24 bg-paper text-ink rounded-t-[3rem]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUpVariants} className="mb-16 text-center md:text-left relative">
            <h2 className="font-display font-extrabold text-3xl md:text-4xl lg:text-5xl mb-4">Kies jouw theoriepakket</h2>
            <p className="text-ink/70 text-lg lg:text-xl">Hoeveel tijd heb je nog tot je examen? Kies het pakket dat bij je past.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((p, index) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                whileHover={{ y: p.featured ? -10 : -6 }}
                id={p.id}
                className={`rounded-3xl p-1 relative flex flex-col text-paper ${
                  p.featured
                    ? "bg-gradient-to-b from-lime to-lime/20 shadow-[0_0_32px_rgba(204,255,0,0.25),0_25px_60px_rgba(0,0,0,0.35)] md:-translate-y-4 z-10"
                    : "bg-gradient-to-b from-jade/40 to-jade/5 hover:from-jade/60 hover:shadow-xl hover:shadow-jade/10"
                }`}
              >
                {/* PAKKET BADGE & STICKER */}
                {p.featured && (
                  <>
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-lime px-4 py-1 text-sm font-bold tracking-wide text-ink shadow-lg z-50">
                      MEEST GEKOZEN
                    </motion.div>
                    
                  </>
                )}

                <div className="bg-ink h-full w-full rounded-[1.4rem] p-6 lg:p-8 flex flex-col relative z-10 overflow-hidden">
                  
                  <div className={`absolute top-0 left-0 right-0 h-40 opacity-20 pointer-events-none ${ p.featured ? "bg-[radial-gradient(circle_at_top_right,rgba(204,255,0,1)_0%,transparent_60%)]" : "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,1)_0%,transparent_60%)]" }`} />
                  <div className="absolute top-0 left-0 right-0 h-40 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

                  <div className="relative z-10 mb-6 border-b border-white/10 pb-6">
                    <h3 className="font-display font-black text-2xl lg:text-3xl mb-2 uppercase tracking-widest text-paper">
                      {p.name}
                    </h3>
                    <p className="text-paper/60 text-sm mb-4 min-h-[40px]">{p.desc}</p>
                    <div className="flex items-end gap-2">
                       <div className={`font-display font-black text-4xl lg:text-5xl leading-none ${p.featured ? "text-lime" : "text-jade"}`}>
                         {p.price}
                       </div>
                    </div>
                  </div>
                  
                  <ul className="space-y-3 mb-8 flex-1 text-base relative z-10">
                    {p.items.map((item) => (
                      <li key={item.label} className="flex flex-wrap items-center gap-2">
                        <span className="text-jade font-bold">✓</span>
                        <span className={item.highlight === "jade" ? "rounded-full border border-jade/40 bg-jade/10 px-2.5 py-0.5 font-bold text-jade text-sm" : item.highlight === "lime" ? "rounded-full border border-lime/40 bg-lime/10 px-2.5 py-0.5 font-bold text-lime text-sm" : "text-paper/90"}>
                          {item.label}
                        </span>
                        {item.detail && <span className="rounded-full border border-paper/20 bg-paper/5 px-2 py-0.5 text-xs font-semibold text-paper/60">{item.detail}</span>}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="relative z-10 mt-auto">
                     <PackageButton featured={Boolean(p.featured)} slug={p.id.replace("pakket-", "")} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 text-ink/70">
            <p className="text-sm font-semibold">Veilig betalen met</p>
            <PaymentBadges light />
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF (REVIEWS) */}
      <section className="py-24 bg-ink overflow-hidden">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUpVariants} className="text-center relative mb-12 inline-block left-1/2 -translate-x-1/2">
              <h2 className="font-display font-extrabold text-3xl md:text-4xl lg:text-5xl">
                Zij <span className="text-lime">plugden</span> hun kennis al
              </h2>
              <motion.div animate={floatAnimation} className="absolute -top-16 -right-32 w-32 sm:w-36 pointer-events-none drop-shadow-xl z-20">
                 <Image src="/brand/png/svg/sticker-thumbsup.svg" alt="" width={200} height={200} className="w-full h-auto rotate-12" />
              </motion.div>
            </motion.div>
            
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={containerVariants} className="grid md:grid-cols-3 gap-6">
               {reviews.map((review, i) => (
                  <motion.div key={i} variants={itemVariants} whileHover={{ y: -5 }} className="bg-paper/5 border border-paper/10 rounded-2xl p-6 md:p-8 relative">
                     <div className="flex gap-1 mb-4">
                        {[...Array(5)].map((_, index) => (
                           <svg key={index} width="20" height="20" viewBox="0 0 24 24" fill={index < review.rating ? "#CCFF00" : "#333"} stroke="none">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                           </svg>
                        ))}
                     </div>
                     <p className="text-lg text-paper/90 mb-6 italic">"{review.text}"</p>
                     <p className="font-display font-bold text-lime">{review.name}</p>
                  </motion.div>
               ))}
            </motion.div>
         </div>
      </section>

      {/* FAQ SECTIE */}
      <section className="py-24 bg-ink">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUpVariants} className="mb-12 text-center relative">
            <h2 className="font-display font-extrabold text-3xl md:text-4xl lg:text-5xl mb-4 inline-block relative">
              Veelgestelde vragen
              <motion.div animate={floatAnimation} className="absolute -top-14 -right-20 w-28 sm:w-32 pointer-events-none drop-shadow-xl z-20">
                 <Image src="/brand/png/svg/sticker-vraagteken.svg" alt="" width={150} height={150} className="w-full h-auto -rotate-12" />
              </motion.div>
            </h2>
            <p className="text-paper/70 text-lg">Alles wat je moet weten voordat je begint.</p>
          </motion.div>
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={containerVariants}>
            {faqs.map((faq, i) => (
              <motion.div key={i} variants={itemVariants}>
                <FAQItem question={faq.q} answer={faq.a} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-ink px-4 pb-24 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUpVariants} className="relative mx-auto max-w-5xl rounded-[2rem] bg-lime px-6 py-12 text-center text-ink sm:px-12 md:py-16">
          {CTA_STICKERS.map((sticker) => (
            <motion.div
              key={sticker.name}
              animate={{ y: [0, -sticker.amp, 0, sticker.amp, 0], rotate: [sticker.tilt - 3, sticker.tilt + 3, sticker.tilt - 3] }}
              transition={{ duration: sticker.duration, delay: sticker.delay, repeat: Infinity, ease: "easeInOut" }}
              style={{ top: sticker.top, left: sticker.left, right: sticker.right }}
              className={`pointer-events-none absolute z-20 drop-shadow-xl ${sticker.size} ${sticker.mobile ? "" : "hidden sm:block"}`}
            >
              <Image src={`/brand/png/svg/sticker-${sticker.name}.svg`} alt="" width={200} height={200} className="h-auto w-full" />
            </motion.div>
          ))}
                  <h2 className="font-display font-extrabold text-3xl md:text-5xl leading-tight">Klaar om in één keer te slagen?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg font-medium text-ink/80">Kies vandaag nog je pakket en plug je kennis.</p>
          <a href="#pakketten" className="mt-8 inline-block rounded-full bg-ink px-8 py-4 text-lg font-bold text-lime transition-transform hover:scale-105">
            Kies je pakket
          </a>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="py-16 text-center text-paper/60 bg-ink border-t border-paper/10">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="px-4">
          <Image src="/brand/png/svg/logo.svg" alt="TheoriePlug" width={582} height={61} className="h-8 w-auto mx-auto mb-6 opacity-50 grayscale hover:grayscale-0 transition-all duration-300" />
          <p className="font-medium">info@theorieplug.nl <span className="mx-2 text-lime/50">•</span> @theorieplug <span className="mx-2 text-lime/50">•</span> www.theorieplug.nl</p>
          <nav aria-label="Juridisch" className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-lime transition-colors">{link.label}</Link>
            ))}
            <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))} className="hover:text-lime transition-colors">
              Cookie-instellingen
            </button>
          </nav>
          <div className="mt-6 flex justify-center"><PaymentBadges /></div>
          <p className="mt-6 text-sm opacity-50">
            <Link href="/beheer/login" aria-label="Beheerlogin" tabIndex={-1} className="cursor-text hover:text-inherit">©</Link> 2026 TheoriePlug. Alle rechten voorbehouden.
            {KVK_NUMMER && <> <span className="mx-1">•</span> KvK {KVK_NUMMER}</>}
          </p>
        </motion.div>
      </footer>
    </div>
  );
}