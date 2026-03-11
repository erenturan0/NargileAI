import { useChat } from '../../context/ChatContext';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import WelcomeScreen from './WelcomeScreen';
import './MessageList.css';

export default function MessageList() {
  const { messages, isLoading, isStreaming, streamingContent } = useChat();
  const scrollRef = useAutoScroll(messages.length + streamingContent);

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className={`message-list${isEmpty ? ' message-list--welcome' : ''}`} ref={isEmpty ? undefined : scrollRef}>
      {isEmpty ? (
        <WelcomeScreen />
      ) : (
        <div className="message-list-inner">
          <div className="message-list-spacer" />
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isStreaming && streamingContent && (
            <MessageBubble
              message={{
                id: 'streaming',
                role: 'assistant',
                content: streamingContent,
                timestamp: new Date().toISOString(),
              }}
              isStreaming
            />
          )}
          {isLoading && !streamingContent && <TypingIndicator />}
        </div>
      )}
    </div>
  );
}
