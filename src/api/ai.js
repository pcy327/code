import client from './client';

export function generateSummary(content) {
  return client.post('/ai/summary', { content });
}

export function suggestTags(content) {
  return client.post('/ai/tags', { content });
}

export function optimizeMarkdown(content) {
  return client.post('/ai/optimize', { content });
}
