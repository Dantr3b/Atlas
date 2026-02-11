import { useState, useEffect } from 'react';
import { api, type BriefResponse, type GreetingResponse, type WeatherResponse } from '../../lib/api';
import NewsCard from './NewsCard';
import './MorningBrief.css';

export default function MorningBrief() {
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [greeting, setGreeting] = useState<GreetingResponse | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both brief and greeting in parallel
        const [briefData, greetingData] = await Promise.all([
          api.getBrief(),
          api.getGreeting(),
        ]);
        console.log('Brief data received:', briefData);
        console.log('Greeting data received:', greetingData);
        setBrief(briefData);
        setGreeting(greetingData);

        // Fetch weather based on destination
        if (greetingData.destination) {
          try {
            const weatherData = await api.getWeather(greetingData.destination);
            console.log('Weather data received:', weatherData);
            setWeather(weatherData);
          } catch (err) {
            console.error('Failed to fetch weather:', err);
          }
        }
      } catch (err) {
        console.error('Failed to fetch morning brief:', err);
        setError('Impossible de récupérer le brief du matin.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
      {greeting?.destination && (
        <div className="brief-greeting">
          <div className="brief-greeting__content">
            <p className="brief-greeting__text">
              Bonjour Gabin, aujourd'hui direction <span className="destination">{greeting.destination}</span>
            </p>
            {weather && (
              <div className="brief-weather">
                <span className="weather-icon">{weather.weather.icon}</span>
                <div className="weather-info">
                  <span className="weather-temp">{weather.weather.temperature}°C</span>
                  <span className="weather-desc">{weather.weather.description}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {weather?.forecast && (
        <div className="brief-forecast">
          <div className="forecast-header">
            <h3 className="forecast-title">Prévisions de la journée</h3>
            <div className="forecast-minmax">
              <span className="temp-min">↓ {weather.forecast.temperatureMin}°C</span>
              <span className="temp-max">↑ {weather.forecast.temperatureMax}°C</span>
            </div>
          </div>
          <div className="forecast-hourly">
            {weather.forecast.hourly.slice(0, 8).map((hour, index) => (
              <div key={index} className="forecast-hour">
                <span className="hour-time">{hour.time}</span>
                <span className="hour-icon">{hour.icon}</span>
                <span className="hour-temp">{hour.temperature}°</span>
                {hour.precipitation > 0 && (
                  <span className="hour-rain">💧 {hour.precipitation}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
