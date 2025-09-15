import React, { useEffect, useRef, useState } from 'react';
import Leaderboard from './Leaderboard.jsx';
import blepAudio from '../assets/audio/blep.wav';
import inImg from '../assets/img/in.jpg';
import outImg from '../assets/img/out.jpg';

export default function App() {
  const initialCount = Number(import.meta.env.VITE_INITIAL_BLEP_COUNT || 0) || 0;
  const [blepCount, setBlepCount] = useState(initialCount);
  const [catSrc, setCatSrc] = useState(inImg);
  const [flag, setFlag] = useState({ url: '', alt: 'Loading flag...', code: null, name: null });
  const [refreshToken, setRefreshToken] = useState(0);
  const audioRef = useRef(null);
  const targetRef = useRef(null);

  useEffect(() => {
  audioRef.current = new Audio(blepAudio);
  const vol = parseFloat(import.meta.env.VITE_AUDIO_VOLUME || '1.0');
  if (!Number.isNaN(vol)) audioRef.current.volume = Math.min(Math.max(vol, 0), 1);
  }, []);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_FLAG_API || 'https://ipapi.co/json/?fields=country_code,country_name';
    fetch(apiUrl)
      .then(r => r.json())
      .then(data => setFlag({
        url: `https://flagcdn.com/w40/${data.country_code.toLowerCase()}.png`,
        alt: `${data.country_name} flag`,
        code: data.country_code,
        name: data.country_name,
      }))
      .catch(() => setFlag({ url: '', alt: 'Flag unavailable', code: null, name: null }));
  }, []);

  // Preload alternate image to avoid delay on first press (especially iOS Safari)
  useEffect(() => {
    const preload = new Image();
    preload.src = outImg;
  }, []);

  const swapToOut = () => {
    // Direct DOM update then state update (some tablets delay React state-driven <img> src paint)
    const imgEl = document.getElementById('catImg');
    if (imgEl && imgEl.getAttribute('src') !== outImg) {
      imgEl.setAttribute('src', outImg);
    }
    setCatSrc(outImg);
  };
  const swapToIn = () => {
    const imgEl = document.getElementById('catImg');
    if (imgEl && imgEl.getAttribute('src') !== inImg) {
      imgEl.setAttribute('src', inImg);
    }
    setCatSrc(inImg);
  };

  // Debounced / batched increment logic
  const pendingIncrementsRef = useRef(0);
  const flushTimerRef = useRef(null);
  const debounceMs = Number(import.meta.env.VITE_BLEP_DEBOUNCE_MS || 400);
  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  const flushIncrements = React.useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const count = pendingIncrementsRef.current;
    if (!count) return;
    // Reset local counter before network call to avoid double counting on retries.
    pendingIncrementsRef.current = 0;
    if (flag.code && flag.name) {
      fetch(`${apiBase}/api/blep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country_code: flag.code, country_name: flag.name, count })
      }).then(r => r.json())
        .then(() => setRefreshToken(t => t + 1))
        .catch(() => { /* swallow; optimistic UI already updated */ });
    }
  }, [apiBase, flag.code, flag.name]);

  const scheduleFlush = () => {
    // True debounce: reset timer on every new press so flush happens debounceMs after the *last* press.
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
    }
    flushTimerRef.current = setTimeout(flushIncrements, debounceMs);
  };

  useEffect(() => {
    const handleBeforeUnload = () => flushIncrements();
    const handleVisibility = () => { if (document.visibilityState === 'hidden') flushIncrements(); };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [flushIncrements]);

  const handlePress = () => {
    swapToOut();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    // Optimistically update UI immediately.
    setBlepCount(c => c + 1);
    pendingIncrementsRef.current += 1;
    scheduleFlush();
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {});
    }
  };
  const handleRelease = () => swapToIn();

  return (
    <div className="app-root">
      <img id="catImg" src={catSrc} alt="Cat" draggable={false} />
      <div
        id="targetArea"
        ref={targetRef}
        role="button"
        aria-label="Boop the snoot"
        tabIndex={0}
    onPointerDown={(e) => { e.preventDefault(); handlePress(); }}
    onPointerUp={(e) => { e.preventDefault(); handleRelease(); }}
    onPointerLeave={(e) => { if (e.pointerType !== 'mouse') handleRelease(); }}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
      handlePress();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
      handleRelease();
          }
        }}
      />
      <div id="blepCounterContainer">
        {flag.url && <img id="countryFlag" src={flag.url} alt={flag.alt} />}
        <span id="blepCounter">{blepCount.toLocaleString()}</span>
      </div>
  <Leaderboard refreshToken={refreshToken} />
    </div>
  );
}
