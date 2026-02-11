import { useState, useEffect } from 'react';
import { api, type BriefResponse } from '../../lib/api';
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
        console.log('Brief data received:', data);
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
  const hasContent = 
    brief.news.france || 
    brief.news.international || 
    brief.business.france || 
    brief.business.international || 
    brief.sports;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="morning-brief">
      <div className="morning-brief__header">
        <h2 className="morning-brief__title">
          ☕ Brief du matin
        </h2>
        <span className="brief-date">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {brief.aiSummary && (
        <div className="brief-summary">
          <div className="brief-summary__header">
            <span className="sparkle-icon">✨</span>
            <span className="summary-label">Le point Gemini</span>
          </div>
          <p className="brief-summary__text">
            {brief.aiSummary}
          </p>
        </div>
      )}

      <div className="brief-content">
        <div className="brief-column">
          <h3 className="column-title">🗞️ Actualités</h3>
          <div className="cards-stack">
            {brief.news.france && (
              <NewsCard
                article={brief.news.france}
                category="France"
              />
            )}
            {brief.news.international && (
              <NewsCard
                article={brief.news.international}
                category="Monde"
              />
            )}
          </div>
        </div>

        <div className="brief-column">
          <h3 className="column-title">💼 Économie</h3>
          <div className="cards-stack">
            {brief.business.france && (
              <NewsCard
                article={brief.business.france}
                category="France"
              />
            )}
            {brief.business.international && (
              <NewsCard
                article={brief.business.international}
                category="Monde"
              />
            )}
          </div>
        </div>

        <div className="brief-column">
          <h3 className="column-title">🏆 Sport</h3>
          <div className="sport-card-wrapper">
             {brief.sports && (
              <NewsCard
                article={brief.sports}
                category="À la une"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
