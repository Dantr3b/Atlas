import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/require-auth.js';

interface TimeBlock {
  start: Date;
  end: Date;
  context: 'LEARNING' | 'WORK' | 'FREE';
  eventSummary?: string;
}

export default async function assignTasksRoutes(fastify: FastifyInstance) {
  // Require authentication
  fastify.addHook('onRequest', requireAuth);

  // POST /tasks/assign-daily - Assign tasks for today based on calendar
  fastify.post('/', async (request, reply) => {
    const userId = request.session.get('userId')!;

    try {
      // Check if user has calendars configured
      const userCalendars = await prisma.userCalendar.findMany({
        where: { userId, enabled: true },
      });

      if (userCalendars.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Aucun calendrier configuré. Veuillez configurer vos calendriers dans les paramètres.',
        });
      }

      // Get today's date range (00:00 to 23:59)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fetch today's calendar events
      const events = await prisma.calendarEvent.findMany({
        where: {
          userId,
          startTime: { gte: today },
          endTime: { lte: tomorrow },
        },
        orderBy: { startTime: 'asc' },
      });

      if (events.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Aucun événement trouvé pour aujourd\'hui. Essayez de synchroniser vos calendriers manuellement.',
          hint: 'Utilisez POST /calendars/sync pour forcer la synchronisation',
        });
      }

      // Analyze calendar and create time blocks
      const timeBlocks = analyzeCalendar(events, today, tomorrow);

      // Fetch unassigned tasks
      const tasks = await prisma.task.findMany({
        where: {
          userId,
          status: { not: 'COMPLETED' },
          assignedDate: null, // Only unassigned tasks
        },
        orderBy: [
          { priority: 'desc' },
          { deadline: 'asc' },
        ],
      });

      if (tasks.length === 0) {
        return reply.send({
          success: true,
          assigned: 0,
          message: 'Aucune tâche à assigner',
        });
      }

      // Assign tasks to appropriate time blocks
      const assignments = assignTasksToBlocks(timeBlocks, tasks);

      if (assignments.length === 0) {
        return reply.send({
          success: true,
          assigned: 0,
          message: 'Aucune tâche compatible avec les créneaux disponibles',
          info: `${timeBlocks.length} créneaux analysés, ${tasks.length} tâches disponibles`,
        });
      }

      // Update tasks in database
      const now = new Date();
      let assignedCount = 0;

      for (const taskId of assignments) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            assignedDate: today,
            assignedAt: now,
          },
        });
        assignedCount++;
      }

      fastify.log.info({
        event: 'tasks_assigned',
        userId,
        date: today.toISOString().split('T')[0],
        assigned: assignedCount,
        blocks: timeBlocks.length,
      });

      return reply.send({
        success: true,
        assigned: assignedCount,
        message: `${assignedCount} tâche${assignedCount > 1 ? 's' : ''} assignée${assignedCount > 1 ? 's' : ''} pour aujourd'hui`,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ 
        error: 'Failed to assign tasks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * Analyze calendar events and create time blocks
 */
function analyzeCalendar(
  events: any[],
  dayStart: Date,
  dayEnd: Date
): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  let currentTime = new Date(dayStart);
  currentTime.setHours(8, 0, 0, 0); // Start at 8am

  const endTime = new Date(dayEnd);
  endTime.setHours(23, 0, 0, 0); // End at 11pm

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => 
    a.startTime.getTime() - b.startTime.getTime()
  );

  for (const event of sortedEvents) {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    // If there's a gap before this event, it's FREE time
    if (currentTime < eventStart && eventStart.getTime() - currentTime.getTime() > 15 * 60 * 1000) {
      blocks.push({
        start: new Date(currentTime),
        end: new Date(eventStart),
        context: 'FREE',
      });
    }

    // Classify the event
    const context = classifyEvent(event);
    
    blocks.push({
      start: eventStart,
      end: eventEnd,
      context,
      eventSummary: event.summary,
    });

    currentTime = new Date(eventEnd);
  }

  // Add remaining time as FREE if there's any left
  if (currentTime < endTime && endTime.getTime() - currentTime.getTime() > 15 * 60 * 1000) {
    blocks.push({
      start: new Date(currentTime),
      end: endTime,
      context: 'FREE',
    });
  }

  return blocks;
}

/**
 * Classify calendar event based on calendar ID
 */
function classifyEvent(event: any): 'LEARNING' | 'WORK' | 'FREE' {
  const calendarId = event.calendarId || '';
  
  // HYP calendar = courses
  if (calendarId.includes('HYP') || calendarId.includes('ROLLAND-BERTRAND')) {
    return 'LEARNING';
  }
  
  // ALTERNANCE calendar = work
  if (calendarId.includes('ALTERNANCE')) {
    return 'WORK';
  }
  
  // Default: free time
  return 'FREE';
}

/**
 * Assign tasks to time blocks based on context
 */
function assignTasksToBlocks(blocks: TimeBlock[], tasks: any[]): string[] {
  const assignments: string[] = [];
  const availableTasks = [...tasks];

  for (const block of blocks) {
    // Skip LEARNING blocks - no tasks during courses
    if (block.context === 'LEARNING') {
      continue;
    }

    // Calculate block duration in minutes
    const blockDuration = (block.end.getTime() - block.start.getTime()) / (60 * 1000);
    
    // Skip very short blocks (< 15 minutes)
    if (blockDuration < 15) {
      continue;
    }

    // Determine which tasks to assign based on block context
    let eligibleTasks: any[] = [];
    
    if (block.context === 'WORK') {
      // For WORK blocks: prioritize WORK tasks, but allow PERSONAL if no WORK tasks available
      const workTasks = availableTasks.filter(task => task.context === 'WORK');
      const personalTasks = availableTasks.filter(task => task.context === 'PERSONAL');
      eligibleTasks = [...workTasks, ...personalTasks];
    } else if (block.context === 'FREE') {
      // For FREE blocks: PERSONAL and LEARNING tasks
      eligibleTasks = availableTasks.filter(task => 
        task.context === 'PERSONAL' || task.context === 'LEARNING'
      );
    }

    // Fit tasks into the block
    let remainingTime = blockDuration;
    
    for (const task of eligibleTasks) {
      const duration = task.estimatedDuration || 30; // Default 30min
      
      if (duration <= remainingTime) {
        assignments.push(task.id);
        
        // Remove from available tasks
        const index = availableTasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
          availableTasks.splice(index, 1);
        }
        
        remainingTime -= duration;
      }
      
      // Stop if less than 15min left in block
      if (remainingTime < 15) {
        break;
      }
    }
  }

  return assignments;
}
