import { FastifyInstance } from 'fastify';
import { OAuth2Namespace } from '@fastify/oauth2';
import { OAuth2Client } from 'google-auth-library';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyOAuth2 from '@fastify/oauth2';
import { prisma } from '../lib/prisma.js';

export default async function authRoutes(fastify: FastifyInstance) {
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
    startRedirectPath: '/google',
    callbackUri: 'http://localhost:3000/auth/google/callback',
  });

  const googleOAuth2 = fastify.googleOAuth2 as OAuth2Namespace;

  // GET /google/callback
  fastify.get('/google/callback', async (request, reply) => {
    try {
      const { token } = await googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      // Verify token and get user info
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID!);
      const ticket = await client.verifyIdToken({
        idToken: token.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID!,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return reply.status(400).send({ error: 'Invalid token payload' });
      }

      // Check whitelist
      const allowedEmail = process.env.ALLOWED_EMAIL!;
      if (payload.email !== allowedEmail) {
        return reply.status(403).send({ 
          error: 'Access denied',
          message: 'Your email is not whitelisted for this application'
        });
      }

      // Create or update user
      const user = await prisma.user.upsert({
        where: { email: payload.email },
        update: {
          name: payload.name || null,
          accessToken: token.access_token || null,
          refreshToken: token.refresh_token || null,
        },
        create: {
          email: payload.email,
          name: payload.name || null,
          googleId: payload.sub,
          accessToken: token.access_token || null,
          refreshToken: token.refresh_token || null,
        },
      });

      // Set session
      request.session.set('userId', user.id);

      // Redirect to frontend
      return reply.redirect(process.env.FRONTEND_URL!);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Authentication failed' });
    }
  });

  // GET /me
  fastify.get('/me', async (request, reply) => {
    const userId = request.session.get('userId');

    if (!userId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      request.session.delete();
      return reply.status(401).send({ error: 'User not found' });
    }

    return reply.send({ user });
  });

  // POST /logout
  fastify.post('/logout', async (request, reply) => {
    request.session.delete();
    return reply.send({ success: true });
  });
}
