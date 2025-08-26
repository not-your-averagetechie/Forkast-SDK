import React, { useEffect, useRef, useState } from 'react';

export default function BotLogs() {
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const runBot = () => {
    setLogs([]);
    setRunning(true);
    setLoading(true);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    const es = new EventSource('/api/run-bot-stream');
    eventSourceRef.current = es;
    es.onmessage = (e) => {
      if (e.data === 'BOT_FINISHED') {
        setRunning(false);
        setLoading(false);
        es.close();
      } else {
        setLogs((prev) => [...prev, e.data]);
      }
    };
    es.onerror = () => {
      setRunning(false);
      setLoading(false);
      es.close();
    };
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  return (
    <div>
      <button onClick={runBot} disabled={running} style={{ marginBottom: 16 }}>
        {running ? 'Bot Running...' : 'Run Arbitrage Bot'}
      </button>
      {loading && (
        <div style={{ marginBottom: 16 }}>
          <span className="loader" style={{ marginRight: 8 }} /> Loading...
        </div>
      )}
      <pre style={{ background: '#222', color: '#eee', padding: 16, minHeight: 200 }}>
        {logs.join('\n')}
      </pre>
    </div>
  );
}
