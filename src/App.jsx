import React, { useEffect, useRef, useState } from 'react';
import Leaderboard from './Leaderboard.jsx';
import blepAudio from '../blep.wav';
import inImg from '../img/in.jpg';
import outImg from '../img/out.jpg';

export default function App() {
  const initialCount = Number(import.meta.env.VITE_INITIAL_BLEP_COUNT || 0) || 0;
  const [blepCount, setBlepCount] = useState(initialCount);
  const [catSrc, setCatSrc] = useState(inImg);
  const [flag, setFlag] = useState({ url: '', alt: 'Loading flag...' });
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
      .then(data => setFlag({ url: `https://flagcdn.com/w40/${data.country_code.toLowerCase()}.png`, alt: `${data.country_name} flag` }))
      .catch(() => setFlag({ url: '', alt: 'Flag unavailable' }));
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

  const handlePress = () => {
    swapToOut();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    setBlepCount(c => c + 1);
    // Force layout to flush quickly (helps some Safari repaint timing)
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
      <Leaderboard />
    </div>
  );
}
