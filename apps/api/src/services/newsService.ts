import axios from 'axios';

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
  politics: NewsArticle | null;
  business: NewsArticle | null;
  sports: NewsArticle | null;
  cachedAt: string;
}

// In-memory cache
let cachedBrief: BriefResponse | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_URL = 'https://newsapi.org/v2/top-headlines';

async function fetchCategory(category: string): Promise<NewsArticle | null> {
  try {
    if (!NEWS_API_KEY) {
      console.warn('NEWS_API_KEY is not set');
      return null;
    }

    const response = await axios.get(NEWS_API_URL, {
      params: {
        country: 'fr',
        category,
        pageSize: 1,
        apiKey: NEWS_API_KEY,
      },
    });

    if (response.data.articles && response.data.articles.length > 0) {
      return response.data.articles[0];
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching news for category ${category}:`, error);
    return null;
  }
}

export async function getBrief(): Promise<BriefResponse> {
  const now = Date.now();

  // Return cached data if valid
  if (cachedBrief && (now - lastFetchTime < CACHE_DURATION)) {
    return cachedBrief;
  }

  // Fetch fresh data
  const [politics, business, sports] = await Promise.all([
    fetchCategory('politics') || fetchCategory('general'), // Fallback to general if politics fails/empty
    fetchCategory('business'),
    fetchCategory('sports'),
  ]);

  // Update cache
  cachedBrief = {
    politics: politics || null,
    business: business || null,
    sports: sports || null,
    cachedAt: new Date().toISOString(),
  };
  
  lastFetchTime = now;

  return cachedBrief;
}
