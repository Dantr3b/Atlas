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

      fastify.log.info({
        msg: 'Fetching events for task assignment',
        today: today.toISOString(),
        tomorrow: tomorrow.toISOString(),
      });

      // Fetch today's calendar events
      const events = await prisma.calendarEvent.findMany({
        where: {
          userId,
          startTime: { gte: today, lt: tomorrow },
        },
        orderBy: { startTime: 'asc' },
      });

      fastify.log.info({
        msg: 'Found calendar events',
        count: events.length,
        events: events.map(e => ({ summary: e.summary, start: e.startTime, end: e.endTime })),
      });

      if (events.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Aucun événement trouvé pour aujourd\'hui. Essayez de synchroniser vos calendriers manuellement.',
          hint: 'Utilisez POST /calendars/sync pour forcer la synchronisation',
        });
      }

      // Analyze calendar and create time blocks
      const timeBlocks = analyzeCalendar(events, userCalendars, today, tomorrow);

      fastify.log.info({
        msg: 'Time blocks created',
        count: timeBlocks.length,
        blocks: timeBlocks.map(b => ({
          context: b.context,
          start: b.start.toISOString(),
          end: b.end.toISOString(),
          duration: (b.end.getTime() - b.start.getTime()) / (60 * 1000),
          eventSummary: b.eventSummary,
        })),
      });

      // Fetch unassigned tasks
      const tasks = await prisma.task.findMany({
        where: {
          userId,
          status: { not: 'COMPLETED' },
          OR: [
            { assignedDate: null }, // Unassigned tasks
            { assignedDate: { lt: today } }, // Tasks assigned in the past (overdue)
          ],
        },
        orderBy: [
          { priority: 'desc' },
          { deadline: 'asc' },
        ],
      });

      fastify.log.info({
        msg: 'Unassigned tasks found',
        count: tasks.length,
        tasks: tasks.map(t => ({
          content: t.content,
          context: t.context,
          priority: t.priority,
          estimatedDuration: t.estimatedDuration,
        })),
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

      fastify.log.info({
        msg: 'Task assignment completed',
        assignedCount: assignments.length,
        assignedTaskIds: assignments,
      });

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
      
      // Create a date at noon for assignment to avoid timezone issues with @db.Date
      // (00:00 local can become previous day in UTC)
      const assignmentDate = new Date(today);
      assignmentDate.setHours(12, 0, 0, 0);
      
      let assignedCount = 0;

      for (const taskId of assignments) {
        // Check current status of the task
        const task = tasks.find(t => t.id === taskId);
        const newStatus = task?.status === 'INBOX' ? 'PLANNED' : undefined;

        await prisma.task.update({
          where: { id: taskId },
          data: {
            assignedDate: assignmentDate,
            assignedAt: now,
            ...(newStatus && { status: newStatus }),
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
  userCalendars: any[],
  dayStart: Date,
  dayEnd: Date
): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  let currentTime = new Date(dayStart);
  currentTime.setHours(8, 0, 0, 0); // Start at 8am

  const endTime = new Date(dayEnd);
  endTime.setHours(23, 0, 0, 0); // End at 11pm

  // Create a map of calendar IDs to labels for easier lookup
  const calendarMap = new Map(userCalendars.map(c => [c.calendarId, c.label]));

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
    const context = classifyEvent(event, calendarMap);
    
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
function classifyEvent(event: any, calendarMap: Map<string, string>): 'LEARNING' | 'WORK' | 'FREE' {
  const calendarId = event.calendarId || '';
  const calendarLabel = calendarMap.get(calendarId) || '';
  
  // Check label first (more reliable), then ID
  const labelOrId = (calendarLabel + ' ' + calendarId).toUpperCase();
  
  // HYP calendar = courses
  if (labelOrId.includes('HYP') || labelOrId.includes('ROLLAND-BERTRAND') || labelOrId.includes('COURS')) {
    return 'LEARNING';
  }
  
  // ALTERNANCE calendar = work
  if (labelOrId.includes('ALTERNANCE') || labelOrId.includes('TRAVAIL') || labelOrId.includes('WORK')) {
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
