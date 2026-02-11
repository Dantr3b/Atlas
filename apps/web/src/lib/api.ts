const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Task {
  id: string;
  content: string;
  status: 'INBOX' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  type?: 'QUICK' | 'DEEP_WORK' | 'COURSE' | 'ADMIN';
  context?: 'PERSONAL' | 'WORK' | 'LEARNING';
  deadline?: string;
  assignedDate?: string;
  assignedAt?: string;
  priority?: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateTaskData {
  content: string;
  status?: Task['status'];
  type?: Task['type'];
  context?: Task['context'];
  deadline?: string;
  estimatedDuration?: number;
  priority?: number;
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
    credentials: 'include',
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
  // Tasks
  async getTasks(): Promise<{ tasks: Task[] }> {
    return fetchAPI('/tasks');
  },

  async getTask(id: string): Promise<{ task: Task }> {
    return fetchAPI(`/tasks/${id}`);
  },

  async createTask(data: CreateTaskData): Promise<{ task: Task }> {
    return fetchAPI('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTask(id: string, data: Partial<CreateTaskData>): Promise<{ task: Task }> {
    return fetchAPI(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteTask(id: string): Promise<{ success: boolean; message: string }> {
    return fetchAPI(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  async parseNaturalLanguage(text: string): Promise<{
    content: string;
    deadline: string | null;
    priority: number | null;
    type: 'QUICK' | 'DEEP_WORK' | 'COURSE' | 'ADMIN' | null;
    context: 'PERSONAL' | 'WORK' | 'LEARNING' | null;
    estimatedDuration: number | null;
    confidence: number;
  }> {
    return fetchAPI('/tasks/parse-natural', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async reorderTasks(): Promise<{ success: boolean; updated: number; message: string }> {
    return fetchAPI('/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
  
  async syncCalendars(): Promise<{ success: boolean; synced: number; message: string }> {
    return fetchAPI('/calendars/sync', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async assignDailyTasks(): Promise<{ success: boolean; assigned: number; message: string }> {
    return fetchAPI('/tasks/assign-daily', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },



// ... existing code ...

  async suggestTasks(availableMinutes: number): Promise<{
    suggestions: Array<any>;
    totalDuration: number;
    tasksCount: number;
    message: string;
  }> {
    return fetchAPI('/tasks/suggest', {
      method: 'POST',
      body: JSON.stringify({ availableMinutes }),
    });
  },

  // News
  async getBrief(): Promise<BriefResponse> {
    return fetchAPI('/news/brief');
  },

  // Brief
  async getGreeting(): Promise<GreetingResponse> {
    return fetchAPI('/brief/greeting');
  },

  // Weather
  async getWeather(destination: 'FunKart' | 'Sophia'): Promise<WeatherResponse> {
    return fetchAPI(`/weather/${destination}`);
  },

  // Auth
  async getMe(): Promise<{ user: { id: string; email: string; name: string | null } }> {
    return fetchAPI('/auth/me');
  },

  async logout(): Promise<{ success: boolean }> {
    return fetchAPI('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
};

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

export interface BriefResponse {
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

export interface GreetingResponse {
  destination: 'FunKart' | 'Sophia' | null;
  firstEvent: {
    summary: string;
    start: string;
    calendarLabel: string;
  } | null;
}

export interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  weatherCode: number;
  icon: string;
  description: string;
  precipitation: number;
}

export interface DailyForecast {
  temperatureMin: number;
  temperatureMax: number;
  hourly: HourlyForecast[];
}

export interface WeatherResponse {
  location: string;
  weather: WeatherData;
  forecast: DailyForecast;
}

export type { Task, CreateTaskData };
export { ApiError };
