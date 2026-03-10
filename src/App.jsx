import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MessageList from './components/chat/MessageList';
import ChatInput from './components/chat/ChatInput';
import AuthModal from './components/auth/AuthModal';
import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <ChatProvider>
        <div className="app-layout">
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <main className="app-main">
            <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} />
            <MessageList />
            <ChatInput />
          </main>
        </div>
        <AuthModal />
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;
