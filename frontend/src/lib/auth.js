import { backendBase } from './documents';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Authentication request failed');
  }

  return data;
};

const persistSession = ({ token, user }) => {
  localStorage.setItem(TOKEN_KEY, token);

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

export const loginUser = async ({ email, password }) => {
  const response = await fetch(`${backendBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await parseResponse(response);
  persistSession(data);
  return data;
};

export const registerUser = async ({ name, email, password }) => {
  const response = await fetch(`${backendBase}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await parseResponse(response);
  persistSession(data);
  return data;
};
