import { FastifyInstance } from 'fastify';
import { dailyBriefService } from '../services/dailyBriefService.js';
import { ttsService } from '../services/ttsService.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/require-auth.js';

export default async function briefRoutes(fastify: FastifyInstance) {
  // Routes require authentication
  fastify.addHook('onRequest', requireAuth);

  // GET /brief/audio - Get audio stream of today's brief
  fastify.get('/audio', async (request, reply) => {
    const userId = request.session.get('userId');
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dbBrief = await prisma.dailyBrief.findUnique({
      where: { userId_date: { userId, date: today } }
    });

    if (!dbBrief) {
         request.log.info({ msg: 'Generating daily brief for audio request', userId });
         await dailyBriefService.generateBriefForUser(userId, today);
         dbBrief = await prisma.dailyBrief.findUnique({
           where: { userId_date: { userId, date: today } }
         });
    }

    if (!dbBrief) {
        return reply.status(404).send({ error: 'Brief not found' });
    }

    try {
        const briefData = JSON.parse(dbBrief.fullText);
        const script = dailyBriefService.generateSpeechScript(briefData);
        
        const audioBuffer = await ttsService.synthesize(script);
        
        reply.type('audio/mpeg');
        return reply.send(audioBuffer);
    } catch (e) {
        request.log.error(e);
        return reply.status(500).send({ error: 'Failed to generate audio' });
    }
  });

  // GET /brief/daily - Get or generate today's brief
  fastify.get('/daily', async (request, reply) => {
    // Get user from session
    const userId = request.session.get('userId');
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    // Check if brief exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Always generate/update brief to ensure fresh tasks and weather
    // (News service handles caching internally to avoid excessive AI calls)
    try {
      request.log.info({ msg: 'Generating/Updating daily brief for user', userId });
      await dailyBriefService.generateBriefForUser(userId, today);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate brief' });
    }

    // Fetch the updated brief from DB
    const brief = await prisma.dailyBrief.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      select: {
        id: true,
        fullText: true, // JSON content
        listened: true,
        generatedAt: true,
      }
    });

    if (!brief) {
      return reply.status(500).send({ error: 'Failed to retrieve brief' });
    }

    try {
        const content = JSON.parse(brief.fullText);
        return reply.send({
            id: brief.id,
            date: today.toISOString().split('T')[0],
            content,
            listened: brief.listened,
            generatedAt: brief.generatedAt
        });
    } catch (e) {
        request.log.error(e);
        return reply.status(500).send({ error: 'Invalid brief format' });
    }
  });

  // POST /brief/:date/listened - Mark brief as listened
  fastify.post('/:date/listened', async (request, reply) => {
    const userId = request.session.get('userId');
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const { date } = request.params as { date: string };
    
    let targetDate = new Date();
    if (date === 'today' || !date) {
        targetDate = new Date();
    } else {
        targetDate = new Date(date);
    }
    targetDate.setHours(0, 0, 0, 0);

    if (isNaN(targetDate.getTime())) {
        return reply.status(400).send({ error: 'Invalid date format' });
    }

    try {
        await prisma.dailyBrief.update({
            where: {
                userId_date: {
                    userId,
                    date: targetDate
                }
            },
            data: {
                listened: true
            }
        });
        return reply.send({ success: true, listened: true });
    } catch (e) {
        return reply.status(404).send({ error: 'Brief not found for this date' });
    }
  });
}
