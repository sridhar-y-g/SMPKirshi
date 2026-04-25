/**
 * api.ts — Configured Axios instance that talks to the FastAPI backend.
 * Automatically attaches the JWT token from localStorage on every request.
 */
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

export const api = axios.create({ baseURL: API_BASE });

// Attach token automatically on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sk_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Typed helpers ──────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
  is_admin: boolean;
}

export interface MeResponse {
  id: number;
  email: string;
  is_admin: boolean;
  is_active: boolean;
}

export interface ProfileData {
  id: number;
  email: string;
  is_admin: boolean;
  full_name: string | null;
  phone: string | null;
  village: string | null;
  district: string | null;
  state: string | null;
  crop_type: string | null;
  land_holding_acres: number | null;
  farming_stage: string | null;
  preferred_language: string;
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const form = new URLSearchParams({ username: email, password });
  const res = await api.post<LoginResponse>('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
}

export async function apiRegister(email: string, password: string, full_name: string) {
  const res = await api.post('/auth/register', { email, password, full_name });
  return res.data;
}

export async function apiVerifyOtp(email: string, otp_code: string) {
  const res = await api.post('/auth/verify-otp', { email, otp_code });
  return res.data;
}

export async function apiMe(): Promise<MeResponse> {
  const res = await api.get<MeResponse>('/auth/me');
  return res.data;
}

export async function apiGetProfile(): Promise<ProfileData> {
  const res = await api.get<ProfileData>('/profile/');
  return res.data;
}

export async function apiUpdateProfile(data: Partial<ProfileData>) {
  const res = await api.put('/profile/', data);
  return res.data;
}

export async function apiAdminStats() {
  const res = await api.get('/admin/stats');
  return res.data;
}

export async function apiAdminUsers() {
  const res = await api.get('/admin/users');
  return res.data;
}

export async function apiAdminEditUser(id: number, data: Record<string, unknown>) {
  const res = await api.patch(`/admin/users/${id}/edit`, data);
  return res.data;
}

export async function apiAdminSetRole(id: number, is_admin: boolean) {
  const res = await api.patch(`/admin/users/${id}/role`, { is_admin });
  return res.data;
}

export async function apiAdminSetStatus(id: number, is_active: boolean) {
  const res = await api.patch(`/admin/users/${id}/status`, { is_active });
  return res.data;
}

export async function apiAdminDeleteUser(id: number) {
  const res = await api.delete(`/admin/users/${id}`);
  return res.data;
}
