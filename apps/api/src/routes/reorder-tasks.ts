import { FastifyInstance } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/require-auth.js';
import { geminiRateLimiter } from '../lib/gemini-rate-limiter.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface TaskPriority {
  id: string;
  priority: number;
  reasoning: string;
}

export default async function reorderTasksRoutes(fastify: FastifyInstance) {
  // Require authentication
  fastify.addHook('onRequest', requireAuth);

  // POST /tasks/reorder - Reorder all tasks using AI
  fastify.post('/', async (request, reply) => {
    const userId = request.session.get('userId')!;

    // Check rate limit before making API call
    const limitCheck = await geminiRateLimiter.checkLimit();
    if (!limitCheck.allowed) {
      fastify.log.warn({
        event: 'gemini_rate_limit_exceeded',
        userId,
        reason: limitCheck.reason,
      });
      
      return reply.status(429).send({
        error: 'Rate limit exceeded',
        message: limitCheck.reason,
        retryAfter: 60,
      });
    }

    try {
      // Fetch all non-completed tasks
      const tasks = await prisma.task.findMany({
        where: {
          userId,
          status: { not: 'COMPLETED' },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (tasks.length === 0) {
        return reply.send({
          success: true,
          updated: 0,
          message: 'No tasks to reorder',
        });
      }

      // Fetch upcoming calendar events (next 7 days)
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const calendarEvents = await prisma.calendarEvent.findMany({
        where: {
          userId,
          startTime: { gte: now },
          endTime: { lte: nextWeek },
        },
        orderBy: { startTime: 'asc' },
        select: {
          summary: true,
          startTime: true,
          endTime: true,
          isAllDay: true,
        },
      });

      // Prepare data for Gemini
      const currentDateTime = new Date().toISOString();
      
      const calendarSummary = calendarEvents.length > 0
        ? calendarEvents.map(e => 
            `- ${e.summary}: ${e.isAllDay ? 'Toute la journée' : `${e.startTime.toISOString()} → ${e.endTime.toISOString()}`}`
          ).join('\n')
        : 'Aucun événement prévu';

      const tasksSummary = tasks.map((t, idx) => 
        `${idx + 1}. [ID: ${t.id}] ${t.content}
   Type: ${t.type || 'Non spécifié'} | Contexte: ${t.context}
   Deadline: ${t.deadline ? t.deadline.toISOString() : 'Aucune'}
   Durée estimée: ${t.estimatedDuration || 'Non spécifiée'} min
   Priorité actuelle: ${t.priority}`
      ).join('\n\n');

      // Using Gemini 2.5 Flash
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash'
      });

      const prompt = `Tu es un assistant de gestion de tâches intelligent. Analyse ces tâches et assigne des priorités optimales (1-10, 10 = le plus urgent/important).

Date et heure actuelles: ${currentDateTime}

Événements du calendrier (7 prochains jours):
${calendarSummary}

Tâches à prioriser:
${tasksSummary}

Critères de priorisation:
1. **Deadlines**: Les tâches avec deadline proche = priorité élevée
2. **Type de tâche**:
   - QUICK: Tâches rapides, peuvent remplir les petits créneaux
   - DEEP_WORK: Nécessitent de longs blocs de concentration
   - COURSE: Apprentissage, révisions
   - ADMIN: Administratif, rendez-vous
3. **Contexte**: Équilibre entre WORK, PERSONAL, LEARNING
4. **Durée vs temps disponible**: Adapter aux créneaux libres du calendrier
5. **Urgence implicite**: Mots-clés comme "urgent", "important", "vite"

Retourne UNIQUEMENT un JSON valide (sans markdown, sans backticks) avec ce format:
[
  {"id": "task-id-1", "priority": 9, "reasoning": "Deadline dans 2h, type QUICK"},
  {"id": "task-id-2", "priority": 7, "reasoning": "DEEP_WORK, créneau libre demain matin"},
  ...
]

Assure-toi que:
- Chaque tâche a un ID correspondant
- Les priorités sont entre 1 et 10
- Les tâches urgentes ont priorité 8-10
- Les tâches normales ont priorité 4-7
- Les tâches non urgentes ont priorité 1-3`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();

      // Clean response
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const priorities: TaskPriority[] = JSON.parse(cleanedText);

      // Validate response
      if (!Array.isArray(priorities)) {
        throw new Error('Invalid response: expected array');
      }

      // Update task priorities
      let updated = 0;
      for (const { id, priority } of priorities) {
        // Validate priority is in range
        const validPriority = Math.max(1, Math.min(10, priority));
        
        const task = tasks.find(t => t.id === id);
        if (task) {
          await prisma.task.update({
            where: { id },
            data: { priority: validPriority },
          });
          updated++;
        }
      }

      // Record the successful API call
      await geminiRateLimiter.recordRequest();

      fastify.log.info({
        event: 'tasks_reordered',
        userId,
        tasksCount: tasks.length,
        updated,
      });

      return reply.send({
        success: true,
        updated,
        message: `${updated} tâche${updated > 1 ? 's' : ''} réorganisée${updated > 1 ? 's' : ''}`,
      });
    } catch (error) {
      // Record failed API call (still counts toward quota)
      await geminiRateLimiter.recordRequest();
      
      fastify.log.error(error);
      return reply.status(500).send({ 
        error: 'Failed to reorder tasks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
