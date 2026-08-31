const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const auth = localStorage.getItem("leadflow-auth");
  if (!auth) return null;
  try {
    const parsed = JSON.parse(auth);
    return parsed.state?.token || null;
  } catch {
    return null;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP error ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, data: any) => request<T>(endpoint, { method: "POST", body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data: any) => request<T>(endpoint, { method: "PATCH", body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: any) => request<T>(endpoint, { method: "PUT", body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};

// Clients
export const clientsApi = {
  list: (params?: { page?: number; page_size?: number; search?: string }) => 
    api.get<{ items: any[]; total: number; page: number; page_size: number; total_pages: number }>("/clients", { params }),
  get: (id: number) => api.get<any>(`/clients/${id}`),
  create: (data: any) => api.post<any>("/clients", data),
  update: (id: number, data: any) => api.patch<any>(`/clients/${id}`, data),
  delete: (id: number) => api.delete(`/clients/${id}`),
};

// Leads
export const leadsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string; source?: string; search?: string }) =>
    api.get<{ items: any[]; total: number; page: number; page_size: number; total_pages: number }>("/leads", { params }),
  get: (id: number) => api.get<any>(`/leads/${id}`),
  create: (data: any) => api.post<any>("/leads", data),
  update: (id: number, data: any) => api.patch<any>(`/leads/${id}`, data),
  delete: (id: number) => api.delete(`/leads/${id}`),
};

// Drafts
export const draftsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string; lead_id?: number }) =>
    api.get<{ items: any[]; total: number; page: number; page_size: number; total_pages: number }>("/drafts", { params }),
  get: (id: number) => api.get<any>(`/drafts/${id}`),
  create: (data: any) => api.post<any>("/drafts", data),
  update: (id: number, data: any) => api.patch<any>(`/drafts/${id}`, data),
  delete: (id: number) => api.delete(`/drafts/${id}`),
  generate: (data: any) => api.post<any>("/ai/generate-draft", data),
};

// Transactions
export const transactionsApi = {
  list: (params?: { page?: number; page_size?: number; type?: string; category?: string }) =>
    api.get<{ items: any[]; total: number; page: number; page_size: number; total_pages: number }>("/transactions", { params }),
  summary: (params?: { start_date?: string; end_date?: string }) =>
    api.get<any>("/transactions/stats/summary", { params }),
  create: (data: any) => api.post<any>("/transactions", data),
  update: (id: number, data: any) => api.patch<any>(`/transactions/${id}`, data),
  delete: (id: number) => api.delete(`/transactions/${id}`),
};

// Recurring Payments
export const recurringApi = {
  list: (params?: { page?: number; page_size?: number; is_active?: boolean }) =>
    api.get<{ items: any[]; total: number; page: number; page_size: number; total_pages: number }>("/recurring", { params }),
  upcoming: (days?: number) => api.get<any[]>("/recurring/upcoming", { params: { days } }),
  create: (data: any) => api.post<any>("/recurring", data),
  update: (id: number, data: any) => api.patch<any>(`/recurring/${id}`, data),
  delete: (id: number) => api.delete(`/recurring/${id}`),
};

// Piggy Bank
export const piggyApi = {
  goals: () => api.get<any[]>("/piggy-bank/goals"),
  getGoal: (id: number) => api.get<any>(`/piggy-bank/goals/${id}`),
  createGoal: (data: any) => api.post<any>("/piggy-bank/goals", data),
  updateGoal: (id: number, data: any) => api.patch<any>(`/piggy-bank/goals/${id}`, data),
  deleteGoal: (id: number) => api.delete(`/piggy-bank/goals/${id}`),
  transactions: (goalId: number) => api.get<any[]>(`/piggy-bank/goals/${goalId}/transactions`),
  addTransaction: (goalId: number, data: any) => api.post<any>(`/piggy-bank/goals/${goalId}/transactions`, data),
  deleteTransaction: (goalId: number, transactionId: number) => api.delete(`/piggy-bank/goals/${goalId}/transactions/${transactionId}`),
};

// Notifications
export const notificationsApi = {
  list: (params?: { page?: number; page_size?: number; is_read?: boolean }) =>
    api.get<{ items: any[]; total: number; page: number; page_size: number; total_pages: number }>("/notifications", { params }),
  unreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),
  markRead: (id: number) => api.patch<any>(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
};

// Discord
export const discordApi = {
  messages: (params?: { page?: number; page_size?: number; client_id?: number }) =>
    api.get<{ items: any[]; total: number; page: number; page_size: number; total_pages: number }>("/discord/messages", { params }),
  sendDM: (userId: string, content: string) => api.post("/discord/messages/send-dm", { discord_user_id: userId, content }),
  broadcast: (userIds: string[], content: string) => api.post("/discord/messages/broadcast", { user_ids: userIds, content }),
  oauthUrl: () => api.get<{ url: string }>("/discord/oauth/url"),
};

// Scrapers
export const scrapersApi = {
  list: () => api.get<any[]>("/scrapers"),
  logs: (params?: { page?: number; page_size?: number; scraper_name?: string }) =>
    api.get<{ items: any[]; total: number; page: number; page_size: number; total_pages: number }>("/scrapers/logs", { params }),
  run: (name: string) => api.post(`/scrapers/run/${name}`, {}),
  status: (name: string) => api.get<any>(`/scrapers/status/${name}`),
  searchReddit: (query: string, subreddit?: string, limit?: number) =>
    api.post("/scrapers/reddit/search", { query, subreddit, limit }),
  searchMinecraft: (params: any) => api.post("/scrapers/minecraft/servers", params),
};

// Dashboard
export const dashboardApi = {
  stats: () => api.get<any>("/dashboard/stats"),
};

// Auth
export const authApi = {
  login: (username: string, password: string) => api.post<{ access_token: string; token_type: string }>("/auth/login", { username, password }),
  register: (data: any) => api.post("/auth/register", data),
  initPassword: (password: string) => api.get(`/admin/init-password?password=${encodeURIComponent(password)}`),
};

// Helper to add params to URL
function requestWithParams<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(`${API_URL}/api${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return request<T>(url.pathname + url.search);
}

// Override get to support params
const originalGet = api.get;
api.get = <T>(endpoint: string, options?: { params?: Record<string, any> }) => {
  if (options?.params) {
    return requestWithParams<T>(endpoint, options.params);
  }
  return originalGet<T>(endpoint);
};