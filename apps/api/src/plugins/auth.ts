import fp from 'fastify-plugin';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { FastifyInstance } from 'fastify';

export default fp(async function (fastify: FastifyInstance) {
  // Register cookie support
  await fastify.register(fastifyCookie);

  // Register session
  await fastify.register(fastifySession, {
    secret: process.env.SESSION_SECRET!,
    cookieName: 'sessionId',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax',
    },
  });
});

