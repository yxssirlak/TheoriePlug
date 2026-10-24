"use client";

import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import type { Ref } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useTexture } from "@react-three/drei";
import * as THREE from "three";

/* ==========================================================================
   Car3D — stylized Audi A3 (8V) in 3D, rendered as a transparent overlay on
   top of your SVG road. 1 world unit = 1 SVG unit, so the car follows exactly
   the same path coordinates as before.

   RoadmapSteps writes into `stateRef` (no re-renders), this component reads it
   every frame.
   ========================================================================== */

export type CarState = {
  x: number; // SVG x of the car
  y: number; // SVG y of the car
  heading: number; // direction of travel in degrees (atan2 of the path tangent)
  steer: number; // front wheel angle in degrees
  headlights: boolean;
  drive: "idle" | "forward" | "reverse";
  parked: boolean;
};

const VIEW_W = 1000;
const VIEW_H = 960;

// Camera looks straight down. Distance is chosen so the ground plane maps 1:1
// onto your SVG viewBox. Lower FOV = flatter look, higher FOV = more 3D sides.
const FOV = 35;
const CAM_H = VIEW_H / 2 / Math.tan((FOV / 2) * (Math.PI / 180));

const LIME = "#ccff00";
const JADE = "#10b981";
const PAINT = "#ffffff"; // car colour

/* ---------- Outlines (top view, SVG coords, nose = negative y) ---------- */

const BODY_D =
  "M -16 -59 C -9 -60.6 9 -60.6 16 -59 C 21 -57 24 -52 25 -44 L 25.6 -30 C 25.9 -10 25.9 20 25.4 40 C 25.1 50 24 55 21 58 C 14 60.6 -14 60.6 -21 58 C -24 55 -25.1 50 -25.4 40 C -25.9 20 -25.9 -10 -25.6 -30 L -25 -44 C -24 -52 -21 -57 -16 -59 Z";

const MIRROR_D =
  "M 20 -23.6 L 23.5 -23.6 C 25.2 -24.8 27.2 -24.6 27.8 -23 L 27.8 -20.6 L 20 -20.6 Z";

  const CABIN_D =
  "M -18 -22 C -9 -24 9 -24 18 -22 L 19.5 8 C 19.8 24 19.2 36 17.5 46 C 8 48 -8 48 -17.5 46 C -19.2 36 -19.8 24 -19.5 8 Z";

const ROOF_D =
  "M -15 -16 C -8 -17.5 8 -17.5 15 -16 L 16.5 12 C 16.8 26 16.2 34 14.8 41 C 7 43 -7 43 -14.8 41 C -16.2 34 -16.8 26 -16.5 12 Z";

const PANO_D =
  "M -12 -12 C -6 -13.2 6 -13.2 12 -12 L 13 12 C 13.2 24 12.8 31 11.8 37 C 6 38.4 -6 38.4 -11.8 37 C -12.8 31 -13.2 24 -13 12 Z";

/** Tiny SVG path parser (M, L, C, Z). Flips y so the shape lies on the XZ plane. */
function shapeFromPath(d: string, sx = 1, sy = 1) {
  const t = d.match(/[MLCZ]|-?\d*\.?\d+/g) ?? [];
  const shape = new THREE.Shape();
  let i = 0;
  const num = () => parseFloat(t[i++]);
  while (i < t.length) {
    const cmd = t[i++];
    if (cmd === "M") {
      const x = num();
      const y = num();
      shape.moveTo(x * sx, -y * sy);
    } else if (cmd === "L") {
      const x = num();
      const y = num();
      shape.lineTo(x * sx, -y * sy);
    } else if (cmd === "C") {
      const a = [num(), num(), num(), num(), num(), num()];
      shape.bezierCurveTo(
        a[0] * sx, -a[1] * sy,
        a[2] * sx, -a[3] * sy,
        a[4] * sx, -a[5] * sy
      );
    } else if (cmd === "Z") {
      shape.closePath();
    }
  }
  return shape;
}

/** Extrude an outline upward: bottom at y0, total height h, rounded edges. */
function slab(d: string, y0: number, h: number, bevel: number, sx = 1, sy = 1) {
  const g = new THREE.ExtrudeGeometry(shapeFromPath(d, sx, sy), {
    depth: Math.max(h - 2 * bevel, 0.01),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 24,
  });
  g.rotateX(-Math.PI / 2); // extrusion -> up, nose stays at -z
  g.translate(0, y0 + bevel, 0);
  return g;
}

/** Curved LED tail light that follows the rear corner of the body. */
const TAIL_PTS: [number, number][] = [
  [11, 60.0],
  [15, 59.4],
  [18.5, 57.9],
  [21.7, 54.7],
  [23.7, 50.0],
];

function makeTailGeo(side: number) {
  const curve = new THREE.CatmullRomCurve3(
    TAIL_PTS.map(([x, z]) => new THREE.Vector3(x * side, 0, z))
  );
  const g = new THREE.TubeGeometry(curve, 32, 0.9, 8, false);
  g.scale(1, 0.75, 1); // flatten it into a slim strip
  g.translate(0, 19, 0);
  return g;
}

/** Curved LED headlight (DRL) that follows the front corner of the body. */
const HEAD_PTS: [number, number][] = [
  [10, -58.5],
  [14.1, -58.0],
  [17.5, -56.0],
  [20.3, -52.6],
  [22.0, -48.0],
];

function makeHeadGeo(side: number) {
  const curve = new THREE.CatmullRomCurve3(
    HEAD_PTS.map(([x, z]) => new THREE.Vector3(x * side, 0, z))
  );
  const g = new THREE.TubeGeometry(curve, 32, 0.8, 8, false);
  g.scale(1, 0.75, 1); // flatten it into a slim strip
  g.translate(0, 19.5, 0);
  return g;
}

/* ---------- Canvas-generated textures (no network needed) ---------- */

/** Wide soft headlight light: fades smoothly to nothing on all sides. */
/** Wide headlight light with gaussian falloff: no visible edge anywhere. */
function makeBeamTexture() {
  const W = 128, H = 256;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const sm = (t: number) => {
    const x = Math.min(1, Math.max(0, t));
    return x * x * (3 - 2 * x);
  };
  for (let y = 0; y < H; y++) {
    const u = 1 - y / (H - 1); // 0 at the car, 1 at the far end
    const halfW = 0.3 + 1.0 * u; // cone widens with distance
    // soft fade along the length, exactly 0 at the far end
    const along = Math.exp(-3 * u * u) * (1 - sm(u)) * sm(u / 0.1);
    for (let x = 0; x < W; x++) {
      const nx = (x / (W - 1)) * 2 - 1;
      const d = Math.abs(nx) / halfW;
      // gaussian across, with a window so the plane edge is exactly 0
      const across = Math.exp(-3.2 * d * d) * (1 - sm(Math.abs(nx)));
      const i = (y * W + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * across * along * 0.9);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
/** Surface light that starts at the tail and fades out behind the car. */
function makeGlowTexture() {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x / (S - 1)) * 2 - 1;
      const dy = (y / (S - 1)) * 2 - 1;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const t = r * r * (3 - 2 * r); // smoothstep: no hard edge anywhere
      const a = Math.pow(1 - t, 1.5) * 0.6; // peak is only 60%, softer falloff
      const i = (y * S + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * a);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeShadowTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.translate(64, 128);
  ctx.scale(1, 2);
  const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 64);
  g.addColorStop(0, "rgba(0,0,0,0.75)");
  g.addColorStop(0.6, "rgba(0,0,0,0.45)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-64, -64, 128, 128);
  return new THREE.CanvasTexture(c);
}

/* ---------- Parts ---------- */

function Wheel({
  x,
  z,
  groupRef,
}: {
  x: number;
  z: number;
  groupRef?: Ref<THREE.Group>;
}) {
  return (
    <group position={[x, 8, z]} ref={groupRef}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[8, 8, 6, 28]} />
        <meshStandardMaterial color="#060607" roughness={0.9} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[5, 5, 6.3, 24]} />
        <meshStandardMaterial color="#8d939e" metalness={1} roughness={0.35} />
      </mesh>
    </group>
  );
}

function HoodLogo({ src }: { src: string }) {
  const tex = useTexture(src);
  return (
    <mesh position={[0, 22.2, -40]} rotation={[-Math.PI / 2, 0, Math.PI]}>
      <planeGeometry args={[30, 30]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

function Audi({
  stateRef,
  logoSrc,
}: {
  stateRef: { current: CarState };
  logoSrc?: string;
}) {
  const root = useRef<THREE.Group>(null);
  const wheelL = useRef<THREE.Group>(null);
  const wheelR = useRef<THREE.Group>(null);

  const geo = useMemo(
    () => ({
      body: slab(BODY_D, 6, 16, 2, 0.88, 0.965),
      cabin: slab(CABIN_D, 22, 9, 1.5, 0.9, 1),
      roof: slab(ROOF_D, 29, 7, 1.5, 0.9, 0.95),
      pano: slab(PANO_D, 35.6, 1.2, 0.3, 0.9, 0.95),
      tail: [makeTailGeo(1), makeTailGeo(-1)],
      head: [makeHeadGeo(1), makeHeadGeo(-1)],
      mirror: slab(MIRROR_D, 18, 3.8, 0.8),
    }),
    []
  );

  const tex = useMemo(
    () => ({
      beam: makeBeamTexture(),
      glow: makeGlowTexture(),
      shadow: makeShadowTexture(),
    }),
    []
  );

  const mats = useMemo(
    () => ({
      paint: new THREE.MeshPhysicalMaterial({
        color: PAINT,
        metalness: 0.65,
        roughness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#0a0e14",
        metalness: 0.9,
        roughness: 0.12,
      }),
      black: new THREE.MeshStandardMaterial({ color: "#0b0c0e", roughness: 0.5 }),
      // headlight pool in front of the car
      beam: new THREE.MeshBasicMaterial({
        map: tex.beam,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
      // reverse: round surface light around the tail (no beam)
      revGlow: new THREE.MeshBasicMaterial({
        map: tex.glow,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
      brakeGlow: new THREE.MeshBasicMaterial({
  map: tex.glow,
  color: "#ff2a2a",
  transparent: true,
  opacity: 0,
  depthWrite: false,
  toneMapped: false,
}),
      tail: new THREE.MeshBasicMaterial({ color: "#ff2a2a", toneMapped: false }),
      rev: new THREE.MeshBasicMaterial({ color: "#3a2a2c", toneMapped: false }),
      drl: new THREE.MeshBasicMaterial({ color: "#e9f4ff", toneMapped: false }),
      hazard: new THREE.MeshBasicMaterial({
        color: "#ffb020",
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
      jade: new THREE.MeshBasicMaterial({ color: JADE, toneMapped: false }),
      shadow: new THREE.MeshBasicMaterial({
        map: tex.shadow,
        transparent: true,
        depthWrite: false,
      }),
    }),
    [tex]
  );

  useFrame((state, delta) => {
    const s = stateRef.current;
    const g = root.current;
    if (!g) return;

    g.position.set(s.x, 0, s.y);
    g.rotation.y = -((s.heading + 90) * Math.PI) / 180;

    const st = -(s.steer * Math.PI) / 180;
    if (wheelL.current) wheelL.current.rotation.y = st;
    if (wheelR.current) wheelR.current.rotation.y = st;

    const k = 1 - Math.exp(-delta * 12);
    const braking = s.drive === "idle";
    const reversing = s.drive === "reverse";

    // headlights
    const beamTarget = s.headlights ? 0.85 : 0;
    mats.beam.opacity += (beamTarget - mats.beam.opacity) * k;

    // brake lights: strongly on when you stop scrolling, dim while driving
const tailTarget = braking ? 1 : 0.25;
const cur = mats.tail.color.r;
const next = cur + (tailTarget - cur) * k;
mats.tail.color.setRGB(next, next * 0.16, next * 0.16);

// soft red glow behind the car, only while braking
mats.brakeGlow.opacity += ((braking ? 0.45 : 0) - mats.brakeGlow.opacity) * k;

    // reverse: bulbs turn white + surface light fades in
    mats.rev.color.set(reversing ? "#ffffff" : "#3a2a2c");
mats.revGlow.opacity += ((reversing ? 0.35 : 0) - mats.revGlow.opacity) * k;
    // hazard lights blink when parked
    const blink = s.parked && Math.floor(state.clock.elapsedTime / 0.45) % 2 === 0;
    mats.hazard.opacity = blink ? 1 : 0;
  });

  const sides = [1, -1];

  return (
    <group ref={root}>
      {/* soft ground shadow */}
      <mesh
        position={[2, 0.2, 3]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={mats.shadow}
      >
        <planeGeometry args={[74, 148]} />
      </mesh>

      {/* soft headlight pool on the road */}
      <mesh
  position={[0, 0.6, -52 - 140]}
  rotation={[-Math.PI / 2, 0, 0]}
  material={mats.beam}
>
  <planeGeometry args={[420, 280]} />
</mesh>

      {/* reverse: short soft surface light behind the car */}
<mesh
  position={[0, 0.6, 85]}
  rotation={[-Math.PI / 2, 0, 0]}
  material={mats.revGlow}
>
  <planeGeometry args={[130, 150]} />
</mesh>

{/* brake glow: soft red light behind the car */}
<mesh
  position={[0, 0.6, 78]}
  rotation={[-Math.PI / 2, 0, 0]}
  material={mats.brakeGlow}
>
  <planeGeometry args={[80, 70]} />
</mesh>

      {/* wheels */}
      <Wheel x={-25.5} z={-35} groupRef={wheelL} />
      <Wheel x={25.5} z={-35} groupRef={wheelR} />
      <Wheel x={-25.5} z={38} />
      <Wheel x={25.5} z={38} />

      {/* body */}
      <mesh geometry={geo.body} material={mats.paint} />
      <mesh geometry={geo.cabin} material={mats.glass} />
      <mesh geometry={geo.roof} material={mats.paint} />
      <mesh geometry={geo.pano} material={mats.glass} />

      {/* hood logo */}
      {logoSrc && (
        <Suspense fallback={null}>
          <HoodLogo src={logoSrc} />
        </Suspense>
      )}

      {/* grille */}
      <mesh position={[0, 13, -59.2]} material={mats.black}>
        <boxGeometry args={[15, 5, 1.5]} />
      </mesh>

      {/* roof spoiler with brand lip */}
      <mesh position={[0, 35.4, 44.5]} material={mats.black}>
        <boxGeometry args={[32, 1.4, 5]} />
      </mesh>
      <mesh position={[0, 35.4, 47.1]} material={mats.jade}>
        <boxGeometry args={[32, 0.6, 0.6]} />
      </mesh>

      {sides.map((s) => (
        <group key={`side${s}`}>
          
          {/* mirror: one curved housing */}
<mesh geometry={geo.mirror} material={mats.paint} scale={[s, 1, 1]} />
          
          {/* LED headlight (DRL): curved strip around the front corner */}
<mesh geometry={s > 0 ? geo.head[0] : geo.head[1]} material={mats.drl} />
          
          {/* tail light: curved strip around the corner */}
<mesh geometry={s > 0 ? geo.tail[0] : geo.tail[1]} material={mats.tail} />

          {/* reverse light: slim flat LED strip */}
<mesh position={[s * 8, 15.2, 60.9]} material={mats.rev}>
  <boxGeometry args={[7, 0.5, 0.5]} />
</mesh>
<mesh position={[s * 8, 13.6, 60.9]} material={mats.rev}>
  <boxGeometry args={[7, 0.5, 0.5]} />
</mesh>
          {/* hazard corners (small, tucked into the light clusters) */}
          <mesh position={[s * 21.5, 19.5, -54.5]} material={mats.hazard}>
            <sphereGeometry args={[1.1, 12, 12]} />
          </mesh>
          <mesh position={[s * 21.5, 19.5, 54.5]} material={mats.hazard}>
            <sphereGeometry args={[1.1, 12, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function TopCamera() {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.up.set(0, 0, -1); // screen up = -z, screen right = +x (matches SVG)
    camera.position.set(VIEW_W / 2, CAM_H, VIEW_H / 2);
    camera.lookAt(VIEW_W / 2, 0, VIEW_H / 2);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

export default function Car3D({
  stateRef,
  logoSrc,
}: {
  stateRef: { current: CarState };
  logoSrc?: string;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        camera={{
          fov: FOV,
          near: 100,
          far: 4000,
          position: [VIEW_W / 2, CAM_H, VIEW_H / 2],
        }}
      >
        <TopCamera />
        <ambientLight intensity={0.35} />
        <directionalLight position={[300, 900, -300]} intensity={1.6} />

        {/* Self-contained reflections (no HDR download): sky panel + lime accent */}
        <Environment resolution={256} frames={1}>
          <Lightformer
            form="rect"
            intensity={1.6}
            position={[0, 6, 0]}
            rotation-x={Math.PI / 2}
            scale={[14, 14, 1]}
          />
          <Lightformer
            form="rect"
            intensity={2.2}
            color={LIME}
            position={[-7, 2, 2]}
            rotation-y={Math.PI / 2}
            scale={[8, 3, 1]}
          />
          <Lightformer
            form="rect"
            intensity={1.2}
            position={[7, 2, -2]}
            rotation-y={-Math.PI / 2}
            scale={[8, 3, 1]}
          />
        </Environment>

        <Audi stateRef={stateRef} logoSrc={logoSrc} />
      </Canvas>
    </div>
  );
}