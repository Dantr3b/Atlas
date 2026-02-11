import { FastifyInstance } from 'fastify';
import { getBrief } from '../services/newsService';

export async function newsRoutes(fastify: FastifyInstance) {
  fastify.get('/brief', async (request, reply) => {
    try {
      const brief = await getBrief();
      return brief;
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch news brief' });
    }
  });
}
