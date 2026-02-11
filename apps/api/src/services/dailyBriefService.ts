import { prisma } from '../lib/prisma.js';
import { weatherService } from './weatherService.js';
import { getBrief as getNewsBrief, type NewsArticle } from './newsService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface LocationContext {
  context: 'WORK' | 'LEARNING' | 'FREE';
  location: 'Sophia' | 'FunKart'; // Default to Sophia for WORK/FREE, FunKart for LEARNING
  label: string;
}

export interface GeneratedBrief {
  intro: string;
  weather: {
    location: string;
    description: string;
    temperature: number;
    minTemp: number;
    maxTemp: number;
    icon: string;
  };
  news: {
    summary: string;
    sections: {
        newsFrance: NewsArticle | null;
        newsIntl: NewsArticle | null;
        bizFrance: NewsArticle | null;
        bizIntl: NewsArticle | null;
        sports: NewsArticle | null;
    };
  };
  tasks: {
    id: string;
    content: string;
    priority: number;
    deadline?: string;
  }[];
  fullText?: string;
}

class DailyBriefService {
  async generateBriefForUser(userId: string, date: Date = new Date()): Promise<GeneratedBrief> {
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Determine Context & Location
    const contextInfo = await this.determineContext(userId, today, tomorrow);
    
    // 2. Fetch Weather
    // WORK -> Sophia, LEARNING -> FunKart, FREE -> Sophia (default)
    const weatherDestination = contextInfo.location;
    const weatherData = await weatherService.getWeather(weatherDestination);

    // 3. Fetch News (reuse existing service which returns AI summary)
    const newsData = await getNewsBrief();

    // 4. Fetch Tasks (PLANNED for today, sorted by priority)
    // Robust approach: Fetch wide range (Yesterday to Tomorrow UTC) and filter by Local Date (Europe/Paris)
    const wideStart = new Date(today);
    wideStart.setDate(wideStart.getDate() - 1); // Yesterday
    const wideEnd = new Date(today);
    wideEnd.setDate(wideEnd.getDate() + 2); // Tomorrow + 1 (safe buffer)

    console.log(`Fetching tasks wide range: ${wideStart.toISOString()} - ${wideEnd.toISOString()}`);
    
    const potentialTasks = await prisma.task.findMany({
      where: {
        userId,
        assignedDate: {
          gte: wideStart,
          lte: wideEnd,
        },
        status: { not: 'COMPLETED' },
      },
      orderBy: [
        { priority: 'desc' },
        { deadline: 'asc' },
      ],
    });

    // Filter strictly for "Today" in France
    const targetDateStr = today.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }); // e.g. "11/02/2026"
    console.log(`Filtering for target local date: ${targetDateStr}`);

    const tasks = potentialTasks.filter(t => {
        if (!t.assignedDate) return false;
        const taskDateStr = t.assignedDate.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
        // console.log(`Task ${t.id} date: ${taskDateStr} (Raw: ${t.assignedDate.toISOString()})`);
        return taskDateStr === targetDateStr;
    });
    console.log(`Found ${tasks.length} tasks after filtering.`);
    console.log(`Found ${tasks.length} tasks for brief.`);

    // 5. Generate Intro
    // "Bonjour, aujourd'hui vous travaillez à [Lieu]."
    const locationName = weatherDestination === 'FunKart' ? 'Bar-sur-Loup (FunKart)' : 'Sophia Antipolis';
    const intro = `Bonjour ! Aujourd'hui, vous êtes à ${locationName}.`;

    // 6. Build Result
    const brief: GeneratedBrief = {
      intro,
      weather: {
        location: weatherData.location,
        description: weatherData.weather.description,
        temperature: weatherData.weather.temperature,
        minTemp: weatherData.forecast.temperatureMin,
        maxTemp: weatherData.forecast.temperatureMax,
        icon: weatherData.weather.icon,
      },
      news: {
        summary: newsData.aiSummary || "Pas de résumé disponible.",
        sections: {
            newsFrance: newsData.news.france,
            newsIntl: newsData.news.international,
            bizFrance: newsData.business.france,
            bizIntl: newsData.business.international,
            sports: newsData.sports
        }
      },
      tasks: tasks.map(t => ({
        id: t.id,
        content: t.content,
        priority: t.priority,
        deadline: t.deadline?.toISOString()
      }))
    };

    // 7. Save to DB
    // Check if brief exists for this date
    const existingBrief = await prisma.dailyBrief.findUnique({
      where: {
        userId_date: {
          userId,
          date: today
        }
      }
    });

    const briefContent = JSON.stringify(brief);

    if (existingBrief) {
      await prisma.dailyBrief.update({
        where: { id: existingBrief.id },
        data: {
            fullText: briefContent, // We store the JSON in fullText for now or use fields?
            // The model has separate fields: weatherSummary, etc.
            // But user asked for JSON output for TTS.
            // I'll store the JSON string in `fullText` as requested ("generer en json").
            // And populate columns if useful.
            weatherSummary: `${weatherData.weather.description}, ${weatherData.weather.temperature}°C (${weatherData.forecast.temperatureMin}°C / ${weatherData.forecast.temperatureMax}°C)`,
            newsSummary: brief.news.summary,
            tasksSummary: `${tasks.length} tâches prévues`,
            generatedAt: new Date()
        }
      });
    } else {
      await prisma.dailyBrief.create({
        data: {
          userId,
          date: today,
          fullText: briefContent,
          weatherSummary: `${weatherData.weather.description}, ${weatherData.weather.temperature}°C (${weatherData.forecast.temperatureMin}°C / ${weatherData.forecast.temperatureMax}°C)`,
          newsSummary: brief.news.summary,
          tasksSummary: `${tasks.length} tâches prévues`,
          generatedAt: new Date(),
          listened: false
        }
      });
    }

    return brief;
  }

  generateSpeechScript(brief: GeneratedBrief): string {
    const { intro, weather, news, tasks } = brief;
    
    let script = `${intro}\n\n`;
    
    // Weather
    script += `Côté météo à ${weather.location}, ${weather.description}. `;
    script += `La température actuelle est de ${Math.round(weather.temperature)} degrés. `;
    script += `Aujourd'hui, les températures oscilleront entre ${Math.round(weather.minTemp)} et ${Math.round(weather.maxTemp)} degrés. `;
    script += `\n\n`;
    
    // News
    script += `Voici l'essentiel de l'actualité : ${news.summary}\n\n`;
    
    // Tasks
    if (tasks.length === 0) {
        script += `Vous n'avez aucune tâche prévue pour aujourd'hui. Profitez de votre journée !`;
    } else {
        const taskCount = tasks.length;
        if (taskCount === 1) {
            script += `Concernant vos objectifs du jour, vous avez une tâche à réaliser : `;
        } else {
            script += `Concernant vos objectifs du jour, vous avez ${taskCount} tâches à réaliser : `;
        }
        
        tasks.forEach((task) => {
            script += `${task.content}. `;
            if (task.priority >= 4) {
                script += `C'est une priorité haute. `;
            }
        });
    }

    script += `\n\nC'est tout pour votre brief matinal. Je vous souhaite une excellente journée !`;
    
    return script;
  }

  private async determineContext(userId: string, start: Date, end: Date): Promise<LocationContext> {
     // Fetch user calendars to get labels
     const userCalendars = await prisma.userCalendar.findMany({
        where: { userId, enabled: true },
     });
     const calendarMap = new Map(userCalendars.map(c => [c.calendarId, c.label]));

     // Fetch events
     const events = await prisma.calendarEvent.findMany({
        where: {
          userId,
          startTime: { gte: start, lt: end },
        }
     });

     // Check for WORK or LEARNING events
     let context: 'WORK' | 'LEARNING' | 'FREE' = 'FREE';
     
     for (const event of events) {
        const calendarLabel = calendarMap.get(event.calendarId) || '';
        const labelOrId = (calendarLabel + ' ' + event.calendarId).toUpperCase();

        if (labelOrId.includes('HYP') || labelOrId.includes('ROLLAND-BERTRAND') || labelOrId.includes('COURS')) {
             context = 'LEARNING';
             break; // Priority to Learning (Assumption: Fixed schedule) or Work?
             // Usually if you have Work and Course same day?
             // Let's assume Learning takes precedence if present (e.g. going to school)
        }
        if (labelOrId.includes('ALTERNANCE') || labelOrId.includes('TRAVAIL') || labelOrId.includes('WORK')) {
             if (context === 'FREE') context = 'WORK';
        }
     }

     // Map to Location
     let location: 'Sophia' | 'FunKart' = 'Sophia'; // Default
     if (context === 'LEARNING') {
        location = 'Sophia'; // Learning (Cours) -> Sophia Antipolis
     } else if (context === 'WORK') {
        location = 'FunKart'; // Work (Travail) -> Fun-Kart (Bar-sur-Loup)
     }

     return { context, location, label: context };
  }
}

export const dailyBriefService = new DailyBriefService();
