import { Sparkles, Flame, FlaskConical, Wind, Wrench, Code, BookOpen, Lightbulb, MessageSquare } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import './WelcomeScreen.css';

const nargileSuggestions = [
  {
    icon: Flame,
    title: 'Kömür Tavsiyeleri',
    desc: 'Doğal ve hızlı tutuşan kömür karşılaştırması',
    prompts: [
      'Doğal hindistan cevizi kömürü mü yoksa hızlı tutuşan kömür mü kullanmalıyım?',
      'Nargile için en iyi kömür markası hangisi?',
      'Kömür ne zaman değiştirilmeli, nasıl anlarım?',
    ],
  },
  {
    icon: FlaskConical,
    title: 'Aroma Karışımları',
    desc: 'Popüler tütün karışım önerileri',
    prompts: [
      'Limon ve nane karışımı için ideal oran nedir?',
      'Love 66 ile hangi aromalar iyi gider?',
      'Şeftali bazlı bir karışım tarifi önerir misin?',
    ],
  },
  {
    icon: Wind,
    title: 'Nargile Kurulumu',
    desc: 'Doğru kurulum ve çekiş ipuçları',
    prompts: [
      'Nargile nasıl doğru kurulur, iyi çekiş için ne yapmalıyım?',
      'Sıkı çekiş sorunum var, nedeni ne olabilir?',
      'Su haznesi ne kadar dolu olmalı?',
    ],
  },
  {
    icon: Wrench,
    title: 'Ekipman Seçimi',
    desc: 'Başlık, hortum ve cam gövde tavsiyeleri',
    prompts: [
      'Yeni başlayanlar için hangi nargile ekipmanlarını önerirsiniz?',
      'Silikon hortum mu klasik hortum mu daha iyi?',
      'Phunnel başlık mı Vortex başlık mı tercih etmeliyim?',
    ],
  },
];

const generalSuggestions = [
  {
    icon: Code,
    title: 'Kod Yaz',
    desc: 'Her dilde kod yazma ve hata ayıklama',
    prompts: [
      'Python ile basit bir web scraper nasıl yazılır?',
      "JavaScript'te async/await nasıl kullanılır, örnek verir misin?",
      'SQL sorgusu optimizasyonu hakkında ipuçları verir misin?',
    ],
  },
  {
    icon: BookOpen,
    title: 'Öğren & Araştır',
    desc: 'Herhangi bir konuyu açıkla ve özetle',
    prompts: [
      'Kuantum bilgisayarlarını basitçe anlatır mısın?',
      'Yapay zeka ile makine öğrenmesi arasındaki fark nedir?',
      'Blockchain teknolojisi nasıl çalışır?',
    ],
  },
  {
    icon: Lightbulb,
    title: 'Fikir Üret',
    desc: 'Yaratıcı fikirler ve beyin fırtınası',
    prompts: [
      'Küçük bir işletme için 5 benzersiz pazarlama fikri ver.',
      'Mobil uygulama için özgün bir konsept önerir misin?',
      'Sosyal medya içerik takvimi nasıl oluşturulur?',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Yazı & Metin',
    desc: 'Yazı düzenleme, çeviri ve özetleme',
    prompts: [
      'Özgeçmişim için güçlü bir kapak mektubu yazar mısın?',
      'Bu metni daha profesyonel hale getirir misin?',
      'İngilizce e-posta yazmama yardım eder misin?',
    ],
  },
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function WelcomeScreen() {
  const { sendMessage, mode } = useChat();
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
      <div className="welcome-suggestions">
        {suggestions.map((s, i) => (
          <button
            key={i}
            className="suggestion-card"
            onClick={() => sendMessage(pickRandom(s.prompts))}
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
