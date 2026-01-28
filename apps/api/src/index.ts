import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import authRoutes from './routes/auth.js';

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

    // Register auth routes (includes OAuth plugin)
    await fastify.register(authRoutes, { prefix: '/auth' });

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
