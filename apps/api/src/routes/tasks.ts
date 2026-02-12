import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/require-auth.js';

// Validation schemas
const createTaskSchema = {
  body: {
    type: 'object',
    required: ['content'],
    properties: {
      content: { type: 'string', minLength: 1, maxLength: 500 },
      status: { type: 'string', enum: ['INBOX', 'PLANNED', 'IN_PROGRESS', 'COMPLETED'] },
      type: { type: 'string', enum: ['QUICK', 'DEEP_WORK', 'COURSE', 'ADMIN'] },
      context: { type: 'string', enum: ['PERSONAL', 'WORK', 'LEARNING'] },
      deadline: { type: 'string', format: 'date-time' },
      estimatedDuration: { type: 'integer', enum: [5, 10, 15, 30, 60], nullable: true }, // 5m, 10m, 15m, 30m, 1h, or null for custom
      priority: { type: 'integer', minimum: 1, maximum: 10 },
    },
  },
};

const updateTaskSchema = {
  body: {
    type: 'object',
    properties: {
      content: { type: 'string', minLength: 1, maxLength: 500 },
      status: { type: 'string', enum: ['INBOX', 'PLANNED', 'IN_PROGRESS', 'COMPLETED'] },
      type: { type: 'string', enum: ['QUICK', 'DEEP_WORK', 'COURSE', 'ADMIN'] },
      context: { type: 'string', enum: ['PERSONAL', 'WORK', 'LEARNING'] },
      deadline: { type: 'string', format: 'date-time' },
      estimatedDuration: { type: 'integer', enum: [5, 10, 15, 30, 60, 90, 120, 180, 300], nullable: true },
      priority: { type: 'integer', minimum: 1, maximum: 10 },
      assignedDate: { type: 'string', format: 'date-time', nullable: true },
    },
  },
};

export default async function taskRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', requireAuth);

  // POST /tasks - Create a new task
  fastify.post('/', { schema: createTaskSchema }, async (request, reply) => {
    const userId = request.session.get('userId')!;
    const { content, status, type, context, deadline, estimatedDuration, priority } = request.body as any;

    const task = await prisma.task.create({
      data: {
        content,
        status: status || 'INBOX',
        ...(type && { type }),
        ...(context && { context }),
        deadline: deadline ? new Date(deadline) : null,
        estimatedDuration: estimatedDuration || null,
        ...(priority !== undefined && { priority }),
        userId,
      },
    });

    return reply.status(201).send({ task });
  });

  // GET /tasks - List all tasks for authenticated user
  fastify.get('/', async (request, reply) => {
    const userId = request.session.get('userId')!;
    const { assignedDate } = request.query as { assignedDate?: string };

    const where: any = { userId };

    if (assignedDate) {
      // Filter by assigned date (exact match on date part)
      // Prisma stores dates as DateTime, so we need to filter by range or use db.Date type
      // Since our schema uses @db.Date for assignedDate, passing the YYYY-MM-DD string should work with some drivers,
      // but to be safe and consistent with how Prisma handles dates, we'll strip time components if needed.
      // However, assuming assignedDate in DB is just a date, exact match might work if the input is compatible.
      // Let's rely on the input being a valid ISO date string.
      
      // Note: The mobile app sends YYYY-MM-DD.
      // Prisma `DateTime @db.Date` fields usually work with ISO strings.
      
      where.assignedDate = new Date(assignedDate);
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ tasks });
  });

  // GET /tasks/:id - Get a single task by ID
  fastify.get('/:id', async (request, reply) => {
    const userId = request.session.get('userId')!;
    const { id } = request.params as { id: string };

    const task = await prisma.task.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.send({ task });
  });

  // PUT /tasks/:id - Update a task
  fastify.put('/:id', { schema: updateTaskSchema }, async (request, reply) => {
    const userId = request.session.get('userId')!;
    const { id } = request.params as { id: string };
    const { content, status, type, context, deadline, estimatedDuration, priority, assignedDate } = request.body as any;

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingTask) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    let newStatus = status !== undefined ? status : existingTask.status;
    const newAssignedDate = assignedDate !== undefined ? (assignedDate ? new Date(assignedDate) : null) : existingTask.assignedDate;

    // If task is assigned a date and is in INBOX, move to PLANNED
    if (newAssignedDate && newStatus === 'INBOX') {
      newStatus = 'PLANNED';
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        content: content !== undefined ? content : existingTask.content,
        status: newStatus,
        type: type !== undefined ? type : existingTask.type,
        context: context !== undefined ? context : existingTask.context,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : existingTask.deadline,
        estimatedDuration: estimatedDuration !== undefined ? estimatedDuration : existingTask.estimatedDuration,
        priority: priority !== undefined ? priority : existingTask.priority,
        assignedDate: newAssignedDate,
      },
    });

    return reply.send({ task });
  });

  // DELETE /tasks/:id - Delete a task
  fastify.delete('/:id', async (request, reply) => {
    const userId = request.session.get('userId')!;
    const { id } = request.params as { id: string };

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingTask) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    await prisma.task.delete({
      where: { id },
    });

    return reply.send({ success: true, message: 'Task deleted' });
  });
}
