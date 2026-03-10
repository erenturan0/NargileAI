const API_URL = 'http://localhost:3001/api/chat';

export function generateTitle(message) {
  const words = message.split(' ').slice(0, 5).join(' ');
  return words.length > 30 ? words.substring(0, 30) + '...' : words;
}

export async function streamAIResponse(message, sessionId, onChunk, onComplete, authInfo = null) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authInfo?.token) {
      headers['Authorization'] = `Bearer ${authInfo.token}`;
    }

    const body = { message, sessionId };
    if (authInfo) {
      body.conversationId = authInfo.conversationId;
      body.conversationTitle = authInfo.conversationTitle;
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.error) {
              throw new Error(data.error);
            }

            if (data.done) {
              onComplete(fullText);
              return fullText;
            }

            if (data.text) {
              fullText += data.text;
              onChunk(fullText);
            }
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') {
              console.warn('Parse error:', e);
            }
          }
        }
      }
    }

    if (fullText) {
      onComplete(fullText);
    }
    return fullText;

  } catch (error) {
    console.error('AI Service Error:', error);
    const errorMsg = '❌ Bir hata oluştu: ' + error.message;
    onChunk(errorMsg);
    onComplete(errorMsg);
    return errorMsg;
  }
}
