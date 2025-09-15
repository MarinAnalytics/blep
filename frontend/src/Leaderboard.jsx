import React, { useEffect, useState } from 'react';

export default function Leaderboard({ refreshToken }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`${apiBase}/api/leaderboard`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [apiBase, refreshToken]);

  return (
    <div id="leaderboard">
      <h2>Leader Board</h2>
      {loading && <div className="leaderboard-status">Loading…</div>}
      {error && !loading && <div className="leaderboard-status" role="alert">Error: {error}</div>}
      {!loading && !error && (
        <div className="leaderboard-list">
          {rows.length === 0 && <div className="leaderboard-status">No data yet</div>}
          {rows.map(row => (
            <div key={row.country_code} className="leaderboard-item">
              <div>
                <img src={`https://flagcdn.com/w40/${row.country_code.toLowerCase()}.png`} alt={`${row.country_name} flag`} /> {row.country_name}
              </div>
              <span>{row.bleps.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
