import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import parseNaturalRoutes from './routes/parse-natural.js';
import geminiStatsRoutes from './routes/gemini-stats.js';

const fastify = Fastify({
  logger: true,
});

// Start server
const start = async () => {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    });

    // Register auth plugin (cookie + session)
    await fastify.register(authPlugin);

    // Register auth routes (includes OAuth plugin)
    await fastify.register(authRoutes, { prefix: '/auth' });

    // Register task routes
    await fastify.register(taskRoutes, { prefix: '/tasks' });

    // Register natural language parsing route
    await fastify.register(parseNaturalRoutes, { prefix: '/tasks/parse-natural' });

    // Register Gemini stats route
    await fastify.register(geminiStatsRoutes, { prefix: '/gemini-stats' });

    // Health check
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Server running at http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
