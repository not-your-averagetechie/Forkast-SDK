import React, { useState } from 'react';
import axios from 'axios';
import BotLogs from '../components/BotLogs';

export default function Home() {

  const [markets, setMarkets] = useState<any[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);

  const fetchMarkets = async () => {
    setLoadingMarkets(true);
    try {
      const res = await axios.get('/api/markets');
      setMarkets(res.data.markets);
    } finally {
      setLoadingMarkets(false);
    }
  };

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <h1>Forkast Arbitrage Bot</h1>
      <button onClick={fetchMarkets} style={{ marginRight: 16 }} disabled={loadingMarkets}>
        {loadingMarkets ? 'Loading Markets...' : 'List All Markets'}
      </button>
      <h2>Markets</h2>
      {loadingMarkets && (
        <div style={{ marginBottom: 16 }}>
          <span className="loader" style={{ marginRight: 8 }} /> Loading...
        </div>
      )}
      <ul>
        {markets.map(m => (
          <li key={m.id}>
            <b>ID:</b> {m.id} | <b>Title:</b> {m.title} | <b>Status:</b> {m.status}
          </li>
        ))}
      </ul>
      <h2>Bot Logs</h2>
      <BotLogs />
    </div>
  );
}
