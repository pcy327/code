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

export function processText(text, action) {
  return client.post('/ai/process', { text, action });
}

export async function fetchNoteChatStream(noteContent, question, onToken, signal) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not logged in');

  const resp = await fetch('/api/ai/note-chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ noteContent, question }),
    signal,
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  let currentEvent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('event:')) {
        currentEvent = line.substring(6);
        continue;
      }
      if (!line.startsWith('data:')) continue;
      const data = line.substring(5);
      if (currentEvent === 'error') throw new Error(data);
      if (currentEvent === 'done') {
        onToken(accumulated);
        return accumulated;
      }
      if (i > 0 && lines[i - 1].startsWith('data:')) accumulated += '\n';
      accumulated += data;
      onToken(accumulated);
    }
  }
  return accumulated;
}
