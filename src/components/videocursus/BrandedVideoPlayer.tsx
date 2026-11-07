"use client";

import { useEffect, useRef, useState } from "react";

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
const controlsIdleDelay = 3000;
const controlClass = "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-paper/80 transition hover:bg-white/10 hover:text-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime";

function timeLabel(seconds: number) {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

export default function BrandedVideoPlayer({ src, title, onEnded }: { src: string; title: string; onEnded: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const speedButtonRef = useRef<HTMLButtonElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealOnTap = useRef(false);
  const isPlayingRef = useRef(false); // Houdt betrouwbaar bij of de video speelt voor de timer
  
  const [controlsVisible, setControlsVisible] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation states for skip buttons
  const [skipForwardActive, setSkipForwardActive] = useState(false);
  const [skipBackwardActive, setSkipBackwardActive] = useState(false);

  // Zorg dat de controls altijd zichtbaar zijn als de video gepauzeerd is
  useEffect(() => {
    isPlayingRef.current = playing;
    if (playing) {
      showControls();
    } else {
      setControlsVisible(true);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    }
  }, [playing]);

  useEffect(() => {
    idleTimer.current = setTimeout(() => setControlsVisible(false), controlsIdleDelay);
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  function showControls() {
    setControlsVisible(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      // Verberg de controls na 3 seconden inactiviteit, MAAR alleen als hij afspeelt
      if (isPlayingRef.current) {
        setControlsVisible(false);
        setSpeedOpen(false);
      }
    }, controlsIdleDelay);
  }

  function hideControls() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (isPlayingRef.current) {
      setControlsVisible(false);
      setSpeedOpen(false);
    }
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    try {
      setError(null);
      await video.play();
    } catch {
      setError("De video kon niet worden afgespeeld. Probeer het opnieuw.");
    }
  }

  function skip(seconds: number) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + seconds));
    
    if (seconds > 0) {
      setSkipForwardActive(true);
      setTimeout(() => setSkipForwardActive(false), 500);
    } else {
      setSkipBackwardActive(true);
      setTimeout(() => setSkipBackwardActive(false), 500);
    }
  }

  async function toggleFullscreen() {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (document.fullscreenElement === player) {
        await document.exitFullscreen();
      } else if (player.requestFullscreen) {
        await player.requestFullscreen();
      } else throw new Error("Fullscreen is unavailable");
    } catch {
      setError("Volledig scherm is niet beschikbaar in deze browser.");
    }
  }

  async function togglePictureInPicture() {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement === video) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      setError("Beeld-in-beeld is niet beschikbaar voor deze video.");
    }
  }

  return (
    <div
      ref={playerRef}
      onPointerEnter={(event) => { if (event.pointerType !== "touch") showControls(); }}
      onPointerMove={(event) => { if (event.pointerType !== "touch") showControls(); }}
      onPointerDown={(event) => {
        revealOnTap.current = event.pointerType === "touch" && !controlsVisible && event.target === videoRef.current;
        showControls();
      }}
      onPointerLeave={(event) => { if (event.pointerType !== "touch") hideControls(); }}
      // Zodra controlsVisible false is EN hij speelt af, verbergen we de muis (cursor-none)
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-black fullscreen:flex fullscreen:flex-col fullscreen:justify-center ${!controlsVisible && playing ? "cursor-none" : ""}`}
    >
      <style dangerouslySetInnerHTML={{__html: `
        /* Skip Animations */
        @keyframes skipPulse {
            0% { transform: scale(0.8); opacity: 0; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 0; }
        }
        .skip-anim {
            position: absolute;
            top: 50%;
            pointer-events: none;
            transform: translateY(-50%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.8);
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(8px);
            border-radius: 50%;
            width: 80px;
            height: 80px;
            animation: skipPulse 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            z-index: 10;
        }
        .skip-anim-left { left: 15%; }
        .skip-anim-right { right: 15%; }

        /* Custom Volume Slider */
        input[type="range"].volume-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 2px;
          outline: none;
        }
        input[type="range"].volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #CCFF00;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(204, 255, 0, 0.6);
          transition: transform 0.2s ease;
        }
        input[type="range"].volume-slider:hover::-webkit-slider-thumb,
        input[type="range"].volume-slider:focus::-webkit-slider-thumb {
          transform: scale(1.3);
        }
      `}}/>

      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        aria-label={title}
        onClick={() => {
          if (revealOnTap.current) {
            revealOnTap.current = false;
            return;
          }
          void togglePlayback();
        }}
        onContextMenu={(event) => event.preventDefault()}
        onPlay={() => { setPlaying(true); showControls(); }}
        onPause={() => { setPlaying(false); showControls(); }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onVolumeChange={(event) => {
          setVolume(event.currentTarget.volume);
          setMuted(event.currentTarget.muted);
        }}
        onRateChange={(event) => setSpeed(event.currentTarget.playbackRate)}
        onEnded={onEnded}
        onError={() => setError("De video kon niet worden geladen. Probeer de pagina opnieuw te laden.")}
        className="aspect-video w-full bg-black object-contain cursor-pointer"
      >
        Je browser ondersteunt deze video niet.
      </video>

      {/* Skip Visual Feedback */}
      {skipBackwardActive && (
          <div className="skip-anim skip-anim-left">
              <div className="flex flex-col items-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6"><path d="m13 7-5 5 5 5m5-10-5 5 5 5" /></svg>
                  <span className="text-xs font-bold mt-1">-10s</span>
              </div>
          </div>
      )}
      {skipForwardActive && (
          <div className="skip-anim skip-anim-right">
              <div className="flex flex-col items-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6"><path d="m6 7 5 5-5 5m5-10 5 5-5 5" /></svg>
                  <span className="text-xs font-bold mt-1">+10s</span>
              </div>
          </div>
      )}

      <div className={`absolute inset-x-2 bottom-2 rounded-2xl border border-white/15 bg-[#121215]/80 px-3 pb-2 pt-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-opacity ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:inset-x-5 sm:bottom-4 sm:px-5 sm:pb-3 ${controlsVisible ? "opacity-100 duration-300" : "pointer-events-none opacity-0 duration-700"}`}>
        <input
          type="range"
          aria-label="Videovoortgang"
          aria-valuetext={`${timeLabel(currentTime)} van ${timeLabel(duration)}`}
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration)}
          disabled={!duration}
          onChange={(event) => {
            if (videoRef.current) videoRef.current.currentTime = Number(event.target.value);
          }}
          className="video-progress block w-full cursor-pointer disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(to right, #ccff00 ${duration ? Math.min((currentTime / duration) * 100, 100) : 0}%, rgba(255,255,255,0.18) 0)` }}
        />
        
        <div className="mt-2 flex flex-wrap items-center gap-1 sm:gap-2">
          {/* Linkerkant: -10s, Play/Pause, +10s */}
          <button type="button" onClick={() => skip(-10)} disabled={!duration} aria-label="10 seconden terug" title="10 seconden terug" className={`${controlClass} disabled:opacity-40`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m13 7-5 5 5 5m5-10-5 5 5 5" /></svg>
          </button>
          
          <button type="button" onClick={() => void togglePlayback()} aria-label={playing ? "Pauzeren" : "Afspelen"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime text-ink shadow-[0_0_20px_rgba(204,255,0,0.35)] transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime">
            {playing
              ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M6 4h4v16H6zm8 0h4v16h-4z" /></svg>
              : <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 ml-0.5"><path d="M7 4v16l13-8z" /></svg>}
          </button>
          
          <button type="button" onClick={() => skip(10)} disabled={!duration} aria-label="10 seconden vooruit" title="10 seconden vooruit" className={`${controlClass} disabled:opacity-40`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m6 7 5 5-5 5m5-10 5 5-5 5" /></svg>
          </button>
          
          {/* Tijdsaanduiding */}
          <span className="ml-2 whitespace-nowrap text-xs font-bold tabular-nums text-paper/90 sm:text-sm">{timeLabel(currentTime)} <span className="px-1 text-paper/40">/</span> <span className="text-paper/60">{timeLabel(duration)}</span></span>

          {/* Rechterkant uitgelijnd met ml-auto */}
          <div className="ml-auto flex items-center gap-1">
            
            {/* Volume Control */}
            <div className="mr-2 flex items-center">
              <button type="button" onClick={() => {
                const video = videoRef.current;
                if (!video) return;
                if (video.muted || video.volume === 0) {
                  if (video.volume === 0) video.volume = 0.5;
                  video.muted = false;
                } else video.muted = true;
              }} aria-label={muted || volume === 0 ? "Geluid inschakelen" : "Geluid dempen"} className={controlClass}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M11 5 6 9H3v6h3l5 4z" />
                  {muted || volume === 0 ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12" />}
                </svg>
              </button>
              <input type="range" aria-label="Volume" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                onChange={(event) => {
                  if (!videoRef.current) return;
                  videoRef.current.volume = Number(event.target.value);
                  videoRef.current.muted = false;
                }}
                className="volume-slider w-16 cursor-pointer m-0 transition-all"
                style={{
                  background: `linear-gradient(to right, #CCFF00 ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.15) 0)`
                }}
              />
            </div>
            
            {/* Snelheid */}
            <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSpeedOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") { setSpeedOpen(false); event.currentTarget.querySelector("button")?.focus(); } }}>
              <button ref={speedButtonRef} type="button" aria-label="Afspeelsnelheid" aria-expanded={speedOpen} onClick={() => setSpeedOpen((open) => !open)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-bold text-lime transition hover:border-lime/50 hover:bg-lime/10 focus-visible:outline-2 focus-visible:outline-lime">{speed}×</button>
              {speedOpen && <div role="group" aria-label="Kies afspeelsnelheid" className="absolute bottom-full right-0 z-10 mb-2 max-h-[min(14rem,20vw,35vh)] w-36 overflow-y-auto rounded-2xl border border-white/15 bg-[#18181b]/95 p-1.5 shadow-2xl backdrop-blur-xl">
                {speeds.map((value) => <button key={value} type="button" aria-pressed={speed === value} onClick={() => {
                  if (videoRef.current) videoRef.current.playbackRate = value;
                  setSpeedOpen(false);
                  speedButtonRef.current?.focus();
                }} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${speed === value ? "bg-lime/10 font-bold text-lime" : "text-paper/80 hover:bg-white/10"}`}>{value}× {value === 1 && "Normaal"}</button>)}
              </div>}
            </div>
            
            {/* Beeld in Beeld */}
            <button type="button" onClick={() => void togglePictureInPicture()} aria-label="Beeld-in-beeld" title="Beeld-in-beeld" className={controlClass}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="3" y="5" width="18" height="14" rx="2" /><rect x="12" y="11" width="7" height="5" rx="1" /></svg>
            </button>
            
            {/* Fullscreen */}
            <button type="button" onClick={() => void toggleFullscreen()} aria-label="Volledig scherm in- of uitschakelen" title="Volledig scherm" className={controlClass}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5" /></svg>
            </button>
            
          </div>
        </div>
      </div>
      
      {error && <div role="alert" className="absolute bottom-4 right-4 z-20 flex max-w-sm gap-3 rounded-2xl border border-red-500/50 bg-[#2a0d12]/95 px-5 py-4 text-sm font-semibold text-red-300 shadow-2xl">
        <span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Melding sluiten">✕</button>
      </div>}
    </div>
  );
}