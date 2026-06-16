import client from './client';

export function createShare(data) {
  return client.post('/shares', data);
}

export function listShares() {
  return client.get('/shares');
}

export function revokeShare(id) {
  return client.delete(`/shares/${id}`);
}
