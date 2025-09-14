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

  const handleMouseDown = () => {
    setCatSrc(outImg);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
    setBlepCount(c => c + 1);
  };
  const handleMouseUp = () => setCatSrc(inImg);

  return (
    <div className="app-root">
      <img id="catImg" src={catSrc} alt="Cat" draggable={false} />
      <div
        id="targetArea"
        ref={targetRef}
        role="button"
        aria-label="Boop the snoot"
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={(e) => { e.preventDefault(); handleMouseDown(); }}
        onTouchEnd={(e) => { e.preventDefault(); handleMouseUp(); }}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleMouseDown();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleMouseUp();
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
