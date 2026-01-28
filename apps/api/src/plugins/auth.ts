import fp from 'fastify-plugin';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyOAuth2 from '@fastify/oauth2';
import { FastifyInstance } from 'fastify';

export default fp(async function (fastify: FastifyInstance) {
  // Register cookie support
  await fastify.register(fastifyCookie);

  // Register session
  await fastify.register(fastifySession, {
    secret: process.env.SESSION_SECRET!,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax',
    },
  });

  // Register OAuth2
  await fastify.register(fastifyOAuth2, {
    name: 'googleOAuth2',
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly'],
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID!,
        secret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      auth: fastifyOAuth2.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/auth/google',
    callbackUri: 'http://localhost:3000/auth/google/callback',
  });
});
