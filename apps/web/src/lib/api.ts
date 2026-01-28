const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Task {
  id: string;
  content: string;
  status: 'INBOX' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  type?: 'QUICK' | 'DEEP_WORK' | 'COURSE' | 'ADMIN';
  context?: 'PERSONAL' | 'WORK' | 'LEARNING';
  deadline?: string;
  estimatedDuration?: number;
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
  constructor(public status: number, message: string) {
    super(message);
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

export type { Task, CreateTaskData };
export { ApiError };
