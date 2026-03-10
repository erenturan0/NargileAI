import { useState, useMemo } from 'react';
import { Plus, MessageSquare, Trash2, Search, Sparkles, MessagesSquare, LogIn, LogOut, Star, ShieldAlert, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
  const {
    conversations,
    activeId,
    createNewConversation,
    switchConversation,
    deleteConversation,
  } = useChat();

  const navigate = useNavigate();
  const { user, isGuest, logout, setShowAuthModal, upgradePlan } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c =>
      c.title.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const handleNewChat = () => {
    createNewConversation();
    onClose?.();
  };

  const handleSelect = (id) => {
    switchConversation(id);
    onClose?.();
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    deleteConversation(id);
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'visible' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand & New Chat */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <Sparkles size={20} />
            </div>
            <span className="sidebar-brand-name">NargileAI</span>
          </div>
          <button className="new-chat-btn" onClick={handleNewChat} id="new-chat-button">
            <Plus size={16} />
            Yeni Sohbet
          </button>
        </div>

        {/* Search */}
        {(!isGuest || conversations.length > 0) && (
          <div className="sidebar-search">
            <input
              className="sidebar-search-input"
              type="text"
              placeholder="Sohbet ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="sidebar-search"
            />
          </div>
        )}

        {/* Conversations List */}
        {isGuest ? (
          <div className="sidebar-empty">
            <MessagesSquare className="sidebar-empty-icon" size={40} />
            <p className="sidebar-empty-text">Geçmişi kaydetmek için giriş yapın.</p>
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="sidebar-conversations">
            <div className="sidebar-section-title">Kaydedilen Sohbetler</div>
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${conv.id === activeId ? 'active' : ''}`}
                onClick={() => handleSelect(conv.id)}
              >
                <MessageSquare className="conversation-icon" size={16} />
                <span className="conversation-title">{conv.title}</span>
                <button
                  className="conversation-delete"
                  onClick={(e) => handleDelete(e, conv.id)}
                  title="Sohbeti sil"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="sidebar-empty">
            <MessagesSquare className="sidebar-empty-icon" size={40} />
            <p className="sidebar-empty-text">
              {searchQuery ? 'Sonuç bulunamadı' : 'Henüz sohbet yok'}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="sidebar-footer">
          {isGuest ? (
            <button className="sidebar-auth-btn" onClick={() => setShowAuthModal(true)}>
              <LogIn size={18} />
              <span>Giriş Yap / Kayıt Ol</span>
            </button>
          ) : (
            <div className="sidebar-footer-container">
              <div className="sidebar-footer-info">
                <div className="sidebar-footer-avatar">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="sidebar-footer-text">
                  <div className="sidebar-footer-name" title={user.username}>
                    {user.username}
                    <span className={`sidebar-plan-badge ${user.plan || 'basic'}`}>
                      {user.plan === 'pro' && <Star size={10} />}
                      {user.plan === 'pro' ? 'PRO' : user.plan === 'pending_pro' ? 'BEKLEYEN İSTEK' : 'BASIC'}
                    </span>
                  </div>
                  <button className="sidebar-logout-btn" onClick={logout}>
                    <LogOut size={12} /> Çıkış
                  </button>
                </div>
              </div>
              
              {(!user.plan || user.plan === 'basic') && (
                <button className="sidebar-upgrade-btn" onClick={upgradePlan}>
                  <Sparkles size={14} /> Pro'ya Yükselt
                </button>
              )}

              {user.plan === 'pending_pro' && (
                <button className="sidebar-upgrade-btn pending" disabled style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', cursor: 'not-allowed', borderColor: '#f59e0b' }}>
                  <Clock size={14} /> Onay Bekleniyor...
                </button>
              )}

              {(user.role === 'admin' || user.role === 'superuser') && (
                <button className="sidebar-admin-btn" onClick={() => { navigate('/admin'); onClose?.(); }}>
                  <ShieldAlert size={14} /> Yönetici Paneli
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
