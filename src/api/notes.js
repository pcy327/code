import client from './client';

export function listNotes(params = {}) {
  return client.get('/notes', { params });
}

export function getNote(id) {
  return client.get(`/notes/${id}`);
}

export function createNote(data) {
  return client.post('/notes', data);
}

export function updateNote(id, data) {
  return client.put(`/notes/${id}`, data);
}

export function deleteNote(id) {
  return client.delete(`/notes/${id}`);
}

export function listTrashNotes() {
  return client.get('/notes/trash');
}

export function restoreNote(id) {
  return client.put(`/notes/${id}/restore`);
}

export function permanentlyDeleteNote(id) {
  return client.delete(`/notes/${id}/hard`);
}
