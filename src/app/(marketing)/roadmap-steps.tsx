"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValueEvent,
} from "framer-motion";
import Image from "next/image";

/* ==========================================================================
   CONFIG — hier kun je alles makkelijk aanpassen
   ========================================================================== */

// Gekozen logo: "los-limoen" (variant C). Geen tegel-achtergrond, dus het ligt
// direct op de donkere motorkap, en het limoen (#ccff00) heeft daar het
// maximale contrast. Pas het pad aan naar waar het bestand bij jou staat.
const LOGO_SRC = "/brand/png/svg/logo-upright-c-los-limoen.svg";

const LIME = "#ccff00";
const JADE = "#10b981";

// Lakkleur van de A3 (nu: donker grafiet / nanograu). Verander naar wens.
const PAINT = { edge: "#14161a", mid: "#2c3038", light: "#3d424c" };

// Het "canvas" van de desktop-weg (SVG viewBox)
const VIEW_W = 1000;
const VIEW_H = 960;

// Weg: S-bocht met verticale raaklijnen, eindigt recht in het parkeervak
const ROAD_PATH =
  "M 500 60 C 500 155, 400 155, 400 250 C 400 405, 590 405, 590 560 C 590 690, 500 690, 500 830";

const NEAR_FRAC = 0.09; // hoe dichtbij een kaartje (in % van de route) het grote licht aangaat
const LEAD_FRAC = 0.12; // hoeveel eerder een kaartje oplicht dan de auto er is
const PARK_AT = 0.992; // vanaf hier staat de auto "geparkeerd"
const LOOK = 12; // kijkafstand voor de rijrichting
const STEER_SPAN = 60; // afstand waarover de stuuruitslag wordt berekend
const IDLE_DELAY = 160; // ms zonder scrollen => remlichten aan

type DriveState = "idle" | "forward" | "reverse";

const steps = [
  {
    num: "1",
    title: "KIJK & LEER",
    desc: "Leer en begrijp de verkeersregels met interactieve video's en betrouwbare uitleg.",
    sticker: "/brand/png/svg/sticker-play.svg",
  },
  {
    num: "2",
    title: "TEST JE KENNIS",
    desc: "Start direct met oefenen en ontdek of jij klaar bent voor het CBR-examen.",
    sticker: "/brand/png/svg/sticker-thumbsup.svg",
  },
  {
    num: "3",
    title: "OWN DE WEG",
    desc: "Loop met vertrouwen de examenzaal in en haal in één keer je theorie.",
    sticker: "/brand/png/svg/sticker-rijbewijs.svg",
  },
];

const floatAnimation: any = {
  y: [-5, 5, -5],
  rotate: [-2, 2, -2],
  transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
};











































const COMPONENT_CSS = `
@keyframes tp-blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
.tp-hazard { animation: tp-blink .9s steps(1, end) infinite; }
@media (prefers-reduced-motion: reduce) { .tp-hazard { animation: none; opacity: .9; } }
`;

/* ==========================================================================
   AUDI A3 (8V, 2017) — bovenaanzicht, neus naar BOVEN in lokale coördinaten
   Lokaal assenstelsel: x = -32..32, y = -62..64 (lengte ±60, breedte ±26)
   Voorwielen centreren op (±25, -35); achterwielen op (±25, 38).
   ========================================================================== */

const BODY_D =
  "M -16 -59 C -9 -60.6 9 -60.6 16 -59 C 21 -57 24 -52 25 -44 L 25.6 -30 C 25.9 -10 25.9 20 25.4 40 C 25.1 50 24 55 21 58 C 14 60.6 -14 60.6 -21 58 C -24 55 -25.1 50 -25.4 40 C -25.9 20 -25.9 -10 -25.6 -30 L -25 -44 C -24 -52 -21 -57 -16 -59 Z";

type CarProps = {
  headlights: boolean;
  drive: DriveState;
  parked: boolean;
  beamStrength?: number;
  wheelLRef?: Ref<SVGGElement>;
  wheelRRef?: Ref<SVGGElement>;
};

function AudiA3Top({
  headlights,
  drive,
  parked,
  beamStrength = 1,
  wheelLRef,
  wheelRRef,
}: CarProps) {
  // Unieke id's, want deze auto wordt zowel op desktop als mobiel gerenderd
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (n: string) => `tp${uid}${n}`;
  const url = (n: string) => `url(#${id(n)})`;

  const braking = drive === "idle";
  const reversing = drive === "reverse";

  const fade = (on: boolean, ms = 200, max = 1): CSSProperties => ({
    opacity: on ? max : 0,
    transition: `opacity ${ms}ms ease`,
  });

  const sides = [1, -1] as const;
  const flip = (s: number) => (s < 0 ? "scale(-1 1)" : undefined);

  // Alarmlichten knipperen als de auto geparkeerd staat
  const hzClass = parked ? "tp-hazard" : undefined;
  const hzOpacity = parked ? undefined : 0;

  return (
    <g>
      <defs>
        {/* Lak */}
        <linearGradient id={id("body")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={PAINT.edge} />
          <stop offset="0.22" stopColor={PAINT.mid} />
          <stop offset="0.5" stopColor={PAINT.light} />
          <stop offset="0.78" stopColor={PAINT.mid} />
          <stop offset="1" stopColor={PAINT.edge} />
        </linearGradient>
        <linearGradient id={id("sheen")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={id("hood")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.09" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* Glas */}
        <linearGradient id={id("glass")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1d2a38" />
          <stop offset="0.5" stopColor="#090c11" />
          <stop offset="1" stopColor="#131c27" />
        </linearGradient>
        <linearGradient id={id("pano")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#26394d" />
          <stop offset="0.42" stopColor="#0a0f16" />
          <stop offset="0.58" stopColor="#0a0f16" />
          <stop offset="1" stopColor="#1a2634" />
        </linearGradient>
        {/* Licht */}



























                <linearGradient
          id={id("beam")}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="-58"
          x2="0"
          y2="-420"
        >
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.3" stopColor="#f6ffd0" stopOpacity="0.38" />
          <stop offset="1" stopColor="#f6ffd0" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={id("rev")}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="59"
          x2="0"
          y2="135"
        >
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id("headGlow")}>
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="0.45" stopColor="#f6ffd0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f6ffd0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("brake")}>
          <stop offset="0" stopColor="#ff2b2b" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ff2b2b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("revGlow")}>
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("amber")}>
          <stop offset="0" stopColor="#ffb020" stopOpacity="1" />
          <stop offset="1" stopColor="#ffb020" stopOpacity="0" />
        </radialGradient>



                {/* Filters */}
        <filter id={id("beamBlur")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={id("blur3")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={id("blur1")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" />
        </filter>
        <filter id={id("shadow")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* ---------- Schaduw onder de auto ---------- */}
      <rect
        x={-27}
        y={-58}
        width={54}
        height={124}
        rx={15}
        fill="#000"
        opacity={0.55}
        filter={url("shadow")}
        transform="translate(3 5)"
      />































                                    {/* ---------- GROOT LICHT & ACHTERUITRIJLICHT ---------- */}
      {sides.map((s) => (
        <g key={`beams${s}`} transform={flip(s)} style={{ mixBlendMode: "screen" }}>
          {/* Groot licht straal */}
          <path
            d="M 11 -55 L 23 -50 L 200 -400 L -1 -400 Z"
            fill={url("beam")}
            filter={url("beamBlur")}
            style={fade(headlights, 300, beamStrength,)}
          />
          {/* Achteruitrijlicht straal */}
          <path
            d="M 4 59 L 10 59 L 30 135 L -5 135 Z"
            fill={url("rev")}
            filter={url("beamBlur")}
            style={fade(reversing, 200, 0.6)}
          />
        </g>
      ))}










      {/* ---------- REM-/ACHTERLICHT GLOED ---------- */}
      {sides.map((s) => (
        <ellipse
          key={`bg${s}`}
          cx={17 * s}
          cy={61}
          rx={12}
          ry={7}
          fill={url("brake")}
          style={{
            opacity: braking ? 1 : 0.28,
            transition: "opacity 180ms ease",
          }}
        />
      ))}

      {/* ---------- BANDEN ---------- */}
      {/* achter (staan vast) */}
      {sides.map((s) => (
        <g key={`rw${s}`} transform={flip(s)}>
          <rect x={21.5} y={29} width={6} height={18} rx={2.5} fill="#050506" />
        </g>
      ))}
      {/* voor (sturen mee met de bocht via refs) */}
      <g ref={wheelLRef}>
        <rect x={-27.5} y={-44} width={6} height={18} rx={2.5} fill="#050506" />
      </g>
      <g ref={wheelRRef}>
        <rect x={21.5} y={-44} width={6} height={18} rx={2.5} fill="#050506" />
      </g>

      {/* ---------- CARROSSERIE ---------- */}
      <path d={BODY_D} fill={url("body")} />
      <path d={BODY_D} fill={url("sheen")} />
      <path
        d={BODY_D}
        fill="none"
        stroke="rgba(255,255,255,0.26)"
        strokeWidth={0.5}
      />

      {/* ---------- MOTORKAP ---------- */}
      <path
        d="M -21.5 -57.8 C -10 -59.6 10 -59.6 21.5 -57.8 L 22.6 -25.5 C 12 -24 -12 -24 -22.6 -25.5 Z"
        fill={url("hood")}
        stroke="rgba(255,255,255,0.09)"
        strokeWidth={0.4}
      />
      {/* Twee lengte-ribben op de kap */}
      {sides.map((s) => (
        <path
          key={`crease${s}`}
          d="M 14 -55 C 14.4 -45 14 -35 13 -26.5"
          fill="none"
          stroke="rgba(255,255,255,0.13)"
          strokeWidth={0.5}
          strokeLinecap="round"
          transform={flip(s)}
        />
      ))}

      {/* Grille (single-frame vorm, onderaan de neus) */}
      <path
        d="M -9 -59.6 C -4 -60.5 4 -60.5 9 -59.6 L 7.8 -57.6 C 3 -58.3 -3 -58.3 -7.8 -57.6 Z"
        fill="#07080a"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={0.3}
      />

      {/* ---------- JOUW LOGO OP DE MOTORKAP ----------
          180° gedraaid: de auto rijdt "naar beneden" over het scherm, dus zo
          staat het logo voor de kijker rechtop. */}
      <g transform="rotate(180 0 -41.5)">
        <image
          href={LOGO_SRC}
          x={-10.5}
          y={-52}
          width={21}
          height={21}
          preserveAspectRatio="xMidYMid meet"
          style={{ filter: "drop-shadow(0 0 1.4px rgba(204,255,0,0.55))" }}
        />
      </g>

      {/* ---------- KOPLAMPEN (LED, scherpe Audi-look) ---------- */}
      {sides.map((s) => (
        <g key={`hl${s}`} transform={flip(s)}>
          {/* Gloed rondom de lamp bij groot licht */}
          <ellipse
            cx={15}
            cy={-55}
            rx={11}
            ry={6.5}
            fill={url("headGlow")}
            style={{
              opacity: headlights ? 0.95 : 0.12,
              transition: "opacity 220ms ease",
            }}
          />
          <path
            d="M 9.5 -57.3 C 15.5 -57.4 20.8 -55.8 23.2 -50.5 C 24 -48.6 24.4 -46.6 24.6 -44.8 C 19.5 -47.8 14.2 -50.6 9.5 -53.6 Z"
            fill="#06080a"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={0.35}
          />
          {/* Dagrijverlichting (altijd aan) */}
          <path
            d="M 11 -56 C 16 -55.9 20.5 -54.5 22.6 -50.3"
            fill="none"
            stroke="#e9f4ff"
            strokeWidth={0.9}
            strokeLinecap="round"
            opacity={0.95}
          />
          <path
            d="M 11.2 -54 C 15 -52.2 19.5 -49.8 23.6 -46.6"
            fill="none"
            stroke="#bcd7ff"
            strokeWidth={0.5}
            strokeLinecap="round"
            opacity={0.65}
          />
          {/* Grootlicht lens */}
          <circle
            cx={12.6}
            cy={-54.6}
            r={1.5}
            style={{
              fill: headlights ? "#fbffd6" : "#2a2f36",
              transition: "fill 200ms ease",
            }}
          />
          {/* Alarmlicht (voorhoek) */}
          <circle
            cx={23.6}
            cy={-47.5}
            r={3.4}
            fill={url("amber")}
            className={hzClass}
            opacity={hzOpacity}
          />
        </g>
      ))}

      {/* ---------- VOORRUIT ---------- */}
      <path
        d="M -21 -25.8 C -10 -28.2 10 -28.2 21 -25.8 L 20.4 -25.2 C 10 -27.6 -10 -27.6 -20.4 -25.2 Z"
        fill="#0a0b0d"
      />
      <path
        d="M -20.4 -25.2 C -10 -27.6 10 -27.6 20.4 -25.2 L 17.9 -4.2 C 9 -5.4 -9 -5.4 -17.9 -4.2 Z"
        fill={url("glass")}
        stroke="rgba(255,255,255,0.14)"
        strokeWidth={0.4}
      />
      {/* Reflectie in de voorruit */}
      <path
        d="M -15 -25.5 L -4.5 -26.2 L -9.5 -5 L -16.5 -5.2 Z"
        fill="#fff"
        opacity={0.06}
      />
      {/* Ruitenwissers */}
      <path
        d="M -18.8 -25.4 C -12 -25.9 -4 -25.6 3 -24.6"
        fill="none"
        stroke="#050506"
        strokeWidth={0.9}
        strokeLinecap="round"
      />

      {/* ---------- DAK ---------- */}
      {/* zijruiten (heel dun zichtbaar) */}
      <path
        d="M -19.6 -4 L 19.6 -4 C 20.4 6 20 22 18.4 31 L -18.4 31 C -20 22 -20.4 6 -19.6 -4 Z"
        fill="#07090c"
      />
      {/* dakpaneel */}
      <path
        d="M -17.5 -3.5 C -10 -4.5 10 -4.5 17.5 -3.5 C 18.6 5 18.2 20 16.8 29.5 C 8 30.5 -8 30.5 -16.8 29.5 C -18.2 20 -18.6 5 -17.5 -3.5 Z"
        fill={url("body")}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={0.4}
      />
      <path
        d="M -17.5 -3.5 C -10 -4.5 10 -4.5 17.5 -3.5 C 18.6 5 18.2 20 16.8 29.5 C 8 30.5 -8 30.5 -16.8 29.5 C -18.2 20 -18.6 5 -17.5 -3.5 Z"
        fill={url("sheen")}
      />

      {/* ---------- PANORAMADAK ---------- */}
      <path
        d="M -14.5 -1.6 C -8 -2.4 8 -2.4 14.5 -1.6 C 15.4 6 15 18 14 27 C 7 27.8 -7 27.8 -14 27 C -15 18 -15.4 6 -14.5 -1.6 Z"
        fill={url("pano")}
        stroke="#000"
        strokeWidth={0.5}
      />
      {/* scheiding tussen voorste en achterste glasdeel */}
      <path
        d="M -14.9 11 C -5 10.4 5 10.4 14.9 11"
        fill="none"
        stroke="#1b2027"
        strokeWidth={1.1}
      />
      {/* zonnereflecties */}
      <path d="M -12 25.5 L 5 -1.8 L 9.5 -1.8 L -7.5 26.6 Z" fill="#fff" opacity={0.07} />
      <path d="M -4 26.8 L 10 4 L 12 4 L -1.5 27 Z" fill="#fff" opacity={0.05} />

      {/* Shark-fin antenne */}
      <ellipse
        cx={0}
        cy={28.3}
        rx={1.1}
        ry={1.7}
        fill="#0a0b0d"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={0.25}
      />

      {/* ---------- ACHTERRUIT ---------- */}
      <path
        d="M -15.4 30.5 C -8 31.3 8 31.3 15.4 30.5 L 17.6 45.5 C 9 46.6 -9 46.6 -17.6 45.5 Z"
        fill={url("glass")}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={0.4}
      />
      {/* ontwasemings-draadjes */}
      {[34.5, 37.8, 41.1, 44.2].map((y) => (
        <path
          key={y}
          d={`M -16.4 ${y} Q 0 ${y + 0.8} 16.4 ${y}`}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={0.3}
        />
      ))}
      {/* kofferklep-naad */}
      <path
        d="M -17 50 Q 0 51.2 17 50"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={0.4}
      />

      {/* ---------- OETTINGER DAKSPOILER ---------- */}
      {/* schaduw op de achterruit */}
      <path
        d="M -20 32.4 C -9 30.8 9 30.8 20 32.4 L 20.8 41 C 9.5 39.4 -9.5 39.4 -20.8 41 Z"
        fill="#000"
        opacity={0.4}
        filter={url("blur1")}
      />
      {/* zij-eindplaten */}
      {sides.map((s) => (
        <path
          key={`ep${s}`}
          d="M 20.6 30.4 L 23.6 31.2 L 24.2 40.2 L 21.4 38.4 Z"
          fill="#0b0c0e"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={0.3}
          transform={flip(s)}
        />
      ))}
      {/* hoofdvleugel */}
      <path
        d="M -20.6 30.4 C -9 28.8 9 28.8 20.6 30.4 L 21.4 38.4 C 9.5 36.9 -9.5 36.9 -21.4 38.4 Z"
        fill="#0b0c0e"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth={0.4}
      />
      {/* glans bovenop */}
      <path
        d="M -19 31.2 C -8 29.8 8 29.8 19 31.2 L 19.6 33.4 C 8 31.9 -8 31.9 -19.6 33.4 Z"
        fill="#fff"
        opacity={0.13}
      />
      {/* gurney-lip met merk-accent (weghalen = klassiek zwart) */}
      <path
        d="M -21.2 38 C -9.5 36.5 9.5 36.5 21.2 38"
        fill="none"
        stroke={LIME}
        strokeWidth={0.7}
        strokeLinecap="round"
        opacity={0.95}
      />

      {/* ---------- ACHTERLICHTEN (LED, rondom de hoek) ---------- */}
      {sides.map((s) => (
        <g key={`tl${s}`} transform={flip(s)}>
          <path
            d="M 11.4 58.9 C 16.5 58.9 21 57.3 23.4 53.8 C 24.3 52.2 24.8 50.2 25 48.2 C 21 50.2 16.2 51.8 11.4 52.2 Z"
            fill="#4a0910"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={0.3}
          />
          <path
            d="M 12 57.2 C 16.5 57 20.8 55.6 23.5 52"
            fill="none"
            stroke="#ff3a3a"
            strokeWidth={0.9}
            strokeLinecap="round"
            style={{
              opacity: braking ? 1 : 0.6,
              transition: "opacity 180ms ease",
            }}
          />
          <path
            d="M 12 54.3 C 16 53.9 20 52.7 23.8 50.1"
            fill="none"
            stroke="#ff3a3a"
            strokeWidth={0.5}
            strokeLinecap="round"
            style={{
              opacity: braking ? 0.9 : 0.4,
              transition: "opacity 180ms ease",
            }}
          />
          {/* Achteruitrijlamp in de bumper */}
          <ellipse
            cx={6.8}
            cy={59.6}
            rx={5}
            ry={2.6}
            fill={url("revGlow")}
            style={fade(reversing, 140, 0.9)}
          />
          <rect
            x={4}
            y={58.7}
            width={5.6}
            height={1.4}
            rx={0.6}
            style={{
              fill: reversing ? "#ffffff" : "#3a2a2c",
              transition: "fill 140ms ease",
            }}
          />
          {/* Uitlaatsierstuk */}
          <ellipse
            cx={15.5}
            cy={61.2}
            rx={3.2}
            ry={1.1}
            fill="#b4bcc8"
            stroke="#4b5563"
            strokeWidth={0.3}
          />
          {/* Alarmlicht (achterhoek) */}
          <circle
            cx={24.4}
            cy={51.5}
            r={3.4}
            fill={url("amber")}
            className={hzClass}
            opacity={hzOpacity}
          />
        </g>
      ))}

      {/* ---------- SPIEGELS ---------- */}
      {sides.map((s) => (
        <g key={`mir${s}`} transform={flip(s)}>
          <path
            d="M 24.2 -24.6 C 26.5 -27 31.4 -26.5 32 -23.2 C 32.4 -20.4 29.6 -18.4 25 -19.6 Z"
            fill={PAINT.mid}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={0.35}
          />
          <path
            d="M 26.2 -24.4 C 28.6 -25.2 31 -24.4 31.2 -22.6 C 31.2 -21 29 -20.2 26.2 -21 Z"
            fill="#0e1013"
          />
          <circle
            cx={31.2}
            cy={-22.8}
            r={2.6}
            fill={url("amber")}
            className={hzClass}
            opacity={hzOpacity}
          />
        </g>
      ))}
    </g>
  );
}

/* ==========================================================================
   HOOFDCOMPONENT
   ========================================================================== */




export default function RoadmapSteps() {
  const roadAreaRef = useRef<HTMLDivElement>(null);
  const deskRef = useRef<HTMLDivElement>(null);
  const mobLineRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const carRef = useRef<SVGGElement>(null);
  const wheelLRef = useRef<SVGGElement>(null);
  const wheelRRef = useRef<SVGGElement>(null);
  const deskCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mobCardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Positie van elk kaartje langs de route, als fractie 0..1
  const stopFracs = useRef<number[]>([0.1, 0.5, 0.95]);
  const prevProgress = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeStep, setActiveStep] = useState(0);
  const [headlights, setHeadlights] = useState(false);
  const [parked, setParked] = useState(false);
  const [drive, setDrive] = useState<DriveState>("idle");

  const { scrollYProgress } = useScroll({
    target: roadAreaRef,
    offset: ["start center", "end center"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  const mobileLineHeight = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);

  /* ---- Meet waar de kaartjes staan, zodat de lichten exact kloppen ---- */
  const measure = useCallback(() => {
    const path = pathRef.current;
    const desk = deskRef.current;
    const fracs: number[] = [];

    if (desk && desk.offsetHeight > 0 && path) {
      const box = desk.getBoundingClientRect();
      const total = path.getTotalLength();
      const N = 240;
      const ys: number[] = [];
      for (let i = 0; i <= N; i++) {
        ys.push(path.getPointAtLength((i / N) * total).y);
      }
      deskCardRefs.current.forEach((el) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cy = ((r.top + r.height / 2 - box.top) / box.height) * VIEW_H;
        let best = 0;
        let bestD = Infinity;
        ys.forEach((y, i) => {
          const d = Math.abs(y - cy);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        fracs.push(best / N);
      });
    } else if (mobLineRef.current) {
      const box = mobLineRef.current.getBoundingClientRect();
      if (box.height > 0) {
        mobCardRefs.current.forEach((el) => {
          if (!el) return;
          const r = el.getBoundingClientRect();
          const f = (r.top + r.height / 2 - box.top) / box.height;
          fracs.push(Math.min(Math.max(f, 0), 1));
        });
      }
    }

    if (fracs.length) stopFracs.current = fracs;
  }, []);

  /* ---- Auto positioneren + lichten bepalen ---- */
  const updateCar = useCallback((progress: number) => {
    const p = Math.min(Math.max(progress, 0), 1);
    const path = pathRef.current;
    const car = carRef.current;

    if (path && car) {
      const total = path.getTotalLength();
      const len = p * total;
      const pt = path.getPointAtLength(len);
      const back = path.getPointAtLength(Math.max(len - LOOK, 0));
      const ahead = path.getPointAtLength(Math.min(len + LOOK, total));
      const heading =
        Math.atan2(ahead.y - back.y, ahead.x - back.x) * (180 / Math.PI);

      // Neus van de auto wijst in lokale coördinaten omhoog => +90°
      car.setAttribute(
        "transform",
        `translate(${pt.x.toFixed(2)} ${pt.y.toFixed(2)}) rotate(${(heading + 90).toFixed(2)})`
      );

      // Voorwielen sturen mee met de bocht
      const span = Math.min(STEER_SPAN, len, total - len);
      let steer = 0;
      if (span > 4) {
        const a1 = path.getPointAtLength(len - span);
        const a3 = path.getPointAtLength(len + span);
        const h1 = Math.atan2(pt.y - a1.y, pt.x - a1.x);
        const h2 = Math.atan2(a3.y - pt.y, a3.x - pt.x);
        let d = (h2 - h1) * (180 / Math.PI);
        while (d > 180) d -= 360;
        while (d < -180) d += 360;
        steer = Math.max(-26, Math.min(26, d * 0.9));
      }
























            wheelLRef.current?.setAttribute("transform", `rotate(${steer.toFixed(1)} -24.5 -35)`);
      wheelRRef.current?.setAttribute("transform", `rotate(${steer.toFixed(1)} 24.5 -35)`);
    }

    const stops = stopFracs.current;
    const isParked = p >= PARK_AT;
    const near = stops.some((f) => Math.abs(p - f) < NEAR_FRAC);
    setParked(isParked);
    setHeadlights(near && !isParked);

    let lit = 0;
    stops.forEach((f, i) => {
      if (p >= f - LEAD_FRAC) lit = i + 1;
    });
    setActiveStep(lit);
  }, []);

  useMotionValueEvent(smoothProgress, "change", (latest) => {
    const delta = latest - prevProgress.current;
    prevProgress.current = latest;

    if (Math.abs(delta) > 0.00012) {
      setDrive(delta > 0 ? "forward" : "reverse");
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setDrive("idle"), IDLE_DELAY);
    }
    updateCar(latest);
  });

  useEffect(() => {
    const run = () => {
      measure();
      updateCar(smoothProgress.get());
    };
    run();
    const t = setTimeout(run, 400);
    window.addEventListener("resize", run);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(run) : null;
    if (ro && roadAreaRef.current) ro.observe(roadAreaRef.current);
    (document as any).fonts?.ready?.then(run);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", run);
      ro?.disconnect();
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [measure, updateCar, smoothProgress]);

  const positions = [
    "top-[2%] left-0", // Stap 1: links boven
    "top-[40%] right-0", // Stap 2: rechts midden
    "bottom-[2%] left-0", // Stap 3: links onder
  ];

  return (













        <section
      className="relative py-24 overflow-hidden bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.05),transparent_50%)] text-paper"
    >
      <style>{COMPONENT_CSS}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* TITEL */}
        <div className="text-center mb-20">
          <h2 className="font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl uppercase tracking-tight mb-4">
            In 3 stappen naar je <span className="text-jade">rijbewijs</span>
          </h2>
          <p className="text-paper/70 text-lg sm:text-xl max-w-2xl mx-auto">
            Geen saaie boeken, maar een slim systeem dat jou voorbereidt op het échte werk.
          </p>
        </div>

        {/* SCROLL-TRACKER */}
        <div ref={roadAreaRef} className="relative">
          {/* ================= DESKTOP ================= */}
          <div
            ref={deskRef}
            className="hidden lg:block relative w-full max-w-6xl mx-auto"
            style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
          >
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <filter id="tp-road-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" />
                </filter>
              </defs>

              {/* Onzichtbaar meetpad (voor positie + richting van de auto) */}
              <path ref={pathRef} d={ROAD_PATH} fill="none" stroke="none" />

              {/* Asfalt met witte kantlijnen */}
              <path d={ROAD_PATH} stroke="#2a2d33" strokeWidth={86} strokeLinecap="round" />
              <path d={ROAD_PATH} stroke="#14161a" strokeWidth={80} strokeLinecap="round" />
              {/* Middenstreep */}
              <path
                d={ROAD_PATH}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={2.5}
                strokeDasharray="14 18"
              />

              {/* ---------- CBR PARKEERPLAATS ---------- */}
              <g>
                {/* verharding */}
                <rect x={436} y={735} width={128} height={178} rx={14} fill="#14161a" />
                {/* gloed als je geparkeerd staat */}
                <rect
                  x={462}
                  y={766}
                  width={76}
                  height={136}
                  fill={JADE}
                  style={{
                    opacity: parked ? 0.14 : 0,
                    transition: "opacity 500ms ease",
                  }}
                />
                {/* vaklijnen */}
                <path
                  d="M 462 758 L 462 902 L 538 902 L 538 758"
                  stroke={parked ? JADE : "rgba(255,255,255,0.6)"}
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  style={{
                    transition: "stroke 400ms ease",
                    filter: parked ? "drop-shadow(0 0 6px rgba(16,185,129,0.9))" : "none",
                  }}
                />
                {/* bandenstopper */}
                <rect x={482} y={894} width={36} height={5} rx={2} fill="#52525b" />

                {/* Blauw P-bord met CBR-plaatje */}
                <g transform="translate(554 782)">
                  <rect x={17} y={42} width={4} height={28} rx={2} fill="#52525b" />
                  <rect
                    x={0}
                    y={0}
                    width={38}
                    height={38}
                    rx={6}
                    fill="#1e40af"
                    stroke="#fff"
                    strokeWidth={2.5}
                  />
                  <text
                    x={19}
                    y={29}
                    textAnchor="middle"
                    fontSize={27}
                    fontWeight={800}
                    fill="#fff"
                    fontFamily="Arial, Helvetica, sans-serif"
                  >
                    P
                  </text>
                  <rect
                    x={-9}
                    y={43}
                    width={56}
                    height={20}
                    rx={4}
                    fill="#0f172a"
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth={1.5}
                  />
                  <text
                    x={19}
                    y={57.5}
                    textAnchor="middle"
                    fontSize={12.5}
                    fontWeight={800}
                    letterSpacing={2}
                    fill="#fff"
                    fontFamily="Arial, Helvetica, sans-serif"
                  >
                    CBR
                  </text>
                </g>

                {/* "GESLAAGD!" pop-up */}
                <motion.g
                  initial={false}
                  animate={{ opacity: parked ? 1 : 0, scale: parked ? 1 : 0.6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                >
                  <rect x={546} y={738} width={108} height={28} rx={14} fill={LIME} />
                  <text
                    x={600}
                    y={757}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={800}
                    letterSpacing={1.5}
                    fill="#0a0a0b"
                    className="font-display"
                  >
                    GESLAAGD!
                  </text>
                </motion.g>
              </g>

              {/* Groene voortgangslijn (zoals voorheen) */}
              <motion.path
                d={ROAD_PATH}
                stroke={JADE}
                strokeWidth={4}
                strokeLinecap="round"
                style={{
                  pathLength: smoothProgress,
                  filter: "drop-shadow(0 0 12px rgba(16, 185, 129, 0.8))",
                }}
              />

              {/* ---------- DE AUDI A3 ---------- */}
              <g ref={carRef} transform="translate(500 60) rotate(180)">
                <AudiA3Top
                  headlights={headlights}
                  drive={drive}
                  parked={parked}
                  wheelLRef={wheelLRef}
                  wheelRRef={wheelRRef}
                />
              </g>
            </svg>

            {/* DE 3 STAPPEN-KAARTEN */}
            {steps.map((step, index) => {
              const isActive = activeStep >= index + 1;
              return (
                <div
                  key={step.num}
                  ref={(el) => {
                    deskCardRefs.current[index] = el;
                  }}
                  className={`absolute w-[320px] xl:w-[380px] p-7 rounded-3xl border backdrop-blur-xl transition-all duration-500 ${positions[index]} ${
                    isActive
                      ? "border-jade/60 bg-ink/90 shadow-[0_0_35px_rgba(16,185,129,0.15)] scale-100 opacity-100"
                      : "border-white/10 bg-ink/40 scale-95 opacity-40"
                  }`}
                >
                  {step.sticker && (
                    <motion.div
                      animate={floatAnimation}
                      className="absolute -top-10 -right-8 w-24 h-24 pointer-events-none drop-shadow-xl z-20"
                    >
                      <Image
                        src={step.sticker}
                        alt=""
                        width={200}
                        height={200}
                        className="w-full h-auto rotate-12"
                      />
                    </motion.div>
                  )}

                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-extrabold text-xl border-2 transition-colors duration-300 ${
                        isActive
                          ? "border-lime bg-lime text-ink shadow-[0_0_20px_rgba(204,255,0,0.5)]"
                          : "border-jade/40 text-jade bg-ink"
                      }`}
                    >
                      {step.num}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-jade">
                      Stap 0{step.num}
                    </span>
                  </div>
                  <h3 className="font-display font-extrabold text-2xl text-paper mb-2">
                    {step.title}
                  </h3>
                  <p className="text-paper/70 text-base leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>

          {/* ================= MOBIEL ================= */}
          <div className="lg:hidden relative pl-12 sm:pl-16 pb-32 space-y-16 max-w-lg mx-auto">
            {/* Weg */}
            <div className="absolute left-5 sm:left-6 top-2 bottom-16 w-1 -translate-x-1/2 bg-white/10">
              <div className="w-full h-full border-l-2 border-dashed border-white/20" />
              <motion.div
                className="absolute top-0 left-0 w-full bg-jade shadow-[0_0_12px_#10b981]"
                style={{ height: mobileLineHeight }}
              />
            </div>

            {/* Auto (zelfde A3, kleiner) */}
            <div
              ref={mobLineRef}
              className="absolute left-5 sm:left-6 top-2 bottom-16 w-0 z-20 pointer-events-none"
            >
              <motion.div
                className="absolute left-0 -translate-x-1/2 -translate-y-1/2"
                style={{ top: mobileLineHeight }}
              >
                <svg
                  viewBox="-34 -66 68 132"
                  className="w-[42px] h-auto overflow-visible"
                  aria-hidden="true"
                >
                  <g transform="rotate(180)">
                    <AudiA3Top
                      headlights={headlights}
                      drive={drive}
                      parked={parked}
                      beamStrength={0.35}
                    />
                  </g>
                </svg>
              </motion.div>
            </div>

            {/* Kaartjes */}
            {steps.map((step, index) => {
              const isActive = activeStep >= index + 1;
              return (
                <div
                  key={step.num}
                  ref={(el) => {
                    mobCardRefs.current[index] = el;
                  }}
                  className={`relative p-6 rounded-2xl border transition-all duration-300 ${
                    isActive
                      ? "border-jade/60 bg-white/[0.06] shadow-[0_0_25px_rgba(16,185,129,0.12)]"
                      : "border-white/10 bg-white/[0.02] opacity-50"
                  }`}
                >
                  {step.sticker && (
                    <motion.div
                      animate={floatAnimation}
                      className="absolute -top-8 -right-4 w-20 h-20 pointer-events-none drop-shadow-xl z-20"
                    >
                      <Image
                        src={step.sticker}
                        alt=""
                        width={160}
                        height={160}
                        className="w-full h-auto rotate-12"
                      />
                    </motion.div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm ${
                        isActive ? "bg-lime text-ink" : "border border-jade text-jade"
                      }`}
                    >
                      {step.num}
                    </span>
                    <h3 className="font-display font-extrabold text-lg text-paper">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-paper/70 text-sm sm:text-base">{step.desc}</p>
                </div>
              );
            })}

            {/* CBR-parkeervak onderaan */}
            <div
              className={`absolute left-5 sm:left-6 bottom-0 h-32 w-[60px] -translate-x-1/2 rounded-b-xl border-2 border-t-0 transition-colors duration-500 ${
                parked
                  ? "border-jade bg-jade/10 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  : "border-white/40"
              }`}
            />
            <div className="absolute left-[64px] sm:left-[80px] bottom-6 flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-md bg-blue-800 border-2 border-white flex items-center justify-center text-white font-extrabold text-xl leading-none">
                  P
                </div>
                <div className="mt-1 px-2 py-0.5 rounded bg-slate-900 border border-white/70 text-white text-[10px] font-extrabold tracking-widest">
                  CBR
                </div>
              </div>
              <motion.div
                initial={false}
                animate={{ opacity: parked ? 1 : 0, scale: parked ? 1 : 0.6 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="px-3 py-1 rounded-full bg-lime text-ink font-display font-extrabold text-xs tracking-wider"
              >
                GESLAAGD!
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}