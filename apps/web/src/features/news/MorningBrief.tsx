import { useState, useEffect } from 'react';
import { api, type GeneratedBrief } from '../../lib/api';
import NewsCard from './NewsCard';
import './MorningBrief.css';

export default function MorningBrief() {
  const [brief, setBrief] = useState<GeneratedBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch daily brief (includes greeting, weather, news, tasks)
        const response = await api.getDailyBrief();
        console.log('Daily Brief data received:', response);
        setBrief(response.content);
      } catch (err) {
        console.error('Failed to fetch morning brief:', err);
        setError('Impossible de récupérer le brief du matin.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup audio on unmount
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [audio]);

  const handlePlayAudio = async () => {
    if (playing && audio) {
        audio.pause();
        setPlaying(false);
        return;
    }

    if (audio) {
        audio.play();
        setPlaying(true);
        return;
    }

    // Load audio
    setAudioLoading(true);
    try {
        const blob = await api.getDailyBriefAudio();
        const url = URL.createObjectURL(blob);
        const newAudio = new Audio(url);
        newAudio.onended = () => setPlaying(false);
        setAudio(newAudio);
        newAudio.play();
        setPlaying(true);
    } catch (err) {
        console.error('Failed to play audio brief:', err);
        // Fallback error message (optional)
    } finally {
        setAudioLoading(false);
    }
  };

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
  const hasNewsContent = 
    brief.news.sections.newsFrance || 
    brief.news.sections.newsIntl || 
    brief.news.sections.bizFrance || 
    brief.news.sections.bizIntl || 
    brief.news.sections.sports;

  // We show brief if we have Intro or News
  if (!brief.intro && !hasNewsContent) {
    return null;
  }

  return (
    <div className="morning-brief">
      <div className="brief-greeting">
        <div className="brief-greeting__content">
          <p className="brief-greeting__text">
            {brief.intro}
          </p>
          {brief.weather && (
            <div className="brief-weather">
              <span className="weather-icon">{brief.weather.icon}</span>
              <div className="weather-info">
                <div className="weather-main">
                  <span className="weather-temp">{brief.weather.temperature}°C</span>
                  <span className="weather-desc">{brief.weather.description}</span>
                </div>
                <div className="weather-range">
                  <span className="temp-min">↓ {brief.weather.minTemp}°</span>
                  <span className="temp-max">↑ {brief.weather.maxTemp}°</span>
                </div>
                {brief.weather.advice && <span className="weather-advice">{brief.weather.advice}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="morning-brief__header">
        <div className="header-left">
          <h2 className="morning-brief__title">
            ☕ Brief du matin
          </h2>
          <span className="brief-date">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        <button 
          className={`play-brief-btn ${playing ? 'playing' : ''} ${audioLoading ? 'loading' : ''}`}
          onClick={handlePlayAudio}
          disabled={audioLoading}
          title={playing ? "Arrêter la lecture" : "Écouter le brief"}
        >
          {audioLoading ? (
            <div className="btn-spinner"></div>
          ) : playing ? (
            <span className="btn-icon">⏹️</span>
          ) : (
            <span className="btn-icon">🔊</span>
          )}
          <span className="btn-text">
            {audioLoading ? "Génération..." : playing ? "Arrêter" : "Écouter"}
          </span>
        </button>
      </div>

      {brief.news.summary && (
        <div className="brief-summary">
          <div className="brief-summary__header">
            <span className="sparkle-icon">✨</span>
            <span className="summary-label">Le point Gemini</span>
          </div>
          <p className="brief-summary__text">
            {brief.news.summary}
          </p>
        </div>
      )}

      {/* Task Summary Section could be added here if desired, 
          currently tasks are in brief.tasks but UI design focused on News */}
      
      <div className="brief-content">
        <div className="brief-column">
          <h3 className="column-title">🗞️ Actualités</h3>
          <div className="cards-stack">
            {brief.news.sections.newsFrance && (
              <NewsCard
                article={brief.news.sections.newsFrance}
                category="France"
              />
            )}
            {brief.news.sections.newsIntl && (
              <NewsCard
                article={brief.news.sections.newsIntl}
                category="Monde"
              />
            )}
          </div>
        </div>

        <div className="brief-column">
          <h3 className="column-title">💼 Économie</h3>
          <div className="cards-stack">
            {brief.news.sections.bizFrance && (
              <NewsCard
                article={brief.news.sections.bizFrance}
                category="France"
              />
            )}
            {brief.news.sections.bizIntl && (
              <NewsCard
                article={brief.news.sections.bizIntl}
                category="Monde"
              />
            )}
          </div>
        </div>

        <div className="brief-column">
          <h3 className="column-title">🏆 Sport</h3>
          <div className="sport-card-wrapper">
             {brief.news.sections.sports && (
              <NewsCard
                article={brief.news.sections.sports}
                category="À la une"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
