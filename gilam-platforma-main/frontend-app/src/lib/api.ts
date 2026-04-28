const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

import { 
  User, 
  Company, 
  Customer, 
  Service, 
  Order, 
  Notification, 
  Call,
  Campaign,
} from '@/types';

// ===== TOKEN BOSHQARUVI =====
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function removeToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user: User) {
  localStorage.setItem('user', JSON.stringify(user));
}

// ===== ASOSIY FETCH WRAPPER =====
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    removeToken();
    if (typeof window !== 'undefined') {
      const isCompanyPage = window.location.pathname.startsWith('/company');
      
      if (isCompanyPage) {
        setTimeout(() => window.location.href = '/company/login', 0);
      } else {
        setTimeout(() => window.location.href = '/', 0);
      }
    }
    throw new Error('Sessiya muddati tugadi');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Xatolik yuz berdi' }));
    const errorMessage = Array.isArray(errorData.message) 
      ? errorData.message.join(', ') 
      : (errorData.message || `HTTP ${res.status}`);
    
    const error = new Error(errorMessage) as Error & { status?: number; response?: { data: any } };
    error.status = res.status;
    error.response = { data: errorData };
    throw error;
  }

  const contentType = res.headers.get('content-type');
  if (res.status === 204 || !contentType || !contentType.includes('application/json')) {
    return null as T;
  }

  return res.json();
}

// ===== AUTH API =====
export const authApi = {
  login: (phone: string, password: string) =>
    request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),

  register: (data: { phone: string; password: string; fullName: string; role: string; companyId?: string }) =>
    request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ===== COMPANIES API =====
export const companiesApi = {
  getAll: () => request<Company[]>('/companies'),
  getOne: (id: string) => request<Company>(`/companies/${id}`),
  getStats: () => request<Record<string, number>>('/companies/stats'),
  create: (data: Partial<Company>) => request<Company>('/companies', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Company>) => request<Company>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/companies/${id}`, { method: 'DELETE' }),
};

// ===== USERS API =====
export const usersApi = {
  getAll: () => request<User[]>('/users'),
  getByCompany: (companyId: string) => request<User[]>(`/users/company/${companyId}`),
  getOperators: () => request<User[]>('/users/operators'),
  getOne: (id: string) => request<User>(`/users/${id}`),
  create: (data: Partial<User> & { password?: string }) => request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<User> & { password?: string }) => request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),
  getMileage: (id: string, from: string, to: string) => request<{ totalKm: number; pointCount: number }>(`/users/${id}/mileage?from=${from}&to=${to}`),
  getMileageDaily: (id: string, from: string, to: string) => request<{ date: string; km: number; points: number }[]>(`/users/${id}/mileage/daily?from=${from}&to=${to}`),
};

// ===== CUSTOMERS API =====
export const customersApi = {
  getByCompany: (companyId: string) => request<Customer[]>(`/customers/company/${companyId}`),
  search: (companyId: string, query: string) => request<Customer[]>(`/customers/search/${companyId}?q=${encodeURIComponent(query)}`),
  getOne: (id: string) => request<Customer>(`/customers/${id}`),
  create: (data: Partial<Customer>) => request<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Customer>) => request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/customers/${id}`, { method: 'DELETE' }),
};

// ===== SERVICES API =====
export const servicesApi = {
  getByCompany: (companyId: string) => request<Service[]>(`/services/company/${companyId}`),
  getOne: (id: string) => request<Service>(`/services/${id}`),
  create: (data: Partial<Service>) => request<Service>('/services', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Service>) => request<Service>(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/services/${id}`, { method: 'DELETE' }),
};

// ===== EXPENSES API =====
export const expensesApi = {
  getByCompany: (companyId: string, startDate?: string, endDate?: string) => {
    let url = `/expenses/company/${companyId}`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    return request<any[]>(url);
  },
  create: (data: any) => request<any>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/expenses/${id}`, { method: 'DELETE' }),
};

// ===== ORDERS API =====
export const ordersApi = {
  getAll: () => request<Order[]>('/orders'),
  getByCompany: (companyId: string) => request<Order[]>(`/orders/company/${companyId}`),
  getCompanyStats: (companyId: string) => request<Record<string, number>>(`/orders/company/${companyId}/stats`),
  getDriverOrders: (driverId: string) => request<Order[]>(`/orders/driver/${driverId}`),
  getOne: (id: string) => request<Order>(`/orders/${id}`),
  create: (data: any) => request<Order>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, data: { status: string; driverId?: string }) => request<Order>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  /** Operator: tayinlangan haydovchiga mijoz lokatsiyasini push orqali yuborish */
  sendLocationToDriver: (id: string) => request<{ success: boolean }>(`/orders/${id}/send-location`, { method: 'POST' }),
};


// ===== NOTIFICATIONS API =====
export const notificationsApi = {
  getSuperadmin: () => request<Notification[]>('/notifications/superadmin'),
  getByCompany: (companyId: string) => request<Notification[]>(`/notifications/company/${companyId}`),
  getByUser: (userId: string) => request<Notification[]>(`/notifications/user/${userId}`),
  markAsRead: (id: string) => request<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllAsReadCompany: (companyId: string) => request<void>(`/notifications/company/${companyId}/read-all`, { method: 'PATCH' }),
  markAllAsReadSuperAdmin: () => request<void>('/notifications/superadmin/read-all', { method: 'PATCH' }),
};


// ===== CALLS API =====
export const callsApi = {
  getAll: () => request<Call[]>('/calls'),
  getStats: () => request<Record<string, number>>('/calls/stats'),
  getOne: (id: string) => request<Call>(`/calls/${id}`),
  createOutgoing: (data: Partial<Call>) => request<Call>('/calls/outgoing', { method: 'POST', body: JSON.stringify(data) }),
  answer: (callId: string) => request<Call>(`/calls/${callId}/answer`, { method: 'PUT' }),
  complete: (callId: string, data: {
    notes?: string;
    customerId?: string;
    driverId?: string;
    newCustomer?: { fullName: string; phone?: string; phone2?: string; address?: string };
  }) => request<Call>(`/calls/${callId}/complete`, { method: 'PUT', body: JSON.stringify(data) }),
  miss: (callId: string) => request<Call>(`/calls/${callId}/miss`, { method: 'PUT' }),
};

// ===== CAMPAIGNS API =====
export const campaignsApi = {
  getAll: () => request<Campaign[]>('/campaigns'),
  getOne: (id: string) => request<Campaign>(`/campaigns/${id}`),
  create: (data: Partial<Campaign>) => request<Campaign>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Campaign>) => request<Campaign>(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/campaigns/${id}`, { method: 'DELETE' }),
};


export function toSlug(name: string): string {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getLoginPath(): string {
  if (typeof window === 'undefined') return '/';
  return localStorage.getItem('loginPath') || '/';
}

export function setLoginPath(path: string) {
  localStorage.setItem('loginPath', path);
}
