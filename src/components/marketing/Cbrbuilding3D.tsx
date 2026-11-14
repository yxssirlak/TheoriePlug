"use client";

import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useTexture } from "@react-three/drei";
import * as THREE from "three";

/* ==========================================================================
   CbrBuilding3D — het CBR-examencentrum als echt 3D-gebouw, van boven gezien.

   - 1 wereld-eenheid = 1 SVG-eenheid (zelfde viewBox als je weg en Car3D),
     dus het gebouw staat exact op de plek waar je SVG-campus stond.
   - Bovenaanzicht met schuine projectie: de grond blijft 1:1 op je SVG liggen,
     de hoogte "leunt" naar rechtsonder zodat je west- en noordgevel ziet.
   - Alles (gevels, dak, bestrating) wordt in code getekend: geen downloads,
     behalve optioneel het CBR-logo (logoSrc) op het dak.

   RoadmapSteps schrijft in `stateRef` (geen re-renders), dit component leest
   het elk frame.
   ========================================================================== */

export type BuildingState = {
  parked: boolean;
};

const VIEW_W = 1000;

// Bijna-orthografische camera recht van boven (kleine FOV = geen vertekening).
const FOV = 10;
const camHeight = (viewH: number) => viewH / 2 / Math.tan((FOV / 2) * (Math.PI / 180));

// Hoe sterk de hoogte naar rechtsonder "leunt". Groter = meer van de gevels zichtbaar.
const SHEAR_X = 0.18; // + = leunt naar rechts (west-gevel zichtbaar)
const SHEAR_Z = -0.55; // negatief = hoogte leunt omhoog (zuid-gevel zichtbaar)

// Schaal van het hele complex (om het ingangspunt) — groter t.o.v. de auto.
const SX = 1.25; // gelijk houden voor een niet-uitgerekte vorm
const SY = 1.25;
const SZ = 1.25;
const ANCHOR_X = 598;
const ANCHOR_Z = 855; // ingang blijft op z=855 (LED-looppad)

const LIME = "#ccff00";
const JADE = "#10b981";

const B0 = 1.5; // hoogte van de bestrating; het gebouw staat hierop

/* ---------- kleine hulpjes ---------- */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  return c;
}

function toTex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function repeated(tex: THREE.Texture, rx: number, ry: number) {
  const t = tex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function speckle(
  g: CanvasRenderingContext2D,
  W: number,
  H: number,
  rnd: () => number,
  amount: number,
  size = 2
) {
  const n = Math.round(W * H * amount * 0.02);
  for (let i = 0; i < n; i++) {
    const v = rnd() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${0.03 + rnd() * 0.06})`;
    g.fillRect(rnd() * W, rnd() * H, size, size);
  }
}

/* ---------- gevel-teksturen (met aparte "lichtjes aan"-kaart) ---------- */

const PPU = 8; // pixels per wereld-eenheid in de gevel-teksturen

/** Betonnen gevel met doorlopende raamstroken, bouwlagen, vinnen en een plint. */
function facadeRibbon(wU: number, hU: number, floorH: number, bay: number, seed: number) {
  const W = Math.round(wU * PPU);
  const H = Math.round(hU * PPU);
  const c = makeCanvas(W, H);
  const g = c.getContext("2d")!;
  const e = makeCanvas(W, H);
  const ge = e.getContext("2d")!;
  const rnd = rng(seed);

  g.fillStyle = "#bdbab1";
  g.fillRect(0, 0, W, H);
  ge.fillStyle = "#000";
  ge.fillRect(0, 0, W, H);

  const floors = Math.max(1, Math.round(hU / floorH));
  const fh = H / floors;
  const bays = Math.max(1, Math.round(wU / bay));
  const bw = W / bays;

  for (let f = 0; f < floors; f++) {
    const cy = f * fh;
    // borstwering (onderkant van de verdieping)
    const sp = g.createLinearGradient(0, cy + fh * 0.74, 0, cy + fh);
    sp.addColorStop(0, "#a5a29a");
    sp.addColorStop(1, "#c6c3ba");
    g.fillStyle = sp;
    g.fillRect(0, cy + fh * 0.74, W, fh * 0.26);

    // glasstrook
    const gy = cy + fh * 0.14;
    const gh = fh * 0.6;
    for (let b = 0; b < bays; b++) {
      const x = b * bw + bw * 0.05;
      const w = bw * 0.9;
      const gr = g.createLinearGradient(x, gy, x + w, gy + gh);
      gr.addColorStop(0, "#456f7a");
      gr.addColorStop(0.5, "#17323c");
      gr.addColorStop(1, "#0c1a22");
      g.fillStyle = gr;
      g.fillRect(x, gy, w, gh);
      // spiegeling van de lucht
      g.fillStyle = "rgba(200,235,245,0.11)";
      g.beginPath();
      g.moveTo(x + w * 0.08, gy + gh);
      g.lineTo(x + w * 0.42, gy);
      g.lineTo(x + w * 0.64, gy);
      g.lineTo(x + w * 0.3, gy + gh);
      g.closePath();
      g.fill();
      // verlicht kantoor (alleen zichtbaar in de emissive-kaart)
      if (rnd() < 0.16) {
        ge.fillStyle = rnd() < 0.5 ? "#fff1bd" : "#d9ff7a";
        ge.fillRect(x, gy, w, gh);
      }
    }
    // kozijnboven, onderdorpel en vloerrand
    g.fillStyle = "#dcd9d0";
    g.fillRect(0, gy - 2, W, 2);
    g.fillStyle = "#8a877f";
    g.fillRect(0, cy + fh * 0.74, W, 2);
    g.fillStyle = "#ebe8e0";
    g.fillRect(0, cy, W, 3);
  }

  // verticale vinnen tussen de traveeën
  for (let b = 0; b <= bays; b++) {
    const x = b * bw;
    g.fillStyle = "#d6d3ca";
    g.fillRect(x - 2, 0, 4, H);
    g.fillStyle = "rgba(0,0,0,0.20)";
    g.fillRect(x + 2, 0, 2, H);
  }

  // donkere plint onderaan
  g.fillStyle = "#3a3d42";
  g.fillRect(0, H - fh * 0.15, W, fh * 0.15);

  speckle(g, W, H, rnd, 0.9);
  return { map: toTex(c), emissive: toTex(e) };
}

/** Volledig glazen vliesgevel met aluminium rasters; optioneel limoenkleurige stijlen. */
function facadeCurtain(
  wU: number,
  hU: number,
  floorH: number,
  bay: number,
  seed: number,
  accent: boolean
) {
  const W = Math.round(wU * PPU);
  const H = Math.round(hU * PPU);
  const c = makeCanvas(W, H);
  const g = c.getContext("2d")!;
  const e = makeCanvas(W, H);
  const ge = e.getContext("2d")!;
  const rnd = rng(seed);

  g.fillStyle = "#0a161b";
  g.fillRect(0, 0, W, H);
  ge.fillStyle = "#000";
  ge.fillRect(0, 0, W, H);

  const floors = Math.max(1, Math.round(hU / floorH));
  const fh = H / floors;
  const bays = Math.max(1, Math.round(wU / bay));
  const bw = W / bays;

  for (let f = 0; f < floors; f++) {
    for (let b = 0; b < bays; b++) {
      const sky = 1 - f / floors; // hogere verdiepingen spiegelen meer lucht
      const r = 20 + sky * 26 + rnd() * 10;
      const gg = 52 + sky * 38 + rnd() * 10;
      const bl = 62 + sky * 40 + rnd() * 10;
      const x = b * bw;
      const y = f * fh;
      const gr = g.createLinearGradient(x, y, x + bw, y + fh);
      gr.addColorStop(0, `rgb(${r + 14},${gg + 18},${bl + 20})`);
      gr.addColorStop(1, `rgb(${r - 8},${gg - 14},${bl - 14})`);
      g.fillStyle = gr;
      g.fillRect(x + 1.5, y + 1.5, bw - 3, fh - 3);
      if (rnd() < 0.12) {
        ge.fillStyle = rnd() < 0.5 ? "#fff1bd" : "#d9ff7a";
        ge.fillRect(x + 3, y + 3, bw - 6, fh - 6);
      }
    }
  }
  // grote diagonale reflectie over de hele gevel
  const refl = g.createLinearGradient(0, 0, W, H);
  refl.addColorStop(0, "rgba(255,255,255,0.0)");
  refl.addColorStop(0.35, "rgba(210,240,250,0.12)");
  refl.addColorStop(0.5, "rgba(210,240,250,0.0)");
  refl.addColorStop(1, "rgba(255,255,255,0.0)");
  g.fillStyle = refl;
  g.fillRect(0, 0, W, H);

  // aluminium raster
  const mull = accent ? LIME : "#07110f";
  for (let b = 0; b <= bays; b++) {
    g.fillStyle = mull;
    g.globalAlpha = accent ? 0.9 : 1;
    g.fillRect(b * bw - 1.5, 0, 3, H);
  }
  g.globalAlpha = 1;
  for (let f = 0; f <= floors; f++) {
    g.fillStyle = accent ? "#e9ffa6" : "#6b7c83";
    g.fillRect(0, f * fh - 1.5, W, 3);
  }
  speckle(g, W, H, rnd, 0.4);
  return { map: toTex(c), emissive: toTex(e) };
}

function makeRoofTexture() {
  const S = 256;
  const c = makeCanvas(S, S);
  const g = c.getContext("2d")!;
  const rnd = rng(11);
  g.fillStyle = "#666a71";
  g.fillRect(0, 0, S, S);
  speckle(g, S, S, rnd, 6, 2);
  g.strokeStyle = "rgba(30,33,38,0.55)";
  g.lineWidth = 2;
  for (let i = 0; i <= S; i += 64) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, S);
    g.moveTo(0, i);
    g.lineTo(S, i);
    g.stroke();
  }
  return toTex(c);
}

function makePavingTexture() {
  const S = 256;
  const c = makeCanvas(S, S);
  const g = c.getContext("2d")!;
  const rnd = rng(7);
  const n = 8;
  const s = S / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = 34 + Math.round(rnd() * 8);
      g.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      g.fillRect(x * s, y * s, s, s);
    }
  }
  g.strokeStyle = "rgba(10,11,13,0.9)";
  g.lineWidth = 2;
  for (let i = 0; i <= n; i++) {
    g.beginPath();
    g.moveTo(i * s, 0);
    g.lineTo(i * s, S);
    g.moveTo(0, i * s);
    g.lineTo(S, i * s);
    g.stroke();
  }
  return toTex(c);
}

function makeSedumTexture() {
  const S = 128;
  const c = makeCanvas(S, S);
  const g = c.getContext("2d")!;
  const rnd = rng(5);
  g.fillStyle = "#2f5a34";
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 700; i++) {
    const t = rnd();
    g.fillStyle = t < 0.5 ? "#3d7040" : t < 0.8 ? "#4f8a3a" : "#8fb43a";
    g.beginPath();
    g.arc(rnd() * S, rnd() * S, 1 + rnd() * 2.4, 0, Math.PI * 2);
    g.fill();
  }
  return toTex(c);
}

function makeSolarTexture() {
  const W = 128;
  const H = 160;
  const c = makeCanvas(W, H);
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, W, H);
  gr.addColorStop(0, "#16356b");
  gr.addColorStop(1, "#071a3a");
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(150,190,240,0.55)";
  g.lineWidth = 1.5;
  for (let i = 0; i <= 6; i++) {
    g.beginPath();
    g.moveTo((i * W) / 6, 0);
    g.lineTo((i * W) / 6, H);
    g.stroke();
  }
  for (let j = 0; j <= 8; j++) {
    g.beginPath();
    g.moveTo(0, (j * H) / 8);
    g.lineTo(W, (j * H) / 8);
    g.stroke();
  }
  g.fillStyle = "rgba(255,255,255,0.10)";
  g.beginPath();
  g.moveTo(0, H);
  g.lineTo(W * 0.5, 0);
  g.lineTo(W * 0.75, 0);
  g.lineTo(W * 0.25, H);
  g.closePath();
  g.fill();
  return toTex(c);
}

/** Zachte schaduw rond een blok (voor de "aarding" op de bestrating). */
function makeBlobTexture() {
  const S = 256;
  const pad = 56;
  const c = makeCanvas(S, S);
  const g = c.getContext("2d")!;
  g.shadowColor = "rgba(0,0,0,0.95)";
  g.shadowBlur = 34;
  g.shadowOffsetX = 2000;
  g.fillStyle = "#000";
  g.fillRect(pad - 2000, pad, S - pad * 2, S - pad * 2);
  const t = new THREE.CanvasTexture(c);
  return t;
}

function makeGlowTexture() {
  const S = 128;
  const c = makeCanvas(S, S);
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, "rgba(204,255,0,0.85)");
  gr.addColorStop(0.45, "rgba(204,255,0,0.28)");
  gr.addColorStop(1, "rgba(204,255,0,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

function makeLabelTexture(text: string) {
  const W = 512;
  const H = 56;
  const c = makeCanvas(W, H);
  const g = c.getContext("2d")!;
  g.fillStyle = "#0c0d0f";
  const r = H / 2;
  g.beginPath();
  g.moveTo(r, 0);
  g.lineTo(W - r, 0);
  g.arc(W - r, r, r, -Math.PI / 2, Math.PI / 2);
  g.lineTo(r, H);
  g.arc(r, r, r, Math.PI / 2, (Math.PI * 3) / 2);
  g.closePath();
  g.fill();
  g.strokeStyle = JADE;
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = LIME;
  g.font = "800 28px system-ui, Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  (g as any).letterSpacing = "6px";
  g.fillText(text, W / 2 + 3, H / 2 + 2);
  return toTex(c);
}

/* ---------- materialen ---------- */

function useAssets() {
  return useMemo(() => {
    const windows: THREE.MeshStandardMaterial[] = [];
    const limeMats: THREE.MeshStandardMaterial[] = [];

    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);

    const facade = (
      kind: "ribbon" | "curtain" | "glass",
      wU: number,
      hU: number,
      floorH: number,
      bay: number,
      seed: number
    ) => {
      const t =
        kind === "ribbon"
          ? facadeRibbon(wU, hU, floorH, bay, seed)
          : facadeCurtain(wU, hU, floorH, bay, seed, kind === "glass");
      const m = std({
        map: t.map,
        emissiveMap: t.emissive,
        emissive: new THREE.Color("#ffffff"),
        emissiveIntensity: 0.35,
        roughness: kind === "ribbon" ? 0.6 : 0.28,
        metalness: kind === "ribbon" ? 0.1 : 0.55,
      });
      windows.push(m);
      return m;
    };

    const roofBase = makeRoofTexture();
    const roof = (w: number, d: number) =>
      std({ map: repeated(roofBase, w / 30, d / 30), roughness: 0.95, metalness: 0 });

    const lime = (intensity = 1) => {
      const m = std({
        color: LIME,
        emissive: new THREE.Color(LIME),
        emissiveIntensity: intensity,
        roughness: 0.4,
      });
      limeMats.push(m);
      return m;
    };

    const solarTex = makeSolarTexture();
    const sedumTex = makeSedumTexture();
    const glowTex = makeGlowTexture();

    return {
      windows,
      limeMats,
      facade,
      roof,
      lime,
      plain: std({ color: "#8f8c84", roughness: 0.9 }),
      concrete: std({ color: "#a9aeb4", roughness: 0.85 }),
      darkConcrete: std({ color: "#3b3f45", roughness: 0.9 }),
      unit: std({ color: "#8c9198", roughness: 0.7, metalness: 0.3 }),
      fanRing: std({ color: "#2b2e33", roughness: 0.6, metalness: 0.4 }),
      fanDark: std({ color: "#0c0d0f", roughness: 0.9 }),
      blade: std({ color: "#7d838b", roughness: 0.5, metalness: 0.6 }),
      solar: std({ map: solarTex, roughness: 0.25, metalness: 0.5 }),
      sedum: std({ map: repeated(sedumTex, 3, 5), roughness: 1 }),
      glassRoof: std({ color: "#1c4650", roughness: 0.12, metalness: 0.85, transparent: true, opacity: 0.92 }),
      door: std({ color: "#0c1a1f", roughness: 0.15, metalness: 0.8 }),
      white: std({ color: "#dfe3e7", roughness: 0.55 }),
      pavingTex: makePavingTexture(),
      blobTex: makeBlobTexture(),
      glowTex,
      leafDark: std({ color: "#123d2a", roughness: 0.85 }),
      leafMid: std({ color: "#1b5a3d", roughness: 0.85 }),
      leafLight: std({ color: "#7fbf2a", roughness: 0.8, emissive: new THREE.Color("#4a7d12"), emissiveIntensity: 0.35 }),
      trunk: std({ color: "#2a1f18", roughness: 1 }),
      hedge: std({ color: "#16482f", roughness: 0.95 }),
      labelTex: makeLabelTexture("EXAMENCENTRUM"),
    };
  }, []);
}

type Assets = ReturnType<typeof useAssets>;

/* ---------- bouwstenen ---------- */

type V3 = [number, number, number];

function Box({
  p,
  s,
  m,
  cast = true,
  receive = true,
}: {
  p: V3;
  s: V3;
  m: THREE.Material | THREE.Material[];
  cast?: boolean;
  receive?: boolean;
}) {
  return (
    <mesh position={p} castShadow={cast} receiveShadow={receive} material={m}>
      <boxGeometry args={s} />
    </mesh>
  );
}

/** Blok met opgegeven uitstrekking; materialen: [oost, west, dak, onder, zuid, noord]. */
function Block({
  x0,
  x1,
  z0,
  z1,
  y0,
  y1,
  m,
}: {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y0: number;
  y1: number;
  m: THREE.Material[];
}) {
  return (
    <Box
      p={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]}
      s={[x1 - x0, y1 - y0, z1 - z0]}
      m={m}
    />
  );
}

function Parapet({
  x0,
  x1,
  z0,
  z1,
  y,
  a,
  h = 3.4,
  t = 2.4,
}: {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
  a: Assets;
  h?: number;
  t?: number;
}) {
  const w = x1 - x0;
  const d = z1 - z0;
  return (
    <group>
      <Box p={[(x0 + x1) / 2, y + h / 2, z0 + t / 2]} s={[w, h, t]} m={a.concrete} />
      <Box p={[(x0 + x1) / 2, y + h / 2, z1 - t / 2]} s={[w, h, t]} m={a.concrete} />
      <Box p={[x0 + t / 2, y + h / 2, (z0 + z1) / 2]} s={[t, h, d - 2 * t]} m={a.concrete} />
      <Box p={[x1 - t / 2, y + h / 2, (z0 + z1) / 2]} s={[t, h, d - 2 * t]} m={a.concrete} />
    </group>
  );
}

/** Dakunit met draaiende ventilator. */
function Hvac({
  x,
  y,
  z,
  w = 18,
  d = 16,
  h = 7,
  a,
}: {
  x: number;
  y: number;
  z: number;
  w?: number;
  d?: number;
  h?: number;
  a: Assets;
}) {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.y += dt * 4;
  });
  const r = Math.min(w, d) * 0.36;
  return (
    <group position={[x, y, z]}>
      <Box p={[0, h / 2, 0]} s={[w, h, d]} m={a.unit} />
      <Box p={[0, h * 0.2, d / 2 + 0.05]} s={[w * 0.86, 0.6, 0.2]} m={a.darkConcrete} cast={false} />
      <Box p={[0, h * 0.4, d / 2 + 0.05]} s={[w * 0.86, 0.6, 0.2]} m={a.darkConcrete} cast={false} />
      <Box p={[0, h * 0.6, d / 2 + 0.05]} s={[w * 0.86, 0.6, 0.2]} m={a.darkConcrete} cast={false} />
      <mesh position={[0, h + 0.3, 0]} castShadow material={a.fanRing}>
        <cylinderGeometry args={[r, r, 0.7, 28]} />
      </mesh>
      <mesh position={[0, h + 0.68, 0]} material={a.fanDark}>
        <cylinderGeometry args={[r * 0.86, r * 0.86, 0.1, 28]} />
      </mesh>
      <group ref={blades} position={[0, h + 0.85, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[0, 0, 0]} material={a.blade}>
            <boxGeometry args={[r * 1.6, 0.18, r * 0.28]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function SolarRow({ x, y, z, n, a }: { x: number; y: number; z: number; n: number; a: Assets }) {
  return (
    <group position={[x, y, z]}>
      {Array.from({ length: n }).map((_, i) => (
        <group key={i} position={[i * 18.4, 2.2, 0]}>
          <mesh rotation={[0.3, 0, 0]} castShadow receiveShadow material={a.solar}>
            <boxGeometry args={[17, 0.7, 18]} />
          </mesh>
          <Box p={[0, -1.1, 4]} s={[1.2, 2.2, 1.2]} m={a.darkConcrete} cast={false} />
          <Box p={[0, 0.2, -6]} s={[1.2, 3.6, 1.2]} m={a.darkConcrete} cast={false} />
        </group>
      ))}
    </group>
  );
}

/** Exact dezelfde boom als in de SVG hierboven: platte cirkels (schaduw, rand, kern, highlight). */
function makeTreeShadowTexture() {
  const c = makeCanvas(128, 128);
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 20, 64, 64, 62);
  gr.addColorStop(0, "rgba(0,0,0,1)");
  gr.addColorStop(0.7, "rgba(0,0,0,0.85)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function Tree({ x, z, r }: { x: number; y?: number; z: number; r: number; a?: Assets }) {
  const shadowTex = useMemo(() => makeTreeShadowTexture(), []);
  const flat = { rotation: [-Math.PI / 2, 0, 0] as V3 };
  return (
    <group position={[x, 0, z]} scale={[1 / SX, 1, 1 / SZ]}>
      {/* schaduw (5, 7) */}
      <mesh {...flat} position={[5, 0.3, 7]} renderOrder={5}>
        <planeGeometry args={[r * 2.5, r * 2.5]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.55} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* kroon */}
      <mesh {...flat} position={[0, 0.6, 0]} renderOrder={6}>
        <circleGeometry args={[r, 48]} />
        <meshBasicMaterial color="#0d261f" depthWrite={false} toneMapped={false} />
      </mesh>
      {/* jade rand, 45% */}
      <mesh {...flat} position={[0, 0.9, 0]} renderOrder={7}>
        <ringGeometry args={[r - 0.75, r + 0.75, 48]} />
        <meshBasicMaterial color={JADE} transparent opacity={0.45} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* kern */}
      <mesh {...flat} position={[-4, 1.2, -4]} renderOrder={8}>
        <circleGeometry args={[r * 0.65, 40]} />
        <meshBasicMaterial color="#13382d" depthWrite={false} toneMapped={false} />
      </mesh>
      {/* highlight */}
      <mesh {...flat} position={[-6, 1.5, -6]} renderOrder={9}>
        <circleGeometry args={[r * 0.3, 32]} />
        <meshBasicMaterial color={JADE} transparent opacity={0.35} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Logo({ src, a }: { src: string; a: Assets }) {
  const tex = useTexture(src);
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[92, 31]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

/* ---------- het gebouw ---------- */

function Campus({ stateRef, logoSrc }: { stateRef: RefObject<BuildingState>; logoSrc?: string }) {
  const a = useAssets();
  const glow = useRef(0);
  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: a.glowTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [a]
  );

  // Afmetingen (wereld = SVG-coördinaten)
  const A = { x0: 655, x1: 885, z0: 752, z1: 922, h: 50 };
  const Bt = { x0: 790, x1: 885, z0: 752, z1: 842, h: 75 };
  const D = { x0: 618, x1: 655, z0: 802, z1: 900, h: 30 };
  const C = { x0: 700, x1: 800, z0: 922, z1: 952, h: 25 };

  const mats = useMemo(() => {
    const plain = a.plain;
    return {
      A: [
        plain,
        a.facade("ribbon", A.z1 - A.z0, A.h, 12.5, 10, 3),
        a.roof(A.x1 - A.x0, A.z1 - A.z0),
        plain,
        a.facade("ribbon", A.x1 - A.x0, A.h, 12.5, 10, 41),
        a.facade("ribbon", A.x1 - A.x0, A.h, 12.5, 10, 5),
      ],
      B: [
        plain,
        a.facade("curtain", Bt.z1 - Bt.z0, Bt.h, 12.5, 6, 8),
        a.roof(Bt.x1 - Bt.x0, Bt.z1 - Bt.z0),
        plain,
        a.facade("curtain", Bt.x1 - Bt.x0, Bt.h, 12.5, 6, 42),
        a.facade("curtain", Bt.x1 - Bt.x0, Bt.h, 12.5, 6, 9),
      ],
      D: [
        plain,
        a.facade("glass", D.z1 - D.z0, D.h, 15, 6, 21),
        a.roof(D.x1 - D.x0, D.z1 - D.z0),
        plain,
        a.facade("glass", D.x1 - D.x0, D.h, 15, 6, 43),
        a.facade("glass", D.x1 - D.x0, D.h, 15, 6, 22),
      ],
      C: [
        plain,
        a.facade("ribbon", C.z1 - C.z0, C.h, 12.5, 10, 31),
        a.roof(C.x1 - C.x0, C.z1 - C.z0),
        plain,
        a.facade("ribbon", C.x1 - C.x0, C.h, 12.5, 10, 44),
        a.facade("ribbon", C.x1 - C.x0, C.h, 12.5, 10, 32),
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a]);

  const limeStrip = useMemo(() => a.lime(0.9), [a]);

  useFrame((_, dt) => {
    const target = stateRef.current?.parked ? 1 : 0;
    glow.current += (target - glow.current) * (1 - Math.exp(-dt * 5));
    const gl = glow.current;
    a.windows.forEach((m) => (m.emissiveIntensity = 0.1 + gl * 1.0));
    a.limeMats.forEach((m) => (m.emissiveIntensity = 0.55 + gl * 1.5));
    glowMat.opacity = gl * 0.9;
  });

  const roofA = B0 + A.h;
  const roofB = B0 + Bt.h;
  const roofD = B0 + D.h;
  const roofC = B0 + C.h;

  const platform = useMemo(() => {
    const s = new THREE.Shape();
    const x0 = 598;
    const x1 = 944;
    const z0 = 716;
    const z1 = 1034;
    const r = 18;
    s.moveTo(x0 + r, z0);
    s.lineTo(x1 - r, z0);
    s.quadraticCurveTo(x1, z0, x1, z0 + r);
    s.lineTo(x1, z1 - r);
    s.quadraticCurveTo(x1, z1, x1 - r, z1);
    s.lineTo(x0 + r, z1);
    s.quadraticCurveTo(x0, z1, x0, z1 - r);
    s.lineTo(x0, z0 + r);
    s.quadraticCurveTo(x0, z0, x0 + r, z0);
    const g = new THREE.ExtrudeGeometry(s, { depth: B0, bevelEnabled: false, curveSegments: 12 });
    // vlak -> grond; shape y wordt wereld z
    g.rotateX(Math.PI / 2);
    g.translate(0, B0, 0);
    // UV's in wereldeenheden zodat het stratenpatroon overal gelijk groot is
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / 32, pos.getZ(i) / 32);
    }
    return g;
  }, []);

  const pavingMat = useMemo(() => {
    const t = repeated(a.pavingTex, 1, 1);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
  }, [a]);

  const blob = (x0: number, x1: number, z0: number, z1: number, margin: number, op = 0.55) => {
    const rect = 176 / 256; // deel van de textuur dat de "doos" is
    const w = (x1 - x0) / rect + margin;
    const d = (z1 - z0) / rect + margin;
    return (
      <mesh
        position={[(x0 + x1) / 2 + 3, B0 + 0.08, (z0 + z1) / 2 + 3]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
      >
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial
          map={a.blobTex}
          transparent
          opacity={op}
          depthWrite={false}
          toneMapped={false}
          color="#000000"
        />
      </mesh>
    );
  };

  return (
    <group>
      {/* bestrating (ontvangt schaduw) */}
      {/* zachte grondschaduw per bouwdeel */}
      {blob(A.x0, A.x1, A.z0, A.z1, 20, 0.6)}
      {blob(D.x0, D.x1, D.z0, D.z1, 16, 0.5)}
      {blob(C.x0, C.x1, C.z0, C.z1, 16, 0.5)}

      {/* hoofdgebouw: kantoorvleugel */}
      <Block x0={A.x0} x1={A.x1} z0={A.z0} z1={A.z1} y0={B0} y1={roofA} m={mats.A} />
      {/* toren (achter-rechts) */}
      <Block x0={Bt.x0} x1={Bt.x1} z0={Bt.z0} z1={Bt.z1} y0={B0} y1={roofB} m={mats.B} />
      {/* glazen atrium aan de voorkant */}
      <Block x0={D.x0} x1={D.x1} z0={D.z0} z1={D.z1} y0={B0} y1={roofD} m={mats.D} />
      {/* lage zijvleugel */}
      <Block x0={C.x0} x1={C.x1} z0={C.z0} z1={C.z1} y0={B0} y1={roofC} m={mats.C} />

      {/* limoenaccent: verticale lijn op de torenhoek + dakrand op de vleugel */}
      <Box p={[Bt.x0 - 0.6, (B0 + roofB) / 2, Bt.z0 - 0.6]} s={[1.8, roofB - B0, 1.8]} m={limeStrip} cast={false} />
      <Box p={[A.x0 - 0.5, roofA - 1.6, (A.z0 + A.z1) / 2]} s={[1.2, 1.2, A.z1 - A.z0]} m={limeStrip} cast={false} />

      {/* ---------- dak van de kantoorvleugel ---------- */}
      <Parapet x0={A.x0} x1={A.x1} z0={A.z0} z1={A.z1} y={roofA} a={a} />
      {/* de toren staat midden in dit dak: haal de achterhoek weg door de toren erdoorheen */}
      {/* dakkoepel / lichtstraat */}
      <Box p={[722, roofA + 0.7, 831]} s={[116, 1.4, 9]} m={a.glassRoof} />
      {[664, 683, 702, 721, 740, 759, 778].map((x) => (
        <Box key={x} p={[x, roofA + 1.1, 831]} s={[1, 1.1, 9.6]} m={a.darkConcrete} cast={false} />
      ))}
      {/* groen dak + looppad naar de installaties */}
      <Box p={[679, roofA + 0.35, 861]} s={[40, 0.7, 36]} m={a.sedum} />
      <Box p={[742, roofA + 0.12, 843]} s={[2.6, 0.24, 78]} m={a.concrete} cast={false} />
      <Box p={[800, roofA + 0.12, 849]} s={[110, 0.24, 2.6]} m={a.concrete} cast={false} />
      {/* trappenhuis */}
      <Block x0={662} x1={694} z0={884} z1={914} y0={roofA} y1={roofA + 12} m={[a.plain, a.plain, a.concrete, a.plain, a.plain, a.plain]} />
      <Parapet x0={662} x1={694} z0={884} z1={914} y={roofA + 12} a={a} h={1.6} t={1.6} />
      {/* zonnepanelen */}
      <SolarRow x={712} y={roofA} z={868} n={7} a={a} />
      <SolarRow x={712} y={roofA} z={896} n={7} a={a} />
      {/* luchtbehandeling */}
      <Hvac x={866} y={roofA} z={862} a={a} />
      <Hvac x={866} y={roofA} z={890} w={20} d={18} h={8} a={a} />
      <Hvac x={706} y={roofA} z={822} w={14} d={12} h={5} a={a} />

      {/* ---------- dak van de toren ---------- */}
      <Parapet x0={Bt.x0} x1={Bt.x1} z0={Bt.z0} z1={Bt.z1} y={roofB} a={a} />
      <Block x0={800} x1={836} z0={766} z1={802} y0={roofB} y1={roofB + 9} m={[a.plain, a.plain, a.concrete, a.plain, a.plain, a.plain]} />
      <Box p={[818, roofB + 9.4, 784]} s={[34, 0.8, 34]} m={a.darkConcrete} />
      <Hvac x={856} y={roofB} z={775} w={20} d={18} h={6} a={a} />
      <Hvac x={858} y={roofB} z={812} w={16} d={14} h={5} a={a} />
      {/* antenne */}
      <mesh position={[872, roofB + 14, 764]} castShadow material={a.blade}>
        <cylinderGeometry args={[0.7, 1.1, 28, 10]} />
      </mesh>
      <mesh position={[872, roofB + 28.6, 764]} material={limeStrip}>
        <sphereGeometry args={[1.8, 12, 12]} />
      </mesh>

      {/* ---------- atrium ---------- */}
      <Box p={[636.5, roofD + 0.6, 851]} s={[34, 1.2, 90]} m={a.glassRoof} />
      {[814, 826, 838, 850, 862, 874, 886].map((z) => (
        <Box key={z} p={[636.5, roofD + 1.0, z]} s={[35, 1, 1]} m={limeStrip} cast={false} />
      ))}
      <Parapet x0={D.x0} x1={D.x1} z0={D.z0} z1={D.z1} y={roofD} a={a} h={1.8} t={1.6} />
      {/* glazen deur + luifel */}
      <Box p={[617.2, B0 + 8, 855]} s={[1.4, 16, 16]} m={a.door} cast={false} />
      <Box p={[616.6, B0 + 16.4, 855]} s={[1.6, 1.2, 18]} m={limeStrip} cast={false} />
      <Box p={[606, B0 + 21, 855]} s={[24, 1.8, 42]} m={a.white} />
      <Box p={[606, B0 + 20.2, 855]} s={[24.6, 0.5, 42.6]} m={limeStrip} cast={false} />
      <mesh position={[596, B0 + 10, 837]} castShadow material={a.concrete}>
        <cylinderGeometry args={[1.5, 1.5, 20, 14]} />
      </mesh>
      <mesh position={[596, B0 + 10, 873]} castShadow material={a.concrete}>
        <cylinderGeometry args={[1.5, 1.5, 20, 14]} />
      </mesh>
      {/* gloed op de grond als je geparkeerd bent */}
      <mesh position={[612, B0 + 0.5, 855]} rotation={[-Math.PI / 2, 0, 0]} material={glowMat} renderOrder={3}>
        <planeGeometry args={[130, 130]} />
      </mesh>

      {/* ---------- zijvleugel ---------- */}
      <Parapet x0={C.x0} x1={C.x1} z0={C.z0} z1={C.z1} y={roofC} a={a} h={2.6} t={2} />
      <Hvac x={730} y={roofC} z={937} w={16} d={14} h={4.5} a={a} />
      <mesh position={[772, roofC + 2, 937]} castShadow material={a.unit}>
        <cylinderGeometry args={[3, 3, 4, 14]} />
      </mesh>

      {/* ---------- groen ---------- */}
      {[
        [584, 0, 760, 22],
        [614, 0, 732, 16],
        [586, 0, 952, 24],
        [614, 0, 978, 17],
        [850, 0, 956, 20],
        [905, 0, 972, 15],
      ].map(([x, y, z, r], i) => (
        <Tree key={i} x={x} y={y} z={z} r={r} a={a} />
      ))}
      {/* heggen langs de ingang */}
      <Box p={[608, B0 + 2.5, 783]} s={[8, 5, 30]} m={a.hedge} />
      <Box p={[608, B0 + 2.5, 927]} s={[8, 5, 30]} m={a.hedge} />
      {/* paaltjes met limoenkop */}
      {[836, 874].map((z) => (
        <mesh key={z} position={[601, B0 + 3, z]} castShadow material={limeStrip}>
          <cylinderGeometry args={[1.4, 1.4, 6, 12]} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- scène ---------- */

function TopCamera({ viewH, cx = VIEW_W / 2, cz }: { viewH: number; cx?: number; cz?: number }) {
  // zelfde opzet als Car3D: scherm omhoog = -z, scherm rechts = +x
  const { camera } = useThree();
  useLayoutEffect(() => {
    const targetZ = cz ?? viewH / 2;
    camera.up.set(0, 0, -1);
    const h = camHeight(viewH);
    camera.position.set(cx, h, targetZ);
    camera.lookAt(cx, 0, targetZ);
    camera.near = Math.max(10, h - 700);
    camera.far = h + 600;
    camera.updateProjectionMatrix();
  }, [camera, viewH, cx, cz]);
  return null;
}

function Shear({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    g.matrixAutoUpdate = false;
    g.matrix.set(
      1, SHEAR_X, 0, 0,
      0, 1, 0, 0,
      0, SHEAR_Z, 1, 0,
      0, 0, 0, 1
    );
    g.matrixWorldNeedsUpdate = true;
  }, []);
  return <group ref={ref}>{children}</group>;
}

function Lights({ offsetY = 0 }: { offsetY?: number }) {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(880, 0, 900 + offsetY);
    return o;
  }, []);
  const k = 800;
  const L = new THREE.Vector3(-0.78, 0.7, 0.14).normalize().multiplyScalar(k);
  return (
    <>
      <primitive object={target} />
      <ambientLight intensity={0.42} />
      <hemisphereLight args={["#bcd6ff", "#1a1d22", 0.25]} />
      {/* zon: schuin van linksboven, geeft de schaduw naar rechts */}
      <directionalLight
        position={[880 + L.x, L.y, 900 + offsetY + L.z]}
        target={target}
        intensity={1.75}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-650}
        shadow-camera-right={650}
        shadow-camera-top={650}
        shadow-camera-bottom={-650}
        shadow-camera-near={10}
        shadow-camera-far={2600}
        shadow-bias={-0.0004}
        shadow-normalBias={0.6}
      />
      {/* vullicht uit het zuiden zodat de zuidgevel niet zwart wordt */}
      <directionalLight position={[800, 600, 1500]} intensity={0.9} />
    </>
  );
}

export default function CbrBuilding3D({
  stateRef,
  logoSrc,
  viewH = 1060,
  offsetY = 0,
  cx = VIEW_W / 2,
  cz,
}: {
  stateRef: RefObject<BuildingState>;
  logoSrc?: string;
  /** zelfde hoogte als de viewBox van de roadmap (VIEW_H) */
  viewH?: number;
  /** hoeveel de parkeerplaats/het gebouw naar beneden is geschoven (DY) */
  offsetY?: number;
  /** optioneel camera-middelpunt X (handig voor mobiel) */
  cx?: number;
  /** optioneel camera-middelpunt Z (handig voor mobiel) */
  cz?: number;
}) {
  const CAM_H = camHeight(viewH);
  const targetZ = cz ?? viewH / 2;
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        shadows
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        camera={{
          fov: FOV,
          near: Math.max(10, CAM_H - 700),
          far: CAM_H + 600,
          position: [cx, CAM_H, targetZ],
        }}
      >
        <TopCamera viewH={viewH} cx={cx} cz={targetZ} />
        <Lights offsetY={offsetY} />
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={1.6} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[14, 14, 1]} />
          <Lightformer form="rect" intensity={2.0} color={LIME} position={[-7, 2, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.2} position={[7, 2, -2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
        </Environment>

        <Shear>
          <group
            position={[ANCHOR_X * (1 - SX), 0, ANCHOR_Z * (1 - SZ) + offsetY]}
            scale={[SX, SY, SZ]}
          >
            <Campus stateRef={stateRef} logoSrc={logoSrc} />
          </group>
        </Shear>

        {/* grondschaduw op de SVG eronder (alleen de schaduw is zichtbaar) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[900, 0.05, 900 + offsetY]} receiveShadow>
          <planeGeometry args={[1700, 1700]} />
          <shadowMaterial opacity={0.42} />
        </mesh>
      </Canvas>
    </div>
  );
}