import { Sparkles, Code, Lightbulb, BookOpen, Rocket } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import './WelcomeScreen.css';

const suggestions = [
  {
    icon: Code,
    title: 'Kod Yardımı',
    desc: 'Programlama sorularınızda yardım alın',
    prompt: 'React ile bir todo uygulaması nasıl yapılır?',
  },
  {
    icon: Lightbulb,
    title: 'Fikir Üretimi',
    desc: 'Yaratıcı fikirler ve çözümler keşfedin',
    prompt: 'Yapay zeka ile hangi projeler geliştirilebilir?',
  },
  {
    icon: BookOpen,
    title: 'Öğrenme',
    desc: 'Yeni konular hakkında bilgi edinin',
    prompt: 'Makine öğrenmesi nedir ve nasıl çalışır?',
  },
  {
    icon: Rocket,
    title: 'Proje Planlama',
    desc: 'Projelerinizi planlamanıza yardımcı olalım',
    prompt: 'Bir e-ticaret sitesi için teknik mimari öner',
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
        Size yardımcı olmak için buradayım. Kodlama, öğrenme, fikir üretimi ve daha fazlası
        için hemen bir sohbet başlatın.
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
