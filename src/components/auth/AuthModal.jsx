import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, X, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import './AuthModal.css';

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  if (!showAuthModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <div className="auth-overlay" onClick={() => setShowAuthModal(false)}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={() => setShowAuthModal(false)}>
          <X size={20} />
        </button>

        <div className="auth-header">
          <div className="auth-icon">
            {isLogin ? <LogIn size={24} /> : <UserPlus size={24} />}
          </div>
          <h2 className="auth-title">
            {isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}
          </h2>
          <p className="auth-subtitle">
            {isLogin
              ? 'Sohbet geçmişinize erişin'
              : 'Sohbetlerinizi kaydetmeye başlayın'}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="auth-field">
              <User className="auth-field-icon" size={18} />
              <input
                type="text"
                placeholder="Kullanıcı adı"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                minLength={2}
                id="auth-username"
              />
            </div>
          )}

          <div className="auth-field">
            <Mail className="auth-field-icon" size={18} />
            <input
              type="email"
              placeholder="E-posta adresi"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              id="auth-email"
            />
          </div>

          <div className="auth-field">
            <Lock className="auth-field-icon" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Şifre"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
              id="auth-password"
            />
            <button
              type="button"
              className="auth-toggle-pw"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button className="auth-submit" type="submit" disabled={loading} id="auth-submit">
            {loading ? (
              <span className="auth-spinner" />
            ) : isLogin ? (
              'Giriş Yap'
            ) : (
              'Kayıt Ol'
            )}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? 'Hesabınız yok mu? ' : 'Zaten hesabınız var mı? '}
          <button onClick={switchMode} className="auth-switch-btn">
            {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
          </button>
        </div>
      </div>
    </div>
  );
}
