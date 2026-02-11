import { useState, useEffect } from 'react';
import { api, BriefResponse } from '../../lib/api';
import NewsCard from './NewsCard';
import './MorningBrief.css';

export default function MorningBrief() {
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrief = async () => {
      try {
        const data = await api.getBrief();
        setBrief(data);
      } catch (err) {
        console.error('Failed to fetch morning brief:', err);
        setError('Impossible de récupérer le brief du matin.');
      } finally {
        setLoading(false);
      }
    };

    fetchBrief();
  }, []);

  if (loading) {
    return (
      <div className="morning-brief-loading">
        <div className="app-spinner"></div>
        <p>Préparation de votre brief matinal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="morning-brief-error">
        <p>{error}</p>
      </div>
    );
  }

  if (!brief) {
    return null;
  }

  // Check if we have at least one article
  const hasContent = brief.politics || brief.business || brief.sports;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="morning-brief">
      <div className="morning-brief__header">
        <h2 className="morning-brief__title">
          ☕ Brief du matin
        </h2>
        {/* Date du jour */}
        <span className="text-sm text-gray-400">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      <div className="morning-brief__grid">
        {brief.politics && (
          <NewsCard article={brief.politics} category="politics" />
        )}
        
        {brief.business && (
          <NewsCard article={brief.business} category="business" />
        )}
        
        {brief.sports && (
          <NewsCard article={brief.sports} category="sports" />
        )}
      </div>
    </div>
  );
}
