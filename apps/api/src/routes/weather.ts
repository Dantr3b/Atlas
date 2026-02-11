import { FastifyInstance } from 'fastify';
import { weatherService } from '../services/weatherService.js';

export default async function weatherRoutes(fastify: FastifyInstance) {
  // GET /weather/:destination - Get weather for a specific destination
  // Supported destinations: FunKart, Sophia
  fastify.get<{ Params: { destination: 'FunKart' | 'Sophia' } }>(
    '/:destination',
    async (request, reply) => {
      const { destination } = request.params;

      if (destination !== 'FunKart' && destination !== 'Sophia') {
        return reply.status(400).send({ error: 'Invalid destination' });
      }

      try {
        const data = await weatherService.getWeather(destination);
        return reply.send(data);
      } catch (error) {
        request.log.error(error instanceof Error ? error.message : 'Error fetching weather');
        return reply.status(500).send({ error: 'Failed to fetch weather data' });
      }
    }
  );
}
