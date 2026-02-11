import Parser from 'rss-parser';
import { generateMorningBrief } from './briefService';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  source: {
    name: string;
  };
  publishedAt: string;
}

interface BriefResponse {
  news: {
    france: NewsArticle | null;
    international: NewsArticle | null;
  };
  business: {
    france: NewsArticle | null;
    international: NewsArticle | null;
  };
  sports: NewsArticle | null;
  aiSummary?: string;
  cachedAt: string;
}

// In-memory cache
let cachedBrief: BriefResponse | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const parser = new Parser();

const FEEDS = {
  news_fr: 'https://news.google.com/rss/headlines/section/topic/NATION?hl=fr&gl=FR&ceid=FR:fr',
  news_intl: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en',
  biz_fr: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=fr&gl=FR&ceid=FR:fr',
  biz_intl: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en',
  sport_auto: 'https://news.google.com/rss/search?q=Formule+1+OR+Auto+Racing+OR+WEC&hl=fr&gl=FR&ceid=FR:fr',
  sport_rugby: 'https://news.google.com/rss/search?q=Rugby+Top+14+OR+XV+de+France&hl=fr&gl=FR&ceid=FR:fr',
  sport_nfl: 'https://news.google.com/rss/search?q=NFL+Football+Americain&hl=fr&gl=FR&ceid=FR:fr',
  sport_gen: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=fr&gl=FR&ceid=FR:fr',
};

function parseGoogleNewsItem(item: any): NewsArticle {
  const imgMatch = item.content?.match(/src="([^"]+)"/);
  const urlToImage = imgMatch ? imgMatch[1] : '';

  const titleParts = item.title?.split(' - ') || [];
  const sourceName = titleParts.length > 1 ? titleParts.pop() : 'Google News';
  const title = titleParts.join(' - ') || item.title || '';

  return {
    title,
    description: item.contentSnippet || item.content || '',
    url: item.link || '',
    urlToImage,
    source: {
      name: sourceName || 'Google News',
    },
    publishedAt: item.pubDate || new Date().toISOString(),
  };
}

async function fetchFeed(url: string, logName: string): Promise<NewsArticle | null> {
  try {
    // console.log(`Fetching RSS feed for ${logName}...`);
    const feed = await parser.parseURL(url);
    if (feed.items && feed.items.length > 0) {
      return parseGoogleNewsItem(feed.items[0]);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching RSS feed for ${logName}:`, error);
    return null;
  }
}

export async function getBrief(): Promise<BriefResponse> {
  const now = Date.now();

  if (cachedBrief && (now - lastFetchTime < CACHE_DURATION)) {
    return cachedBrief;
  }

  console.log('Fetching custom news brief...');

  // Parallel fetch for speed
  const [
    newsFr, newsIntl, 
    bizFr, bizIntl,
    sportAuto, sportRugby, sportNfl, sportGen
  ] = await Promise.all([
    fetchFeed(FEEDS.news_fr, 'News FR'),
    fetchFeed(FEEDS.news_intl, 'News INTL'),
    fetchFeed(FEEDS.biz_fr, 'Business FR'),
    fetchFeed(FEEDS.biz_intl, 'Business INTL'),
    fetchFeed(FEEDS.sport_auto, 'Sport Auto'),
    fetchFeed(FEEDS.sport_rugby, 'Sport Rugby'),
    fetchFeed(FEEDS.sport_nfl, 'Sport NFL'),
    fetchFeed(FEEDS.sport_gen, 'Sport General'),
  ]);

  // Priority Logic for Sports
  // 1. Auto, 2. Rugby, 3. NFL, 4. General
  const sports = sportAuto || sportRugby || sportNfl || sportGen || null;

  // Construct content object for AI
  const content = {
    news: { france: newsFr, international: newsIntl },
    business: { france: bizFr, international: bizIntl },
    sports,
  };

  // Generate AI Summary
  let aiSummary = '';
  try {
    console.log('Generating AI summary...');
    aiSummary = await generateMorningBrief(content);
  } catch (err) {
    console.error('Failed to generate AI summary, skipping:', err);
  }

  cachedBrief = {
    ...content,
    aiSummary,
    cachedAt: new Date().toISOString(),
  };
  
  lastFetchTime = now;

  return cachedBrief;
}
