import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import './ChatInput.css';

export default function ChatInput() {
  const { sendMessage, isLoading } = useChat();
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasInput = input.trim().length > 0;

  return (
    <div className="chat-input-container">
      <div className="chat-input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder="Mesajınızı yazın..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading}
          id="chat-input"
        />
        <button
          className={`chat-send-btn ${hasInput ? 'active' : ''}`}
          onClick={handleSubmit}
          disabled={!hasInput || isLoading}
          id="chat-send-button"
        >
          <Send size={20} />
        </button>
      </div>
      <div className="chat-input-footer">
        <span className="chat-input-hint">
          <kbd>Enter</kbd> gönder · <kbd>Shift+Enter</kbd> yeni satır
        </span>
      </div>
    </div>
  );
}
