const API_BASE = 'http://localhost:4000/api';

export function getToken() {
  return localStorage.getItem('zequen_token');
}

export function getUser() {
  const u = localStorage.getItem('zequen_user');
  return u ? JSON.parse(u) : null;
}

export function setAuth(token, user) {
  localStorage.setItem('zequen_token', token);
  localStorage.setItem('zequen_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('zequen_token');
  localStorage.removeItem('zequen_user');
}

export async function api(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function login(username, password) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setAuth(data.token, data.user);
  return data;
}
