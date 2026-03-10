import { Sparkles, User } from 'lucide-react';
import './MessageBubble.css';

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function renderContent(text) {
  // Simple markdown-like rendering for bold and code
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
}

export default function MessageBubble({ message, isStreaming = false }) {
  const isUser = message.role === 'user';

  return (
    <div className={`message-bubble ${message.role}`}>
      <div className={`message-avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`}>
        {isUser ? <User size={18} /> : <Sparkles size={18} />}
      </div>
      <div className="message-content-wrapper">
        <div
          className="message-content"
          dangerouslySetInnerHTML={{
            __html: renderContent(message.content) + (isStreaming ? '<span class="streaming-cursor"></span>' : ''),
          }}
        />
        <div className="message-meta">
          <span className="message-time">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}
