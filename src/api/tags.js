import client from './client';

export function listTags() {
  return client.get('/tags');
}

export function createTag(data) {
  return client.post('/tags', data);
}

export function updateTag(id, data) {
  return client.put(`/tags/${id}`, data);
}

export function deleteTag(id) {
  return client.delete(`/tags/${id}`);
}
