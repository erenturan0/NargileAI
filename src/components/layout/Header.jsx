import { Menu, ChevronDown, Zap, LogIn } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

export default function Header({ onMenuToggle }) {
  const { mode, setMode } = useChat();
  const { isGuest, setShowAuthModal } = useAuth();

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onMenuToggle} id="menu-toggle-button">
          <Menu size={22} />
        </button>
        <div className="model-selector" id="model-selector">
          <div className="model-dot" />
          <span className="model-name">NargileAI</span>
          <span className="model-badge">v1.0</span>
          <ChevronDown size={14} />
        </div>
      </div>
      <div className="header-center">
        <div className="mode-toggle">
          <button
            className={`mode-toggle-btn${mode === 'nargile' ? ' active' : ''}`}
            onClick={() => setMode('nargile')}
          >
            🌿 Nargile
          </button>
          <button
            className={`mode-toggle-btn${mode === 'general' ? ' active' : ''}`}
            onClick={() => setMode('general')}
          >
            🌐 Genel
          </button>
        </div>
      </div>
      <div className="header-right">
        {isGuest && (
          <button
            className="header-login-btn"
            onClick={() => setShowAuthModal(true)}
          >
            <LogIn size={15} />
            <span>Giriş Yap</span>
          </button>
        )}
        <div className="header-status header-status--desktop">
          <div className="status-dot" />
          <span>Çevrimiçi</span>
          <Zap size={12} />
        </div>
      </div>
    </header>
  );
}
