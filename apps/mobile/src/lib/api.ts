import Constants from 'expo-constants';

// For development, we need to use the host's IP address rather than localhost
// to allow physical devices or emulators to reach the local server.
const getBaseUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  const address = debuggerHost?.split(':')[0];
  
  if (__DEV__ && address) {
    return `http://${address}:3000`;
  }
  return 'http://localhost:3000'; // Fallback
};

export const API_URL = getBaseUrl();

export interface Task {
  id: string;
  content: string;
  status: 'INBOX' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  type?: 'QUICK' | 'DEEP_WORK' | 'COURSE' | 'ADMIN';
  context: 'PERSONAL' | 'WORK' | 'LEARNING';
  priority: number;
  deadline?: string;
  estimatedDuration?: number;
  assignedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedTask {
  content: string;
  deadline: string | null;
  priority: number | null;
  type: 'QUICK' | 'DEEP_WORK' | 'COURSE' | 'ADMIN' | null;
  context: 'PERSONAL' | 'WORK' | 'LEARNING' | null;
  estimatedDuration: number | null;
  confidence: number;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  source: {
    name: string;
  };
  publishedAt: string;
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
    advice?: string;
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

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, error.error || error.message || 'Request failed');
  }

  return response.json();
}

export const api = {
  async getTasks(): Promise<{ tasks: Task[] }> {
    return fetchAPI('/tasks');
  },

  async getTodayTasks(): Promise<{ tasks: Task[] }> {
    // Current date in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    return fetchAPI(`/tasks?assignedDate=${today}`);
  },

  async getInboxTasks(): Promise<{ tasks: Task[] }> {
    return fetchAPI('/tasks?status=INBOX');
  },

  async getInProgressTasks(): Promise<{ tasks: Task[] }> {
    return fetchAPI('/tasks?status=IN_PROGRESS');
  },

  async getWeekTasks(): Promise<{ tasks: Task[] }> {
    // Get start and end of current week (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
    
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    const deadlineStart = monday.toISOString().split('T')[0];
    const deadlineEnd = sunday.toISOString().split('T')[0];
    
    return fetchAPI(`/tasks?deadlineStart=${deadlineStart}&deadlineEnd=${deadlineEnd}`);
  },

  async getDailyBrief(): Promise<GeneratedBrief> {
    const response = await fetchAPI<{
      id: string;
      date: string;
      content: GeneratedBrief;
      listened: boolean;
      generatedAt: string;
    }>('/brief/daily');
    return response.content;
  },

  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ task: Task }> {
    return fetchAPI('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<{ task: Task }> {
    return fetchAPI(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async getMe(): Promise<{ user: { id: string; email: string; name: string | null } }> {
    return fetchAPI('/auth/me');
  },

  async devLogin(email: string): Promise<{ success: boolean; user: any }> {
    return fetchAPI('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async parseNaturalLanguage(text: string): Promise<ParsedTask> {
    return fetchAPI('/tasks/parse-natural', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },
};
