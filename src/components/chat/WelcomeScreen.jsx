import { Sparkles, Flame, FlaskConical, Wind, Wrench, Code, BookOpen, Lightbulb, MessageSquare } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import './WelcomeScreen.css';

const nargileSuggestions = [
  {
    icon: Flame,
    title: 'Kömür Tavsiyeleri',
    desc: 'Doğal ve hızlı tutuşan kömür karşılaştırması',
    prompt: 'Doğal hindistan cevizi kömürü mü yoksa hızlı tutuşan kömür mü kullanmalıyım?',
  },
  {
    icon: FlaskConical,
    title: 'Aroma Karışımları',
    desc: 'Popüler tütün karışım önerileri',
    prompt: 'Çift elma ve nane karışımı nasıl yapılır, oranlar ne olmalı?',
  },
  {
    icon: Wind,
    title: 'Nargile Kurulumu',
    desc: 'Doğru kurulum ve çekiş ipuçları',
    prompt: 'Nargile nasıl doğru kurulur, iyi çekiş için ne yapmalıyım?',
  },
  {
    icon: Wrench,
    title: 'Ekipman Seçimi',
    desc: 'Başlık, hortum ve cam gövde tavsiyeleri',
    prompt: 'Yeni başlayanlar için hangi nargile ekipmanlarını önerirsiniz?',
  },
];

const generalSuggestions = [
  {
    icon: Code,
    title: 'Kod Yaz',
    desc: 'Her dilde kod yazma ve hata ayıklama',
    prompt: 'Python ile basit bir web scraper nasıl yazılır?',
  },
  {
    icon: BookOpen,
    title: 'Öğren & Araştır',
    desc: 'Herhangi bir konuyu açıkla ve özetle',
    prompt: 'Kuantum bilgisayarlarını basitçe anlatır mısın?',
  },
  {
    icon: Lightbulb,
    title: 'Fikir Üret',
    desc: 'Yaratıcı fikirler ve beyin fırtınası',
    prompt: 'Küçük bir işletme için 5 benzersiz pazarlama fikri ver.',
  },
  {
    icon: MessageSquare,
    title: 'Yazı & Metin',
    desc: 'Yazı düzenleme, çeviri ve özetleme',
    prompt: 'Özgeçmişim için güçlü bir kapak mektubu yazar mısın?',
  },
];

export default function WelcomeScreen() {
  const { sendMessage, mode, setMode } = useChat();
  const suggestions = mode === 'general' ? generalSuggestions : nargileSuggestions;

  return (
    <div className="welcome-screen">
      <div className="welcome-logo">
        <Sparkles size={36} />
      </div>
      <h1 className="welcome-title">NargileAI&apos;ya Hoş Geldiniz</h1>
      <p className="welcome-subtitle">
        {mode === 'general'
          ? 'Genel amaçlı asistan. Her konuda yardımcı olmaya hazırım!'
          : 'Nargile dünyasının uzman asistanı. Tütün, ekipman, kurulum ve daha fazlası için sorun!'}
      </p>
      <div className="mode-selector">
        <button
          className={`mode-btn${mode === 'nargile' ? ' active' : ''}`}
          onClick={() => setMode('nargile')}
        >
          🌿 Nargile Modu
        </button>
        <button
          className={`mode-btn${mode === 'general' ? ' active' : ''}`}
          onClick={() => setMode('general')}
        >
          🌐 Genel Mod
        </button>
      </div>
      <div className="welcome-suggestions">
        {suggestions.map((s, i) => (
          <button
            key={i}
            className="suggestion-card"
            onClick={() => sendMessage(s.prompt)}
          >
            <s.icon className="suggestion-icon" size={22} />
            <span className="suggestion-title">{s.title}</span>
            <span className="suggestion-desc">{s.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
