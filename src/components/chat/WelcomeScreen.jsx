import { Sparkles, Flame, FlaskConical, Wind, Star, Wrench } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import './WelcomeScreen.css';

const suggestions = [
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

export default function WelcomeScreen() {
  const { sendMessage } = useChat();

  return (
    <div className="welcome-screen">
      <div className="welcome-logo">
        <Sparkles size={36} />
      </div>
      <h1 className="welcome-title">NargileAI&apos;ya Hoş Geldiniz</h1>
      <p className="welcome-subtitle">
        Nargile dünyasının uzman asistanı. Tütün, ekipman, kurulum ve daha fazlası için sorun!
      </p>
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
