import { useEffect, useState } from 'react';
import './GeminiQuotaWidget.css';

interface QuotaStats {
  perMinute: number;
  perDay: number;
  limits: {
    perMinute: number;
    perDay: number;
  };
  usage: {
    perMinutePercent: number;
    perDayPercent: number;
  };
}

export default function GeminiQuotaWidget() {
  const [stats, setStats] = useState<QuotaStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/gemini-stats`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setStats(data);
          setError(false);
        }
      } catch {
        setError(true);
      }
    };

    // Fetch initially
    fetchStats();

    // Refresh every 10 seconds
    const interval = setInterval(fetchStats, 10000);

    return () => clearInterval(interval);
  }, []);

  if (error || !stats) return null;

  const isHighUsage = stats.usage.perDayPercent > 80 || stats.usage.perMinutePercent > 80;

  return (
    <div className={`quota-widget ${isHighUsage ? 'quota-widget--warning' : ''}`}>
      <div className="quota-widget__title">
        ✨ Quota Gemini
      </div>
      <div className="quota-widget__stats">
        <div className="quota-widget__stat">
          <span className="quota-widget__label">Minute:</span>
          <span className="quota-widget__value">
            {stats.perMinute}/{stats.limits.perMinute}
          </span>
          <span className="quota-widget__percent">({stats.usage.perMinutePercent}%)</span>
        </div>
        <div className="quota-widget__stat">
          <span className="quota-widget__label">Jour:</span>
          <span className="quota-widget__value">
            {stats.perDay}/{stats.limits.perDay}
          </span>
          <span className="quota-widget__percent">({stats.usage.perDayPercent}%)</span>
        </div>
      </div>
    </div>
  );
}
