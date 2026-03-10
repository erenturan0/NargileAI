import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, MessageSquare, ArrowLeft, Star, ShieldAlert, BarChart3, Clock } from 'lucide-react';
import './AdminPanel.css';

export default function AdminPanel() {
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [userList, setUserList] = useState([]);
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
            <h2><Users size={20} /> Kayıtlı Kullanıcılar</h2>
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
                </tr>
              </thead>
              <tbody>
                {userList.map(u => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`admin-plan-badge ${u.plan}`}>
                        {u.plan === 'pro' && <Star size={12} />} {u.plan.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-role-badge ${u.role}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="admin-date">
                      <Clock size={12} /> {new Date(u.created_at).toLocaleString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
