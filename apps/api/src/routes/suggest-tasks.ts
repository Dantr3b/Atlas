import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/require-auth.js';

interface SuggestTasksRequest {
  availableMinutes: number;
}

interface TaskSuggestion {
  id: string;
  content: string;
  estimatedDuration: number | null;
  priority: number;
  type: string | null;
  context: string;
  deadline: Date | null;
  reasoning: string;
}

export default async function suggestTasksRoutes(fastify: FastifyInstance) {
  // Require authentication
  fastify.addHook('onRequest', requireAuth);

  // POST /tasks/suggest - Suggest tasks based on available time
  fastify.post<{ Body: SuggestTasksRequest }>('/', async (request, reply) => {
    const userId = request.session.get('userId')!;
    const { availableMinutes } = request.body;

    // Validate input
    if (!availableMinutes || availableMinutes < 5 || availableMinutes > 480) {
      return reply.status(400).send({
        error: 'Invalid time',
        message: 'Available time must be between 5 and 480 minutes',
      });
    }

    try {
      // Fetch incomplete tasks
      const tasks = await prisma.task.findMany({
        where: {
          userId,
          status: { not: 'COMPLETED' },
        },
        orderBy: [
          { priority: 'desc' },
          { deadline: 'asc' },
        ],
      });

      if (tasks.length === 0) {
        return reply.send({
          suggestions: [],
          totalDuration: 0,
          tasksCount: 0,
          message: 'Aucune tâche disponible',
        });
      }

      // Generate suggestions
      const suggestions = generateSuggestions(tasks, availableMinutes);

      const totalDuration = suggestions.reduce(
        (sum, task) => sum + (task.estimatedDuration || 30),
        0
      );

      fastify.log.info({
        event: 'tasks_suggested',
        userId,
        availableMinutes,
        suggestedCount: suggestions.length,
        totalDuration,
      });

      return reply.send({
        suggestions,
        totalDuration,
        tasksCount: suggestions.length,
        message: `${suggestions.length} tâche${suggestions.length > 1 ? 's' : ''} suggérée${suggestions.length > 1 ? 's' : ''}`,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to suggest tasks',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}

/**
 * Generate task suggestions using greedy algorithm
 */
function generateSuggestions(tasks: any[], availableMinutes: number): TaskSuggestion[] {
  const suggestions: TaskSuggestion[] = [];
  let remainingTime = availableMinutes;

  // Filter tasks that could potentially fit
  const fittingTasks = tasks.filter((task) => {
    const duration = task.estimatedDuration || 30;
    return duration <= availableMinutes;
  });

  // Greedy selection: pick highest priority tasks that fit
  for (const task of fittingTasks) {
    const duration = task.estimatedDuration || 30;

    if (duration <= remainingTime) {
      suggestions.push({
        id: task.id,
        content: task.content,
        estimatedDuration: task.estimatedDuration,
        priority: task.priority,
        type: task.type,
        context: task.context,
        deadline: task.deadline,
        reasoning: generateReasoning(task, remainingTime, availableMinutes),
      });

      remainingTime -= duration;
    }

    // Stop if we've filled most of the time or have enough suggestions
    if (remainingTime < 5 || suggestions.length >= 5) {
      break;
    }
  }

  return suggestions;
}

/**
 * Generate reasoning for why a task was suggested
 */
function generateReasoning(task: any, remainingTime: number, totalTime: number): string {
  const reasons: string[] = [];

  // Priority-based reasoning
  if (task.priority >= 8) {
    reasons.push('Haute priorité');
  } else if (task.priority >= 5) {
    reasons.push('Priorité moyenne');
  }

  // Deadline-based reasoning
  if (task.deadline) {
    const daysUntilDeadline = Math.ceil(
      (new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDeadline <= 1) {
      reasons.push('Deadline aujourd\'hui/demain');
    } else if (daysUntilDeadline <= 3) {
      reasons.push('Deadline proche');
    }
  }

  // Type-based reasoning
  if (task.type === 'QUICK') {
    reasons.push('Tâche rapide');
  } else if (task.type === 'DEEP_WORK' && totalTime >= 60) {
    reasons.push('Travail de fond');
  }

  // Duration-based reasoning
  const duration = task.estimatedDuration || 30;
  if (duration <= totalTime * 0.5) {
    reasons.push(`S'intègre bien (${duration}min)`);
  } else if (duration === remainingTime) {
    reasons.push('Remplit parfaitement le temps restant');
  }

  return reasons.length > 0 ? reasons.join(', ') : 'Tâche disponible';
}
