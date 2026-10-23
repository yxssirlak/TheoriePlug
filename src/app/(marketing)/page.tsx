"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, Variants, AnimatePresence, useScroll, useSpring } from "framer-motion";
import FeatureMarquee from "./feature-marquee";
import PackageButton from "./package-button";
import PackageDropdown from "./package-dropdown";
import RoadmapSteps from "./roadmap-steps";



// --- BESTAANDE DATA ---
const values = [
  ["Vernieuwing", "Theorie leren zoals het nu hoort: fris, digitaal en zonder stoffige boeken."],
  ["Begrip", "Je leert niet alleen antwoorden, maar snapt waarom het zo is."],
  ["Vooruitgang", "Zie per oefenexamen en foutenanalyse precies waar je groeit."],
  ["Vertrouwen", "Oefen onder echte CBR-omstandigheden en loop zelfverzekerd binnen."],
  ["Toegankelijkheid", "Overal beschikbaar: op je telefoon, tablet of laptop."],
];

type PackageFeature = {
  label: string;
  highlight?: "jade" | "lime";
  detail?: string;
};

type TheoryPackage = {
  id: string;
  name: string;
  desc: string;
  price: string;
  featured?: boolean;
  items: PackageFeature[];
};

const packages: TheoryPackage[] = [
  {
    id: "pakket-start",
    name: "Start",
    desc: "Een sterke basis voor je theorie-examen.",
    price: "€29,99",
    items: [
      { label: "7 dagen" },
      { label: "3 oefenexamens", detail: "250 vragen" },
      { label: "Videocursus" },
      { label: "ADAS" },
      { label: "Cheat Sheet" },
    ],
  },
  {
    id: "pakket-max",
    name: "Max",
    desc: "Alles in huis voor een complete voorbereiding.",
    price: "€44,99",
    featured: true,
    items: [
      { label: "1 maand" },
      { label: "10 oefenexamens", detail: "500 vragen" },
      { label: "Videocursus" },
      { label: "ADAS" },
      { label: "Cheat Sheet" },
      { label: "1 x pauzeren" },
      { label: "Adaptive", highlight: "lime" },
      { label: "Flashcards", highlight: "lime" },
    ],
  },
  {
    id: "pakket-boost",
    name: "Boost",
    desc: "Extra oefenen en leren op jouw tempo.",
    price: "€39,99",
    items: [
      { label: "14 dagen" },
      { label: "8 oefenexamens", detail: "400 vragen" },
      { label: "Videocursus" },
      { label: "ADAS" },
      { label: "Cheat Sheet" },
      { label: "1 x pauzeren" },
      { label: "Adaptive", highlight: "jade" },
    ],
  },
];

const reviews = [
  { name: "Sarah de Vries", text: "Na 2 keer zakken uit boeken eindelijk geslaagd! De proefexamens lijken écht op het CBR.", rating: 5 },
  { name: "Kevin", text: "Super chill om gewoon op je tel te oefenen in de trein. Video's zijn duidelijk.", rating: 5 },
  { name: "Fenna", text: "Ik raakte altijd in paniek bij de gevaarherkenning, maar jullie systeem heeft me echt gered. Thanks!", rating: 4 },
];

const faqs = [
  { q: "Lijken de oefenexamens op die van het CBR?", a: "Ja, 100%. Onze interface, timer en vraagstelling (inclusief gevaarherkenning, kennis en inzicht) zijn gebouwd om het CBR-examen exact na te bootsen." },
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



export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <div className="relative min-h-screen overflow-x-clip bg-ink text-paper selection:bg-lime selection:text-ink">
      
      {/* DE SCROLL PROGRESS BALK */}
      <motion.div 
        style={{ scaleX }} 
        className="fixed top-0 left-0 right-0 h-px bg-lime origin-left z-[100]" 
      />
      
      {/* HERO SECTION */}
      <section className="hero-fade relative overflow-visible">
        {/* Navigatie */}
        <motion.nav 
          initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-4 px-4 py-6 sm:px-10 lg:px-16 xl:px-24 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
        >
          <Link href="/">
            <Image src="/brand/png/svg/logo.svg" alt="TheoriePlug" width={582} height={61} priority className="h-7 sm:h-8 lg:h-9 w-auto" />
          </Link>
          <div className="col-span-2 row-start-2 flex flex-wrap items-center justify-center gap-x-1 gap-y-1 sm:gap-x-3 md:col-span-1 md:col-start-2 md:row-start-auto md:gap-x-2">
            <Link href="#contact" className="rounded-full px-3 py-2 text-base font-bold transition-colors hover:bg-paper/10 hover:text-lime sm:text-lg lg:px-4 lg:text-xl">Contact</Link>
            <Link href="#over-ons" className="rounded-full px-3 py-2 text-base font-bold transition-colors hover:bg-paper/10 hover:text-lime sm:text-lg lg:px-4 lg:text-xl">Over ons</Link>
            <Link href="mailto:info@theorieplug.nl?subject=Demo%20aanvragen" className="rounded-full px-3 py-2 text-base font-bold transition-colors hover:bg-paper/10 hover:text-lime sm:text-lg lg:px-4 lg:text-xl">Demo</Link>
            <PackageDropdown packages={packages} />
          </div>
          <Link href="/login" className="justify-self-end rounded-full border border-paper/30 px-4 py-2 text-base font-bold transition-colors hover:border-lime hover:bg-lime hover:text-ink sm:px-5 sm:text-lg lg:text-xl">
            Inloggen
          </Link>
        </motion.nav>

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
            <Link href="#platform" className="border border-paper/40 px-8 py-4 rounded-full font-bold text-base sm:text-lg lg:text-xl hover:bg-paper/10 transition-colors active:scale-95">
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
      <section id="over-ons" className="py-24 overflow-hidden bg-ink">
        <div className="px-4 sm:px-10 lg:px-16 xl:px-24">
          <div className="mb-12 flex flex-col items-start text-left">
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUpVariants} className="font-display font-extrabold text-3xl md:text-4xl lg:text-5xl mb-6">
              Waar wij <span className="text-lime">voor staan</span>
            </motion.h2>
            
            <motion.div initial={{ opacity: 0, rotate: -6, scale: 0.9 }} whileInView={{ opacity: 1, rotate: -2, scale: 1 }} viewport={{ once: true }} transition={{ type: "spring", bounce: 0.5, duration: 0.8, delay: 0.2 }} className="inline-block bg-lime px-5 py-4 text-left font-display text-xl font-extrabold text-ink shadow-xl sm:px-8 sm:text-2xl lg:text-3xl relative">
               <motion.div animate={floatAnimation} className="absolute -top-12 -right-12 w-28 pointer-events-none drop-shadow-xl z-20">
                  <Image src="/brand/png/svg/sticker-geslaagd.svg" alt="" width={200} height={200} className="w-full h-auto rotate-12" />
               </motion.div>
              Plug je kennis. Own de weg.
            </motion.div>
          </div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={containerVariants} className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {values.map(([title, text]) => (
              <motion.div key={title} variants={itemVariants} whileHover={{ y: -5 }} className="corner-cut bg-lime text-ink p-8 pb-12 transition-shadow hover:shadow-2xl hover:shadow-lime/20">
                <h3 className="font-display font-extrabold text-xl lg:text-2xl mb-3">{title}</h3>
                <p className="text-base lg:text-lg font-medium">{text}</p>
              </motion.div>
            ))}
          </motion.div>
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
                    
                    <motion.div animate={floatAnimation} className="absolute -top-14 -right-8 w-32 pointer-events-none drop-shadow-xl z-50">
                       <Image src="/brand/png/svg/sticker-tip.svg" alt="" width={200} height={200} className="w-full h-auto rotate-12" />
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
                     <PackageButton featured={Boolean(p.featured)} />
                  </div>
                </div>
              </motion.div>
            ))}
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

      {/* FOOTER */}
      <footer id="contact" className="py-16 text-center text-paper/60 bg-ink border-t border-paper/10">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
          <Image src="/brand/png/svg/logo.svg" alt="TheoriePlug" width={582} height={61} className="h-8 w-auto mx-auto mb-6 opacity-50 grayscale hover:grayscale-0 transition-all duration-300" />
          <p className="font-medium">info@theorieplug.nl <span className="mx-2 text-lime/50">•</span> @theorieplug <span className="mx-2 text-lime/50">•</span> www.theorieplug.nl</p>
          <p className="mt-4 text-sm opacity-50">© 2026 TheoriePlug. Alle rechten voorbehouden.</p>
        </motion.div>
      </footer>
    </div>
  );
}