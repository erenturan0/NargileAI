import { createContext, useContext, useReducer, useCallback, useRef, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { streamAIResponse, generateTitle } from '../services/aiService';

const ChatContext = createContext(null);
const API_URL = '/api';

function createMessage(role, content) {
  return {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}

function createConversation(title = 'Yeni Sohbet') {
  return {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    title,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const initialState = {
  isLoading: false,
  streamingContent: '',
  isStreaming: false,
};

function chatReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_STREAMING':
      return { ...state, isStreaming: action.payload };
    case 'SET_STREAMING_CONTENT':
      return { ...state, streamingContent: action.payload };
    case 'RESET_STREAMING':
      return { ...state, isStreaming: false, streamingContent: '', isLoading: false };
    default:
      return state;
  }
}

export function ChatProvider({ children }) {
  const { user, token, isGuest } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const abortRef = useRef(false);

  const activeConversation = conversations.find(c => c.id === activeId) || null;
  const messages = activeConversation?.messages || [];

  // Load conversations from server when user logs in
  useEffect(() => {
    if (user && token) {
      fetch(`${API_URL}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
          const convs = data.conversations.map(c => ({
            id: c.id,
            title: c.title,
            messages: c.messages || [],
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));
          setConversations(convs);
          if (convs.length > 0 && !activeId) {
            setActiveId(convs[0].id);
          }
        })
        .catch(() => {});
    } else {
      // Guest mode or logout: reset state
      setConversations([]);
      setActiveId(null);
    }
  }, [user, token]);

  const createNewConversation = useCallback(() => {
    const conv = createConversation();
    setConversations(prev => [conv, ...prev]);
    setActiveId(conv.id);
    return conv.id;
  }, []);

  const switchConversation = useCallback((id) => {
    setActiveId(id);
    dispatch({ type: 'RESET_STREAMING' });
  }, []);

  const deleteConversation = useCallback(async (id) => {
    // Delete from server if logged in
    if (user && token) {
      try {
        await fetch(`${API_URL}/conversations/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* ignore */ }
    }

    setConversations(prev => {
      const remaining = prev.filter(c => c.id !== id);
      if (activeId === id) {
        setActiveId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
  }, [activeId, user, token]);

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || state.isLoading) return;

    let convId = activeId;

    if (!convId) {
      const conv = createConversation();
      setConversations(prev => [conv, ...prev]);
      setActiveId(conv.id);
      convId = conv.id;
    }

    const userMessage = createMessage('user', content);
    const isFirstMessage = !conversations.find(c => c.id === convId)?.messages?.length;
    const convTitle = isFirstMessage ? generateTitle(content) : undefined;

    // Add user message locally
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== convId) return c;
        return {
          ...c,
          title: isFirstMessage ? generateTitle(content) : c.title,
          messages: [...c.messages, userMessage],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_STREAMING', payload: true });
    abortRef.current = false;

    try {
      await streamAIResponse(
        content,
        convId,
        (chunk) => {
          if (!abortRef.current) {
            dispatch({ type: 'SET_STREAMING_CONTENT', payload: chunk });
          }
        },
        (fullResponse) => {
          if (!abortRef.current) {
            const aiMessage = createMessage('assistant', fullResponse);
            setConversations(prev =>
              prev.map(c => {
                if (c.id !== convId) return c;
                return {
                  ...c,
                  messages: [...c.messages, aiMessage],
                  updatedAt: new Date().toISOString(),
                };
              })
            );
          }
          dispatch({ type: 'RESET_STREAMING' });
        },
        // Pass auth info for server-side persistence
        user ? {
          token,
          conversationId: convId,
          conversationTitle: convTitle,
        } : null
      );
    } catch (error) {
      console.error('AI response error:', error);
      dispatch({ type: 'RESET_STREAMING' });
    }
  }, [activeId, state.isLoading, conversations, user, token]);

  const value = {
    conversations,
    activeConversation,
    activeId,
    messages,
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    streamingContent: state.streamingContent,
    createNewConversation,
    switchConversation,
    deleteConversation,
    sendMessage,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
