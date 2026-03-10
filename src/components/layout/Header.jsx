import { Menu, ChevronDown, Zap } from 'lucide-react';
import './Header.css';

export default function Header({ onMenuToggle }) {
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
      <div className="header-right">
        <div className="header-status">
          <div className="status-dot" />
          <span>Çevrimiçi</span>
          <Zap size={12} />
        </div>
      </div>
    </header>
  );
}
