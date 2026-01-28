import { FastifyReply, FastifyRequest } from 'fastify';
import '@fastify/session';

declare module 'fastify' {
  interface Session {
    userId?: string;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.session.get('userId');
  
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}
