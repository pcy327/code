import client from './client';

export function login(username, password) {
  return client.post('/auth/login', { username, password });
}

export function register(username, password, email) {
  return client.post('/auth/register', { username, password, email });
}

export function getMe() {
  return client.get('/auth/me');
}
