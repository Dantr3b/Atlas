import { FastifyInstance } from 'fastify';

interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
}

interface HourlyForecast {
  time: string;
  temperature: number;
  weatherCode: number;
  icon: string;
  description: string;
  precipitation: number;
}

interface DailyForecast {
  temperatureMin: number;
  temperatureMax: number;
  hourly: HourlyForecast[];
}

// Coordinates for locations
const LOCATIONS = {
  FunKart: { lat: 43.7011, lon: 6.9897, name: 'Le Bar-sur-Loup' },
  Sophia: { lat: 43.6174, lon: 7.0574, name: 'Sophia Antipolis' },
};

// Weather code to description and icon mapping (WMO Weather interpretation codes)
const WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: 'Ciel dégagé', icon: '☀️' },
  1: { description: 'Principalement dégagé', icon: '🌤️' },
  2: { description: 'Partiellement nuageux', icon: '⛅' },
  3: { description: 'Couvert', icon: '☁️' },
  45: { description: 'Brouillard', icon: '🌫️' },
  48: { description: 'Brouillard givrant', icon: '🌫️' },
  51: { description: 'Bruine légère', icon: '🌦️' },
  53: { description: 'Bruine modérée', icon: '🌦️' },
  55: { description: 'Bruine dense', icon: '🌧️' },
  61: { description: 'Pluie légère', icon: '🌧️' },
  63: { description: 'Pluie modérée', icon: '🌧️' },
  65: { description: 'Pluie forte', icon: '⛈️' },
  71: { description: 'Neige légère', icon: '🌨️' },
  73: { description: 'Neige modérée', icon: '🌨️' },
  75: { description: 'Neige forte', icon: '❄️' },
  77: { description: 'Grains de neige', icon: '🌨️' },
  80: { description: 'Averses légères', icon: '🌦️' },
  81: { description: 'Averses modérées', icon: '🌧️' },
  82: { description: 'Averses violentes', icon: '⛈️' },
  85: { description: 'Averses de neige légères', icon: '🌨️' },
  86: { description: 'Averses de neige fortes', icon: '❄️' },
  95: { description: 'Orage', icon: '⛈️' },
  96: { description: 'Orage avec grêle légère', icon: '⛈️' },
  99: { description: 'Orage avec grêle forte', icon: '⛈️' },
};

export default async function weatherRoutes(fastify: FastifyInstance) {
  // GET /weather/:destination - Get weather for a specific destination
  fastify.get<{ Params: { destination: 'FunKart' | 'Sophia' } }>(
    '/:destination',
    async (request, reply) => {
      const { destination } = request.params;

      if (!LOCATIONS[destination]) {
        return reply.status(400).send({ error: 'Invalid destination' });
      }

      try {
        const location = LOCATIONS[destination];
        // Open-Meteo API - completely free, no API key required
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=temperature_2m_max,temperature_2m_min&timezone=Europe/Paris&forecast_days=1`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Open-Meteo API error: ${response.status}`);
        }

        const data: any = await response.json();
        const current = data.current;
        const daily = data.daily;
        const hourly = data.hourly;

        const weatherCode = current.weather_code || 0;
        const weatherInfo = WEATHER_CODES[weatherCode] || WEATHER_CODES[0];

        const weather: WeatherData = {
          temperature: Math.round(current.temperature_2m),
          description: weatherInfo.description,
          icon: weatherInfo.icon,
          feelsLike: Math.round(current.apparent_temperature),
          humidity: current.relative_humidity_2m,
          windSpeed: Math.round(current.wind_speed_10m),
        };

        // Build hourly forecast for today
        const now = new Date();
        const hourlyForecast: HourlyForecast[] = hourly.time
          .map((time: string, index: number) => {
            const forecastTime = new Date(time);
            // Only include hours from now until end of day
            if (forecastTime >= now && forecastTime.getDate() === now.getDate()) {
              const code = hourly.weather_code[index] || 0;
              const info = WEATHER_CODES[code] || WEATHER_CODES[0];
              return {
                time: forecastTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                temperature: Math.round(hourly.temperature_2m[index]),
                weatherCode: code,
                icon: info.icon,
                description: info.description,
                precipitation: hourly.precipitation_probability[index] || 0,
              };
            }
            return null;
          })
          .filter((item: any) => item !== null);

        const forecast: DailyForecast = {
          temperatureMin: Math.round(daily.temperature_2m_min[0]),
          temperatureMax: Math.round(daily.temperature_2m_max[0]),
          hourly: hourlyForecast,
        };

        return reply.send({
          location: location.name,
          weather,
          forecast,
        });
      } catch (error) {
        fastify.log.error(error instanceof Error ? error.message : 'Error fetching weather');
        return reply.status(500).send({ error: 'Failed to fetch weather data' });
      }
    }
  );
}
