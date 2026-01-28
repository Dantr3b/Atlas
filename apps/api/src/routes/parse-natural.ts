import { FastifyInstance } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth } from '../middleware/require-auth.js';
import { geminiRateLimiter } from '../lib/gemini-rate-limiter.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ParseNaturalRequest {
  text: string;
}

interface ParsedTask {
  content: string;
  deadline: string | null;
  priority: number | null;
  type: 'QUICK' | 'DEEP_WORK' | 'COURSE' | 'ADMIN' | null;
  context: 'PERSONAL' | 'WORK' | 'LEARNING' | null;
  estimatedDuration: number | null;
  confidence: number;
}

const schema = {
  body: {
    type: 'object',
    required: ['text'],
    properties: {
      text: { type: 'string', minLength: 1, maxLength: 500 },
    },
  },
};

export default async function parseNaturalRoutes(fastify: FastifyInstance) {
  // Require authentication
  fastify.addHook('onRequest', requireAuth);

  fastify.post('/', { schema }, async (request, reply) => {
    const { text } = request.body as ParseNaturalRequest;

    // Check rate limit before making API call
    const limitCheck = await geminiRateLimiter.checkLimit();
    if (!limitCheck.allowed) {
      fastify.log.warn({
        event: 'gemini_rate_limit_exceeded',
        userId: request.session.get('userId'),
        reason: limitCheck.reason,
      });
      
      return reply.status(429).send({
        error: 'Rate limit exceeded',
        message: limitCheck.reason,
        retryAfter: 60, // seconds
      });
    }

    try {
      // Using Gemini 2.5 Flash (2026 model)
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash'
      });

      const currentDateTime = new Date().toISOString();
      
      const prompt = `Tu es un assistant qui extrait les informations d'une tâche depuis une phrase en français.

Phrase: "${text}"
Date et heure actuelles: ${currentDateTime}

Analyse la phrase et retourne UNIQUEMENT un JSON valide (sans markdown, sans backticks) avec ces champs:
- content (string): La tâche principale sans les indicateurs temporels
- deadline (string ISO 8601 ou null): Si une échéance est mentionnée ("ce soir" = aujourd'hui 23:59, "demain" = demain même heure, "lundi" = prochain lundi 18:00, etc.)
- priority (number 1-10 ou null): Basé sur l'urgence (mots comme "urgent", "vite", "important" = 8-10, neutre = 5, "quand possible" = 2-3)
- type ("QUICK" | "DEEP_WORK" | "COURSE" | "ADMIN" ou null): 
  * QUICK: tâches rapides, bugs, fixes (< 30min)
  * DEEP_WORK: projets, développement, concentration
  * COURSE: cours, apprendre, réviser, étudier
  * ADMIN: administratif, paperasse, rendez-vous
- context ("PERSONAL" | "WORK" | "LEARNING" ou null):
  * PERSONAL: perso, personnel, maison
  * WORK: travail, boulot, projet professionnel
  * LEARNING: cours, université, formation
- estimatedDuration (number en minutes ou null): Si mentionné ("30min", "1h") ou déduit du type
- confidence (number 0-1): Ta confiance dans l'analyse

Exemples:
Input: "je dois finir le rapport avant demain"
Output: {"content":"Finir le rapport","deadline":"2026-01-29T23:59:00Z","priority":7,"type":"DEEP_WORK","context":"WORK","estimatedDuration":120,"confidence":0.9}

Input: "appeler le dentiste"
Output: {"content":"Appeler le dentiste","deadline":null,"priority":5,"type":"ADMIN","context":"PERSONAL","estimatedDuration":15,"confidence":0.95}

Input: "fix le bug critique avant ce soir"
Output: {"content":"Fix le bug critique","deadline":"2026-01-28T23:59:00Z","priority":9,"type":"QUICK","context":"WORK","estimatedDuration":30,"confidence":0.85}

Réponds UNIQUEMENT avec le JSON, rien d'autre.`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();

      // Clean response (remove markdown code blocks if present)
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const parsed: ParsedTask = JSON.parse(cleanedText);

      // Validate the response structure
      if (!parsed.content || typeof parsed.content !== 'string') {
        throw new Error('Invalid response: missing or invalid content');
      }

      // Ensure confidence is within bounds
      if (parsed.confidence < 0 || parsed.confidence > 1) {
        parsed.confidence = 0.5;
      }

      // Record the successful API call
      await geminiRateLimiter.recordRequest();

      return reply.send(parsed);
    } catch (error) {
      // Record failed API call (still counts toward quota)
      await geminiRateLimiter.recordRequest();
      
      fastify.log.error(error);
      return reply.status(500).send({ 
        error: 'Failed to parse natural language input',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
