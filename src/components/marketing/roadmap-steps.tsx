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
import dynamic from "next/dynamic";
import type { CarState } from "./Car3D";

const Car3D = dynamic(() => import("./Car3D"), { ssr: false });

/* ==========================================================================
   CONFIG
   ========================================================================== */

const LOGO_SRC = "/brand/png/svg/logo-upright-d-los-groen.svg";

const FINISH_AT = 0.78; // op dit punt van het scrollen staat de auto al in het vak

const LIME = "#ccff00";
const JADE = "#10b981";

const PAINT = { edge: "#14161a", mid: "#2c3038", light: "#3d424c" };

const VIEW_W = 1000;
const VIEW_H = 1060;

const ROAD_PATH =
  "M 500 60 C 500 175, 370 175, 370 290 C 370 450, 560 450, 560 610 C 560 740, 460 740, 460 885";

const NEAR_FRAC = 0.09; 
const LEAD_FRAC = 0.12; 
const PARK_AT = 0.985; 
const LOOK = 12; 
const STEER_SPAN = 60; 
const IDLE_DELAY = 160; 

type DriveState = "idle" | "forward" | "reverse";

// true  = oude 3D-auto (Car3D)
// false = auto in dezelfde SVG als de weg (staat altijd exact op de baan)
const USE_3D_CAR = true;
const CAR_SCALE = 0.72;

const steps = [
  {
    num: "1",
    tag: "THEORIE & INZICHT",
    title: "KIJK & LEER",
    desc: "Leer en begrijp de verkeersregels met interactieve video's en betrouwbare uitleg.",
    sticker: "/brand/png/svg/sticker-play.svg",
    meta: "Videocursus • Cheat Sheets",
  },
  {
    num: "2",
    tag: "SIMULATIE & GEVAARHERKENNING",
    title: "TEST JE KENNIS",
    desc: "Start direct met oefenen en ontdek of jij klaar bent voor het CBR-examen.",
    sticker: "/brand/png/svg/sticker-thumbsup.svg",
    meta: "Realistische CBR-proefexamens",
  },
  {
    num: "3",
    tag: "EXAMENDAG",
    title: "OWN DE WEG",
    desc: "Loop met vertrouwen de examenzaal in en haal in één keer je theorie.",
    sticker: "/brand/png/svg/sticker-rijbewijs.svg",
    meta: "Bestemming: CBR Examencentrum",
  },
];

const floatAnimation: any = {
  y: [-5, 5, -5],
  rotate: [-2, 2, -2],
  transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
};

const COMPONENT_CSS = `
@keyframes tp-blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
@keyframes tp-led-flow {
  0% { stroke-dashoffset: 24; }
  100% { stroke-dashoffset: 0; }
}
.tp-hazard { animation: tp-blink .9s steps(1, end) infinite; }
.tp-led-walk { animation: tp-led-flow 1s linear infinite; }
@media (prefers-reduced-motion: reduce) { .tp-hazard, .tp-led-walk { animation: none; opacity: .9; } }
`;

/* ==========================================================================
   AUDI A3 (8V) — bovenaanzicht voor mobiele weergave
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

  const hzClass = parked ? "tp-hazard" : undefined;
  const hzOpacity = parked ? undefined : 0;

  return (
    <g>
      <defs>
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
        <linearGradient id={id("beam")} gradientUnits="userSpaceOnUse" x1="0" y1="-58" x2="0" y2="-420">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.3" stopColor="#f6ffd0" stopOpacity="0.38" />
          <stop offset="1" stopColor="#f6ffd0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id("rev")} gradientUnits="userSpaceOnUse" x1="0" y1="59" x2="0" y2="135">
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
        <filter id={id("beamBlur")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={id("blur1")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" />
        </filter>
        <filter id={id("shadow")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <rect x={-27} y={-58} width={54} height={124} rx={15} fill="#000" opacity={0.55} filter={url("shadow")} transform="translate(3 5)" />

      {sides.map((s) => (
        <g key={`beams${s}`} transform={flip(s)} style={{ mixBlendMode: "screen" }}>
          <path d="M 11 -55 L 23 -50 L 200 -400 L -1 -400 Z" fill={url("beam")} filter={url("beamBlur")} style={fade(headlights, 300, beamStrength)} />
          <path d="M 4 59 L 10 59 L 30 135 L -5 135 Z" fill={url("rev")} filter={url("beamBlur")} style={fade(reversing, 200, 0.6)} />
        </g>
      ))}

      {sides.map((s) => (
        <ellipse key={`bg${s}`} cx={17 * s} cy={61} rx={12} ry={7} fill={url("brake")} style={{ opacity: braking ? 1 : 0.28, transition: "opacity 180ms ease" }} />
      ))}

      {sides.map((s) => (
        <g key={`rw${s}`} transform={flip(s)}>
          <rect x={21.5} y={29} width={6} height={18} rx={2.5} fill="#050506" />
        </g>
      ))}
      <g ref={wheelLRef}>
        <rect x={-27.5} y={-44} width={6} height={18} rx={2.5} fill="#050506" />
      </g>
      <g ref={wheelRRef}>
        <rect x={21.5} y={-44} width={6} height={18} rx={2.5} fill="#050506" />
      </g>

      <path d={BODY_D} fill={url("body")} />
      <path d={BODY_D} fill={url("sheen")} />
      <path d={BODY_D} fill="none" stroke="rgba(255,255,255,0.26)" strokeWidth={0.5} />

      <path d="M -21.5 -57.8 C -10 -59.6 10 -59.6 21.5 -57.8 L 22.6 -25.5 C 12 -24 -12 -24 -22.6 -25.5 Z" fill={url("hood")} stroke="rgba(255,255,255,0.09)" strokeWidth={0.4} />
      {sides.map((s) => (
        <path key={`crease${s}`} d="M 14 -55 C 14.4 -45 14 -35 13 -26.5" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={0.5} strokeLinecap="round" transform={flip(s)} />
      ))}

      <path d="M -9 -59.6 C -4 -60.5 4 -60.5 9 -59.6 L 7.8 -57.6 C 3 -58.3 -3 -58.3 -7.8 -57.6 Z" fill="#07080a" stroke="rgba(255,255,255,0.35)" strokeWidth={0.3} />

      <g transform="rotate(180 0 -41.5)">
        <image href={LOGO_SRC} x={-10.5} y={-52} width={30} height={30} preserveAspectRatio="xMidYMid meet" style={{ filter: "drop-shadow(0 0 1.4px rgba(204,255,0,0.55))" }} />
      </g>

      {sides.map((s) => (
        <g key={`hl${s}`} transform={flip(s)}>
          <ellipse cx={15} cy={-55} rx={11} ry={6.5} fill={url("headGlow")} style={{ opacity: headlights ? 0.95 : 0.12, transition: "opacity 220ms ease" }} />
          <path d="M 9.5 -57.3 C 15.5 -57.4 20.8 -55.8 23.2 -50.5 C 24 -48.6 24.4 -46.6 24.6 -44.8 C 19.5 -47.8 14.2 -50.6 9.5 -53.6 Z" fill="#06080a" stroke="rgba(255,255,255,0.4)" strokeWidth={0.35} />
          <path d="M 11 -56 C 16 -55.9 20.5 -54.5 22.6 -50.3" fill="none" stroke="#e9f4ff" strokeWidth={0.9} strokeLinecap="round" opacity={0.95} />
          <path d="M 11.2 -54 C 15 -52.2 19.5 -49.8 23.6 -46.6" fill="none" stroke="#bcd7ff" strokeWidth={0.5} strokeLinecap="round" opacity={0.65} />
          <circle cx={12.6} cy={-54.6} r={1.5} style={{ fill: headlights ? "#fbffd6" : "#2a2f36", transition: "fill 200ms ease" }} />
          <circle cx={23.6} cy={-47.5} r={3.4} fill={url("amber")} className={hzClass} opacity={hzOpacity} />
        </g>
      ))}

      <path d="M -21 -25.8 C -10 -28.2 10 -28.2 21 -25.8 L 20.4 -25.2 C 10 -27.6 -10 -27.6 -20.4 -25.2 Z" fill="#0a0b0d" />
      <path d="M -20.4 -25.2 C -10 -27.6 10 -27.6 20.4 -25.2 L 17.9 -4.2 C 9 -5.4 -9 -5.4 -17.9 -4.2 Z" fill={url("glass")} stroke="rgba(255,255,255,0.14)" strokeWidth={0.4} />
      <path d="M -15 -25.5 L -4.5 -26.2 L -9.5 -5 L -16.5 -5.2 Z" fill="#fff" opacity={0.06} />
      <path d="M -18.8 -25.4 C -12 -25.9 -4 -25.6 3 -24.6" fill="none" stroke="#050506" strokeWidth={0.9} strokeLinecap="round" />

      <path d="M -19.6 -4 L 19.6 -4 C 20.4 6 20 22 18.4 31 L -18.4 31 C -20 22 -20.4 6 -19.6 -4 Z" fill="#07090c" />
      <path d="M -17.5 -3.5 C -10 -4.5 10 -4.5 17.5 -3.5 C 18.6 5 18.2 20 16.8 29.5 C 8 30.5 -8 30.5 -16.8 29.5 C -18.2 20 -18.6 5 -17.5 -3.5 Z" fill={url("body")} stroke="rgba(255,255,255,0.12)" strokeWidth={0.4} />
      <path d="M -17.5 -3.5 C -10 -4.5 10 -4.5 17.5 -3.5 C 18.6 5 18.2 20 16.8 29.5 C 8 30.5 -8 30.5 -16.8 29.5 C -18.2 20 -18.6 5 -17.5 -3.5 Z" fill={url("sheen")} />

      <path d="M -14.5 -1.6 C -8 -2.4 8 -2.4 14.5 -1.6 C 15.4 6 15 18 14 27 C 7 27.8 -7 27.8 -14 27 C -15 18 -15.4 6 -14.5 -1.6 Z" fill={url("pano")} stroke="#000" strokeWidth={0.5} />
      <path d="M -14.9 11 C -5 10.4 5 10.4 14.9 11" fill="none" stroke="#1b2027" strokeWidth={1.1} />
      <path d="M -12 25.5 L 5 -1.8 L 9.5 -1.8 L -7.5 26.6 Z" fill="#fff" opacity={0.07} />
      <path d="M -4 26.8 L 10 4 L 12 4 L -1.5 27 Z" fill="#fff" opacity={0.05} />
      <ellipse cx={0} cy={28.3} rx={1.1} ry={1.7} fill="#0a0b0d" stroke="rgba(255,255,255,0.25)" strokeWidth={0.25} />

      <path d="M -15.4 30.5 C -8 31.3 8 31.3 15.4 30.5 L 17.6 45.5 C 9 46.6 -9 46.6 -17.6 45.5 Z" fill={url("glass")} stroke="rgba(255,255,255,0.12)" strokeWidth={0.4} />
      {[34.5, 37.8, 41.1, 44.2].map((y) => (
        <path key={y} d={`M -16.4 ${y} Q 0 ${y + 0.8} 16.4 ${y}`} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={0.3} />
      ))}
      <path d="M -17 50 Q 0 51.2 17 50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.4} />

      <path d="M -20 32.4 C -9 30.8 9 30.8 20 32.4 L 20.8 41 C 9.5 39.4 -9.5 39.4 -20.8 41 Z" fill="#000" opacity={0.4} filter={url("blur1")} />
      {sides.map((s) => (
        <path key={`ep${s}`} d="M 20.6 30.4 L 23.6 31.2 L 24.2 40.2 L 21.4 38.4 Z" fill="#0b0c0e" stroke="rgba(255,255,255,0.22)" strokeWidth={0.3} transform={flip(s)} />
      ))}
      <path d="M -20.6 30.4 C -9 28.8 9 28.8 20.6 30.4 L 21.4 38.4 C 9.5 36.9 -9.5 36.9 -21.4 38.4 Z" fill="#0b0c0e" stroke="rgba(255,255,255,0.22)" strokeWidth={0.4} />
      <path d="M -19 31.2 C -8 29.8 8 29.8 19 31.2 L 19.6 33.4 C 8 31.9 -8 31.9 -19.6 33.4 Z" fill="#fff" opacity={0.13} />
      <path d="M -21.2 38 C -9.5 36.5 9.5 36.5 21.2 38" fill="none" stroke={LIME} strokeWidth={0.7} strokeLinecap="round" opacity={0.95} />

      {sides.map((s) => (
        <g key={`tl${s}`} transform={flip(s)}>
          <path d="M 11.4 58.9 C 16.5 58.9 21 57.3 23.4 53.8 C 24.3 52.2 24.8 50.2 25 48.2 C 21 50.2 16.2 51.8 11.4 52.2 Z" fill="#4a0910" stroke="rgba(255,255,255,0.22)" strokeWidth={0.3} />
          <path d="M 12 57.2 C 16.5 57 20.8 55.6 23.5 52" fill="none" stroke="#ff3a3a" strokeWidth={0.9} strokeLinecap="round" style={{ opacity: braking ? 1 : 0.6, transition: "opacity 180ms ease" }} />
          <path d="M 12 54.3 C 16 53.9 20 52.7 23.8 50.1" fill="none" stroke="#ff3a3a" strokeWidth={0.5} strokeLinecap="round" style={{ opacity: braking ? 0.9 : 0.4, transition: "opacity 180ms ease" }} />
          <ellipse cx={6.8} cy={59.6} rx={5} ry={2.6} fill={url("revGlow")} style={fade(reversing, 140, 0.9)} />
          <rect x={4} y={58.7} width={5.6} height={1.4} rx={0.6} style={{ fill: reversing ? "#ffffff" : "#3a2a2c", transition: "fill 140ms ease" }} />
          <ellipse cx={15.5} cy={61.2} rx={3.2} ry={1.1} fill="#b4bcc8" stroke="#4b5563" strokeWidth={0.3} />
          <circle cx={24.4} cy={51.5} r={3.4} fill={url("amber")} className={hzClass} opacity={hzOpacity} />
        </g>
      ))}

      {sides.map((s) => (
        <g key={`mir${s}`} transform={flip(s)}>
          <path d="M 24.2 -24.6 C 26.5 -27 31.4 -26.5 32 -23.2 C 32.4 -20.4 29.6 -18.4 25 -19.6 Z" fill={PAINT.mid} stroke="rgba(255,255,255,0.25)" strokeWidth={0.35} />
          <path d="M 26.2 -24.4 C 28.6 -25.2 31 -24.4 31.2 -22.6 C 31.2 -21 29 -20.2 26.2 -21 Z" fill="#0e1013" />
          <circle cx={31.2} cy={-22.8} r={2.6} fill={url("amber")} className={hzClass} opacity={hzOpacity} />
        </g>
      ))}
    </g>
  );
}

/* ==========================================================================
   HOOFDCOMPONENT
   ========================================================================== */
// Car3D tekent de auto steeds lager naarmate hij verder rijdt.
// [hoogte op de weg, extra afstand omlaag]
const CAR3D_Y_TABLE: [number, number][] = [
  [0, 0],
  [113, 5],
  [241, 75],
  [450, 50],
  [639, 90],
  [885, 97],
  [1100, 97],
];

function car3dOffset(y: number) {
  for (let i = 1; i < CAR3D_Y_TABLE.length; i++) {
    const [y0, o0] = CAR3D_Y_TABLE[i - 1];
    const [y1, o1] = CAR3D_Y_TABLE[i];
    if (y <= y1) return o0 + ((o1 - o0) * (y - y0)) / (y1 - y0);
  }
  return CAR3D_Y_TABLE[CAR3D_Y_TABLE.length - 1][1];
}

function car3dY(yTrue: number) {
  let s = yTrue;
  for (let i = 0; i < 4; i++) s = yTrue - car3dOffset(s);
  return s;
}

// Extra zijwaartse correctie van Car3D: [hoogte op de weg, eenheden naar rechts]
const CAR3D_X_TABLE: [number, number][] = [
  [0, 0],
  [113, 0],
  [241, 30],
  [450, 7],
  [639, 0],
  [1100, 0],
];

function car3dX(y: number) {
  for (let i = 1; i < CAR3D_X_TABLE.length; i++) {
    const [y0, o0] = CAR3D_X_TABLE[i - 1];
    const [y1, o1] = CAR3D_X_TABLE[i];
    if (y <= y1) return o0 + ((o1 - o0) * (y - y0)) / (y1 - y0);
  }
  return CAR3D_X_TABLE[CAR3D_X_TABLE.length - 1][1];
}

export default function RoadmapSteps() {
  const roadAreaRef = useRef<HTMLDivElement>(null);
  const deskRef = useRef<HTMLDivElement>(null);
  const mobLineRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const carWrapRef = useRef<HTMLDivElement>(null);
  const carGRef = useRef<SVGGElement>(null);
  const deskCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mobCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [cps, setCps] = useState([
    { x: 372, y: 235 },
    { x: 560, y: 530 },
    { x: 460, y: 840 },
  ]);
  const [marks, setMarks] = useState({
    teeth: { x: 372, y: 330, rot: 0 },
    zebra: { x: 485, y: 772, rot: 0 },
  });

  const stopFracs = useRef<number[]>([0.14, 0.52, 0.92]);
  const prevProgress = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeStep, setActiveStep] = useState(0);
  const [headlights, setHeadlights] = useState(false);
  const [parked, setParked] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
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

  const roadProgress = useTransform(smoothProgress, [0, FINISH_AT], [0, 1], { clamp: true });

  const carState = useRef<CarState>({
    x: 500,
    y: 60,
    heading: 90,
    steer: 0,
    headlights: false,
    drive: "idle",
    parked: false,
  });

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

    if (path) {
      const total = path.getTotalLength();
      const place = (targetY: number) => {
        const M = 800;
        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i <= M; i++) {
          const d = Math.abs(path.getPointAtLength((i / M) * total).y - targetY);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
        const len = (best / M) * total;
        const pt = path.getPointAtLength(len);
        const b = path.getPointAtLength(Math.max(len - LOOK, 0));
        const a = path.getPointAtLength(Math.min(len + LOOK, total));
        const heading = Math.atan2(a.y - b.y, a.x - b.x) * (180 / Math.PI);
        return { x: pt.x, y: pt.y, rot: heading - 90 };
      };
      setMarks({ teeth: place(335), zebra: place(735) });
      setCps(
        stopFracs.current.map((f) => {
          const pt = path.getPointAtLength(f * total);
          return { x: pt.x, y: pt.y };
        })
      );
    }
  }, []);

  const updateCar = useCallback((progress: number) => {
    const isDesk = !!deskRef.current && deskRef.current.offsetHeight > 0;
const raw = Math.min(Math.max(progress, 0), 1);
const p = isDesk ? Math.min(raw / FINISH_AT, 1) : raw;
    const carOpacity = String(Math.min(1, p / 0.03));
    if (carWrapRef.current) carWrapRef.current.style.opacity = carOpacity;
    if (carGRef.current) carGRef.current.style.opacity = carOpacity;
    const path = pathRef.current;

    if (path) {
      const total = path.getTotalLength();
      const len = p * total;
      const pt = path.getPointAtLength(len);
      const back = path.getPointAtLength(Math.max(len - LOOK, 0));
      const ahead = path.getPointAtLength(Math.min(len + LOOK, total));
      const heading =
        Math.atan2(ahead.y - back.y, ahead.x - back.x) * (180 / Math.PI);

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

      carState.current.x = pt.x;
carState.current.y = pt.y;
      carState.current.heading = heading; 
      carState.current.steer = steer;
      carGRef.current?.setAttribute(
        "transform",
        `translate(${pt.x.toFixed(2)} ${pt.y.toFixed(2)}) rotate(${(heading + 90).toFixed(2)}) scale(${CAR_SCALE})`
      );
    } 

    const stops = stopFracs.current;
    const isParked = p >= PARK_AT;
    const isGateOpen = p >= 0.78;
    const near = stops.some((f) => Math.abs(p - f) < NEAR_FRAC);

    setParked(isParked);
    setGateOpen(isGateOpen);
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
      idleTimer.current = setTimeout(() => {
        setDrive("idle");
      }, IDLE_DELAY);
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

  useEffect(() => {
    carState.current.headlights = headlights;
    carState.current.parked = parked;
    carState.current.drive = drive;
  }, [headlights, parked, drive]);

  const positions = [
    "top-[4%] left-0",
    "top-[38%] right-0",
    "bottom-[12%] left-0",
  ];

  return (
    <section className="relative py-28 overflow-hidden bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_60%)] text-paper">
      <style>{COMPONENT_CSS}</style>

      {/* Subtiele Tech-Grid achtergrond */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
                  <feGaussianBlur stdDeviation="8" />
                </filter>
                <filter id="tp-soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="14" />
                </filter>
                <radialGradient id="tp-lamp-pool" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={JADE} stopOpacity="0.22" />
                  <stop offset="55%" stopColor={LIME} stopOpacity="0.06" />
                  <stop offset="100%" stopColor={JADE} stopOpacity="0" />
                </radialGradient>
                <radialGradient id="tp-campus-aura" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={JADE} stopOpacity="0.18" />
                  <stop offset="65%" stopColor={LIME} stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="tp-roof-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#88877f" />
                  <stop offset="100%" stopColor="#686861" />
                </linearGradient>
                <linearGradient id="tp-atrium-glass" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7b9298" />
                  <stop offset="50%" stopColor="#26373d" />
                  <stop offset="100%" stopColor="#536a70" />
                </linearGradient>
              </defs>

              {/* Onzichtbaar meetpad */}
              <path ref={pathRef} d={ROAD_PATH} fill="none" stroke="none" />

              {/* Sfeerlichten */}
              <ellipse cx="720" cy="830" rx="260" ry="190" fill="url(#tp-campus-aura)" />

              {/* DE WEG */}
              <path d={ROAD_PATH} stroke="rgba(16,185,129,0.08)" strokeWidth={104} strokeLinecap="round" />
              <path d={ROAD_PATH} stroke="#383c45" strokeWidth={90} strokeLinecap="round" />
              <path d={ROAD_PATH} stroke="#14161a" strokeWidth={82} strokeLinecap="round" />
              <path d={ROAD_PATH} stroke="rgba(255,255,255,0.07)" strokeWidth={74} strokeLinecap="round" />

              <path
  d={ROAD_PATH}
  stroke="rgba(255, 255, 255, 0.35)"
  strokeWidth={2.5}
  strokeDasharray="14 18"
/>

              <motion.path
                d={ROAD_PATH}
                stroke={JADE}
                strokeWidth="5"
                strokeLinecap="round"
                style={{
                  pathLength: roadProgress,
                  filter: "drop-shadow(0 0 14px rgba(16, 185, 129, 0.8))",
                }}
              />

              {/* STARTPORTAAL */}
              <g transform="translate(500, 42)">
              </g>

              {/* Haaientanden in de bocht */}
              <g transform={`translate(${marks.teeth.x} ${marks.teeth.y}) rotate(${marks.teeth.rot}) translate(-26 -6)`} opacity="0.8" fill="#ffffff">
                <polygon points="0,0 6,12 -6,12" />
                <polygon points="13,0 19,12 7,12" />
                <polygon points="26,0 32,12 20,12" />
                <polygon points="39,0 45,12 33,12" />
                <polygon points="52,0 58,12 46,12" />
              </g>

              {/* Zebrapad vlak voor de slagboom */}
              <g transform={`translate(${marks.zebra.x} ${marks.zebra.y}) rotate(${marks.zebra.rot}) translate(-39 -14)`} opacity="0.85" fill="#f4f4f5">
                <rect x="0" y="0" width="8" height="28" rx="1" />
                <rect x="14" y="0" width="8" height="28" rx="1" />
                <rect x="28" y="0" width="8" height="28" rx="1" />
                <rect x="42" y="0" width="8" height="28" rx="1" />
                <rect x="56" y="0" width="8" height="28" rx="1" />
                <rect x="70" y="0" width="8" height="28" rx="1" />
              </g>

              {/* Vaste punten (stippen) per stop op de weg */}
              {cps.map((cp, i) => {
                const reached = activeStep >= i + 1;
                return (
                  <g key={i} transform={`translate(${cp.x}, ${cp.y})`}>
                    <circle
                      cx="0"
                      cy="0"
                      r="14"
                      fill="#14161a"
                      stroke={reached ? LIME : "rgba(255,255,255,0.3)"}
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="0"
                      cy="0"
                      r="5"
                      fill={reached ? LIME : "#52525b"}
                    />
                  </g>
                );
              })}

              {/* Bomen */}
              {[
                { x: 585, y: 190, r: 22 },
                { x: 620, y: 225, r: 16 },
                { x: 295, y: 455, r: 24 },
                { x: 330, y: 490, r: 17 },
              ].map((tree, idx) => (
                <g key={idx} transform={`translate(${tree.x}, ${tree.y})`}>
                  <circle cx="5" cy="7" r={tree.r} fill="rgba(0,0,0,0.55)" filter="blur(4px)" />
                  <circle cx="0" cy="0" r={tree.r} fill="#0d261f" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.45" />
                  <circle cx="-4" cy="-4" r={tree.r * 0.65} fill="#13382d" />
                  <circle cx="-6" cy="-6" r={tree.r * 0.3} fill="#10b981" opacity="0.35" />
                </g>
              ))}

              {/* CBR PARKEERPLAATS & SLAGBOOM */}
              <g>
                <rect x={388} y={785} width={144} height={206} rx={16} fill="#14161a" stroke="#27272a" strokeWidth="2" />
                <rect
                  x={416}
                  y={806}
                  width={88}
                  height={166}
                  rx={8}
                  fill={JADE}
                  style={{
                    opacity: parked ? 0.22 : 0.03,
                    transition: "opacity 400ms ease",
                  }}
                />
                <text
                  x="460"
                  y="880"
                  fontFamily="system-ui, sans-serif"
                  fontWeight="900"
                  fontSize="34"
                  fill={parked ? LIME : "rgba(255,255,255,0.12)"}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ transition: "fill 400ms ease" }}
                >
                  P
                </text>
                <path
                  d="M 416 802 L 416 974 L 504 974 L 504 802"
                  stroke={parked ? LIME : "rgba(255,255,255,0.55)"}
                  strokeWidth={3.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  style={{
                    transition: "stroke 400ms ease",
                    filter: parked ? "drop-shadow(0 0 10px rgba(204,255,0,0.85))" : "none",
                  }}
                />
                <rect x={442} y={962} width={36} height={6} rx={3} fill={parked ? LIME : "#52525b"} />

                {/* Slagboom */}
                <g transform="translate(408, 795)">
                  <rect x="-8" y="-8" width="16" height="16" rx="3" fill="#18181b" stroke={gateOpen ? JADE : "#ef4444"} strokeWidth="2" />
                  <circle cx="0" cy="0" r="3" fill={gateOpen ? LIME : "#ef4444"} />
                  <g
                    style={{
                      transform: `rotate(${gateOpen ? -82 : 0}deg)`,
                      transformOrigin: "0px 0px",
                      transition: "transform 650ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                  >
                    <rect x="6" y="-3" width="96" height="6" rx="3" fill="#f4f4f5" />
                    <rect x="20" y="-3" width="14" height="6" fill="#ef4444" />
                    <rect x="48" y="-3" width="14" height="6" fill="#ef4444" />
                    <rect x="76" y="-3" width="14" height="6" fill="#ef4444" />
                  </g>
                </g>

                {/* GESLAAGD Badge */}
                <g
                  transform="translate(460, 1014)"
                  style={{
                    opacity: parked ? 1 : 0,
                    transform: `translate(460px, ${parked ? 1014 : 1027}px)`,
                    transition: "all 400ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <rect x="-92" y="-16" width="184" height="32" rx="16" fill={LIME} className="drop-shadow-[0_0_20px_rgba(204,255,0,0.6)]" />
                  <text x="0" y="1" fontFamily="Monument Extended, sans-serif" fontWeight="800" fontSize="10" fill="#09090b" textAnchor="middle" dominantBaseline="middle" letterSpacing="0.8">
                    ✓ KLAAR VOOR CBR
                  </text>
                </g>
              </g>

              {/* =================================================================
                  DE 2.5D TOP-DOWN CBR EXAMENCAMPUS
                  ================================================================= */}
              <g transform="translate(555, 675)">
                <rect x="61" y="61" width="286" height="211" fill="rgba(0,0,0,0.58)" filter="url(#tp-soft-shadow)" />

                <path
                  d="M -48 180 L 42 180"
                  stroke={parked ? LIME : JADE}
                  strokeWidth="3.5"
                  strokeDasharray="6 6"
                  className="tp-led-walk"
                  style={{ filter: parked ? "drop-shadow(0 0 8px #ccff00)" : "none" }}
                />
                <polygon points="28,175 38,180 28,185" fill={parked ? LIME : JADE} />

                {/* Rectangular brick office footprint, viewed directly from above */}
                <path d="M 65 255 L 330 255 L 342 267 L 77 267 Z" fill="#49382f" stroke="#382f2a" strokeWidth="2" />
                <path d="M 330 65 L 342 77 L 342 267 L 330 255 Z" fill="#594238" stroke="#382f2a" strokeWidth="2" />
                <path d="M 78 261 H 329 M 336 82 V 261" fill="none" stroke="#8a6758" strokeWidth="1" opacity="0.7" />
                <rect x="65" y="65" width="265" height="190" fill="#75584c" stroke="#382f2a" strokeWidth="3" />
                <path d="M 68 69 H 327 V 251 H 68 Z" fill="none" stroke="#a27c6a" strokeWidth="1" opacity="0.7" />

                {/* Long rows of facade windows */}
                {[0, 1, 2, 3, 4, 5].map((window) => {
                  const x = 82 + window * 39;
                  return (
                    <g key={window}>
                      <rect x={x} y="72" width="28" height="14" fill="#26353a" stroke="#b3a293" strokeWidth="2" />
                      <path d={`M ${x + 14} 73 V 85`} stroke="#829195" strokeWidth="1" />
                      <rect x={x} y="234" width="28" height="14" fill="#26353a" stroke="#b3a293" strokeWidth="2" />
                      <path d={`M ${x + 14} 235 V 247`} stroke="#829195" strokeWidth="1" />
                    </g>
                  );
                })}

                {/* Flat roof and parapet */}
                <rect x="79" y="94" width="237" height="132" fill="url(#tp-roof-grad)" stroke="#4c4a44" strokeWidth="2" />
                <path d="M 85 100 H 310 V 220 H 85 Z" fill="none" stroke="#a7a49a" strokeWidth="1" opacity="0.65" />
                <path d="M 86 105 H 309 M 86 215 H 309" stroke="#5d5c56" strokeWidth="1" />

                {/* Small rooftop service building */}
                <rect x="174" y="117" width="48" height="48" fill="#55534d" stroke="#3d3b36" strokeWidth="2" />
                <path d="M 222 117 L 230 125 V 173 L 222 165 Z" fill="#46443f" stroke="#3d3b36" strokeWidth="1" />
                <path d="M 174 165 L 222 165 L 230 173 L 182 173 Z" fill="#4a4842" stroke="#3d3b36" strokeWidth="1" />
                <rect x="178" y="121" width="40" height="40" fill="#6d6b63" stroke="#aaa79e" strokeWidth="1" />
                <path d="M 183 126 H 213 V 156 H 183 Z" fill="none" stroke="#929087" strokeWidth="1" />

                {/* Small rooftop service units */}
                {[0, 1].map((unit) => (
                  <g key={unit} transform={`translate(${130 + unit * 92}, 143)`}>
                    <rect x="0" y="0" width="48" height="34" fill="#74736b" stroke="#aaa79e" strokeWidth="1.5" />
                    <rect x="4" y="4" width="40" height="26" fill="#555650" />
                    <circle cx="24" cy="17" r="9" fill="#414541" stroke="#aaa79e" strokeWidth="1" />
                    <path d="M 24 9 V 25 M 16 17 H 32 M 18 11 L 30 23 M 30 11 L 18 23" stroke="#aaa79e" strokeWidth="1" />
                  </g>
                ))}

                {/* Campus bomen */}
                {[
                  { x: 18, y: 78, r: 18 },
                  { x: 42, y: 52, r: 14 },
                  { x: 25, y: 268, r: 20 },
                  { x: 60, y: 282, r: 15 },
                  { x: 382, y: 215, r: 22 },
                ].map((t, i) => (
                  <g key={i} transform={`translate(${t.x}, ${t.y})`}>
                    <circle cx="4" cy="6" r={t.r} fill="rgba(0,0,0,0.6)" filter="blur(3px)" />
                    <circle cx="0" cy="0" r={t.r} fill="#0d261f" stroke={JADE} strokeWidth="1.5" strokeOpacity="0.5" />
                    <circle cx="-3" cy="-3" r={t.r * 0.6} fill="#13382d" />
                    <circle cx="-5" cy="-5" r={t.r * 0.28} fill={LIME} opacity="0.35" />
                  </g>
                ))}
              </g>
              {!USE_3D_CAR && (
                <g ref={carGRef} style={{ opacity: 0 }}>
                  <AudiA3Top headlights={headlights} drive={drive} parked={parked} beamStrength={0.6} />
                </g>
              )}
            </svg>

            {/* DE 3D AUTO OP DE WEG */}
            {USE_3D_CAR && (
            <div
              ref={carWrapRef}
              className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-20"
              style={{ opacity: 0 }}
            >
              <Car3D stateRef={carState} logoSrc={LOGO_SRC} />
            </div>
            )}

            {/* STAPPEN KAARTEN */}
            {steps.map((step, index) => {
              const isActive = activeStep >= index + 1;
              return (
                <div
                  key={step.num}
                  ref={(el) => {
                    deskCardRefs.current[index] = el;
                  }}
                  className={`absolute w-[330px] xl:w-[390px] p-7 rounded-3xl border backdrop-blur-xl transition-all duration-500 z-30 ${positions[index]} ${
                    isActive
                      ? "border-jade/70 bg-ink/90 shadow-[0_0_45px_rgba(16,185,129,0.18)] scale-100 opacity-100"
                      : "border-white/10 bg-ink/40 scale-95 opacity-40"
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-x-8 -top-px h-0.5 bg-gradient-to-r from-transparent via-lime to-transparent" />
                  )}

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
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-display font-extrabold text-xl border-2 transition-all duration-300 ${
                        isActive
                          ? "border-lime bg-lime text-ink shadow-[0_0_20px_rgba(204,255,0,0.5)] rotate-3"
                          : "border-jade/40 text-jade bg-ink"
                      }`}
                    >
                      {step.num}
                    </div>
                  </div>

                  <h3 className="font-display font-extrabold text-2xl text-paper mb-2">
                    {step.title}
                  </h3>
                  <p className="text-paper/75 text-base leading-relaxed mb-4">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ================= MOBIEL ================= */}
          <div className="lg:hidden relative pl-12 sm:pl-16 pb-36 space-y-16 max-w-lg mx-auto">
            <div className="absolute left-5 sm:left-6 top-2 bottom-20 w-1 -translate-x-1/2 bg-white/10">
              <div className="w-full h-full border-l-2 border-dashed border-white/20" />
              <motion.div
                className="absolute top-0 left-0 w-full bg-jade shadow-[0_0_12px_#10b981]"
                style={{ height: mobileLineHeight }}
              />
            </div>

            <div
              ref={mobLineRef}
              className="absolute left-5 sm:left-6 top-2 bottom-20 w-0 z-20 pointer-events-none"
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
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-display font-bold text-sm ${
                        isActive ? "bg-lime text-ink" : "border border-jade text-jade"
                      }`}
                    >
                      {step.num}
                    </span>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-jade">
                        {step.tag}
                      </span>
                      <h3 className="font-display font-extrabold text-lg text-paper">
                        {step.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-paper/70 text-sm sm:text-base">{step.desc}</p>
                </div>
              );
            })}

            <div
              className={`absolute left-5 sm:left-6 bottom-0 h-32 w-[60px] -translate-x-1/2 rounded-b-xl border-2 border-t-0 transition-colors duration-500 ${
                parked
                  ? "border-lime bg-jade/15 shadow-[0_0_20px_rgba(204,255,0,0.4)]"
                  : "border-white/40"
              }`}
            />
            <div className="absolute left-[64px] sm:left-[80px] bottom-4 flex items-center gap-3">
              <div className="flex items-center gap-3 bg-white/[0.04] border border-white/15 rounded-2xl p-3 backdrop-blur-md">
                <div className="w-10 h-10 rounded-lg bg-blue-600 border-2 border-white flex items-center justify-center text-white font-extrabold text-xl leading-none shadow-md">
                  P
                </div>
                <div className="bg-white rounded-lg px-2.5 py-1.5 border border-lime shadow-sm">
                  <Image
                    src="/cbr-logo.png"
                    alt="CBR"
                    width={64}
                    height={26}
                    className="h-5 w-auto object-contain"
                  />
                </div>
              </div>
              <motion.div
                initial={false}
                animate={{ opacity: parked ? 1 : 0, scale: parked ? 1 : 0.6 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="px-3.5 py-1.5 rounded-full bg-lime text-ink font-display font-extrabold text-xs tracking-wider shadow-[0_0_15px_rgba(204,255,0,0.5)]"
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