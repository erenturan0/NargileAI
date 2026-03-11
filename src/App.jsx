import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MessageList from './components/chat/MessageList';
import ChatInput from './components/chat/ChatInput';
import AuthModal from './components/auth/AuthModal';
import AdminPanel from './components/admin/AdminPanel';
import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      document.documentElement.style.setProperty('--vvh', `${vv.height}px`);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return (
    <AuthProvider>
      <ChatProvider>
        <Routes>
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/" element={
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
          } />
        </Routes>
        <AuthModal />
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;
