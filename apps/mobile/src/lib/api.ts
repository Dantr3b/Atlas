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

  async createTask(content: string): Promise<{ task: Task }> {
    return fetchAPI('/tasks', {
      method: 'POST',
      body: JSON.stringify({ content, status: 'INBOX' }),
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
  }
};
