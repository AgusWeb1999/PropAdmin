import { api } from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'EMPLOYEE' | 'RESIDENT';
  avatar?: string;
  company: {
    id: string;
    name: string;
    plan: string;
    logo?: string;
  };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>('/auth/login', { email, password });
  localStorage.setItem('token', data.accessToken);
  if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}

export async function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  window.location.href = '/login';
}

export async function getMe(): Promise<User> {
  return api.get<User>('/auth/me');
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function hasRole(user: User | null, role: User['role']): boolean {
  if (!user) return false;
  const hierarchy = { SUPER_ADMIN: 4, COMPANY_ADMIN: 3, EMPLOYEE: 2, RESIDENT: 1 };
  return hierarchy[user.role] >= hierarchy[role];
}
