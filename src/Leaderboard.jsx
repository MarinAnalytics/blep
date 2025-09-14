import React from 'react';

const data = [
  { code: 'us', name: 'USA', count: 12345678 },
  { code: 'ca', name: 'Canada', count: 9876543 },
  { code: 'gb', name: 'UK', count: 8765432 },
  { code: 'de', name: 'Germany', count: 7654321 },
  { code: 'fr', name: 'France', count: 6543210 },
  { code: 'jp', name: 'Japan', count: 5432109 },
  { code: 'in', name: 'India', count: 4321098 },
  { code: 'au', name: 'Australia', count: 3210987 },
  { code: 'br', name: 'Brazil', count: 2109876 },
  { code: 'za', name: 'South Africa', count: 1098765 },
];

export default function Leaderboard() {
  return (
    <div id="leaderboard">
      <h2>Leader Board</h2>
      <div className="leaderboard-list">
        {data.map(row => (
          <div key={row.code} className="leaderboard-item">
            <div>
              <img src={`https://flagcdn.com/w40/${row.code}.png`} alt={`${row.name} flag`} /> {row.name}
            </div>
            <span>{row.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
