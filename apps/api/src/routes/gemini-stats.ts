import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/require-auth.js';
import { geminiRateLimiter } from '../lib/gemini-rate-limiter.js';

export default async function geminiStatsRoutes(fastify: FastifyInstance) {
  // Require authentication
  fastify.addHook('onRequest', requireAuth);

  // GET /gemini-stats - Get current Gemini API usage stats
  fastify.get('/', async (request, reply) => {
    const stats = geminiRateLimiter.getStats();
    
    return reply.send({
      perMinute: stats.perMinute,
      perDay: stats.perDay,
      limits: stats.limits,
      usage: {
        perMinutePercent: Math.round((stats.perMinute / stats.limits.perMinute) * 100),
        perDayPercent: Math.round((stats.perDay / stats.limits.perDay) * 100),
      },
    });
  });
}
