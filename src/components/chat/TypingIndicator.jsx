import { Sparkles } from 'lucide-react';
import './TypingIndicator.css';

export default function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <div className="typing-avatar">
        <Sparkles size={18} />
      </div>
      <div className="typing-dots">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}
