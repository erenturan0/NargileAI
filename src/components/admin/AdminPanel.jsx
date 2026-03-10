import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, MessageSquare, ArrowLeft, Star, ShieldAlert, BarChart3, Clock, Check, X, Stars } from 'lucide-react';
import './AdminPanel.css';

export default function AdminPanel() {
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [userList, setUserList] = useState([]);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'requests'
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    
    // Redirect if not admin
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchAdminData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        const [statsRes, usersRes] = await Promise.all([
          fetch('http://localhost:3001/api/admin/stats', { headers }),
          fetch('http://localhost:3001/api/admin/users', { headers })
        ]);

        if (!statsRes.ok || !usersRes.ok) throw new Error('Veriler alınamadı (Yetkisiz erişim olabilir)');

        const statsData = await statsRes.json();
        const usersData = await usersRes.json();

        setStats(statsData);
        setUserList(usersData.users);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminData();
  }, [user, token, loading, navigate]);

  const pendingUsers = userList.filter(u => u.plan === 'pending_pro');
  const activeUsers = userList.filter(u => u.plan !== 'pending_pro');

  const displayedUsers = activeTab === 'requests' ? pendingUsers : activeUsers;

  const handleStatusChange = async (targetUserId, action) => {
    try {
      const res = await fetch(`http://localhost:3001/api/admin/users/${targetUserId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('İşlem başarısız.');
      
      const { user: updatedUser } = await res.json();
      setUserList(prev => prev.map(u => u.id === updatedUser.id ? { ...u, plan: updatedUser.plan } : u));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      const res = await fetch(`http://localhost:3001/api/admin/users/${targetUserId}/role`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Yetki değiştirilemedi.');
      }
      
      const { user: updatedUser } = await res.json();
      setUserList(prev => prev.map(u => u.id === updatedUser.id ? { ...u, role: updatedUser.role } : u));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p>Yönetici paneli yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <ShieldAlert size={48} />
        <h2>Erişim Hatası</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')} className="admin-back-btn">
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  return (
    <div className="admin-panel-container">
      <header className="admin-header">
        <button onClick={() => navigate('/')} className="admin-back-btn-icon">
          <ArrowLeft size={20} /> Ana Sayfa
        </button>
        <h1 className="admin-title">Yönetici Paneli</h1>
        <div className="admin-user-profile">
          <span className="admin-badge">SUPERUSER</span>
          <span>{user?.username}</span>
        </div>
      </header>

      <main className="admin-content">
        <section className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon blue">
              <Users size={24} />
            </div>
            <div className="admin-stat-info">
              <h3>Toplam Kullanıcı</h3>
              <p>{stats?.userCount}</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon purple">
              <Star size={24} />
            </div>
            <div className="admin-stat-info">
              <h3>Pro Kullanıcılar</h3>
              <p>{stats?.proUserCount}</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon green">
              <MessageSquare size={24} />
            </div>
            <div className="admin-stat-info">
              <h3>Toplam Sohbet</h3>
              <p>{stats?.conversationCount}</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon orange">
              <BarChart3 size={24} />
            </div>
            <div className="admin-stat-info">
              <h3>Toplam Mesaj</h3>
              <p>{stats?.messageCount}</p>
            </div>
          </div>
        </section>

        <section className="admin-users-section">
          <div className="admin-section-header">
            <div className="admin-tabs">
              <button 
                className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                <Users size={18} /> Kayıtlı Kullanıcılar
              </button>
              <button 
                className={`admin-tab ${activeTab === 'requests' ? 'active' : ''}`}
                onClick={() => setActiveTab('requests')}
              >
                <Clock size={18} /> Bekleyen İstekler
                {pendingUsers.length > 0 && <span className="admin-tab-badge">{pendingUsers.length}</span>}
              </button>
            </div>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Kullanıcı Adı</th>
                  <th>E-posta</th>
                  <th>Plan</th>
                  <th>Rol</th>
                  <th>Kayıt Tarihi</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'requests' ? 7 : 6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                      {activeTab === 'requests' ? 'Bekleyen istek bulunmamaktadır.' : 'Kullanıcı bulunamadı.'}
                    </td>
                  </tr>
                ) : (
                  displayedUsers.map(u => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`admin-plan-badge ${u.plan}`}>
                        {u.plan === 'pro' && <Star size={12} />} 
                        {u.plan === 'pending_pro' && <Clock size={12} />}
                        {u.plan.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-role-badge ${u.role}`}>
                        {u.role === 'superuser' && <Stars size={12} />}
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="admin-date">
                      <Clock size={12} /> {new Date(u.created_at).toLocaleString('tr-TR')}
                    </td>
                    <td>
                      <div className="admin-actions">
                        {activeTab === 'requests' && u.plan === 'pending_pro' && (
                          <>
                            <button onClick={() => handleStatusChange(u.id, 'approve')} className="admin-action-btn approve" title="Onayla">
                              <Check size={16} />
                            </button>
                            <button onClick={() => handleStatusChange(u.id, 'reject')} className="admin-action-btn reject" title="Reddet">
                              <X size={16} />
                            </button>
                          </>
                        )}
                        {activeTab === 'users' && u.id !== user.id && u.role !== 'superuser' && (
                          u.role === 'admin' ? (
                            <button onClick={() => handleRoleChange(u.id, 'user')} className="admin-action-btn demote" title="Normal Kullanıcı Yap">
                              <ShieldAlert size={14} />
                            </button>
                          ) : (
                            <button onClick={() => handleRoleChange(u.id, 'admin')} className="admin-action-btn promote" title="Admin Yap">
                              <Star size={14} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
