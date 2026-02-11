import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiRateLimiter } from '../lib/gemini-rate-limiter';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

interface NewsArticle {
  title: string;
  description: string;
  source: { name: string };
}

interface BriefContent {
  news: { france: NewsArticle | null; international: NewsArticle | null };
  business: { france: NewsArticle | null; international: NewsArticle | null };
  sports: NewsArticle | null;
}

export async function generateMorningBrief(content: BriefContent): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set');
      return '';
    }

    // Check rate limits
    const limitCheck = await geminiRateLimiter.checkLimit();
    if (!limitCheck.allowed) {
      console.warn('Gemini rate limit exceeded:', limitCheck.reason);
      return ''; // Fail gracefully
    }

    const articles = [
      content.news.france ? `Actu France: ${content.news.france.title} (${content.news.france.source.name})` : '',
      content.news.international ? `Actu Monde: ${content.news.international.title} (${content.news.international.source.name})` : '',
      content.business.france ? `Éco France: ${content.business.france.title} (${content.business.france.source.name})` : '',
      content.business.international ? `Éco Monde: ${content.business.international.title} (${content.business.international.source.name})` : '',
      content.sports ? `Sport: ${content.sports.title} (${content.sports.source.name})` : '',
    ].filter(Boolean).join('\n');

    const prompt = `
      Tu es un assistant personnel intelligent. Rédige un "Brief du Matin" détaillé et informatif en français basé sur ces gros titres :
      
      ${articles}
      
      Consignes :
      - Rédige 2-3 paragraphes bien développés (200-250 mots au total).
      - Pour chaque sujet majeur, donne du contexte et des détails importants.
      - Adopte un ton professionnel mais accessible (style "journal du matin").
      - Explique les enjeux et les implications de chaque actualité.
      - Fais des liens entre les sujets quand c'est pertinent.
      - Termine par une phrase de conclusion ou une perspective pour la journée.
      - Structure : un paragraphe pour l'actualité générale, un pour l'économie, et un pour le sport.
    `;

    // Generate content
    const result = await model.generateContent(prompt);
    
    // Record the request usage
    await geminiRateLimiter.recordRequest();

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating AI brief:', error);
    return ''; // Fail gracefully
  }
}
