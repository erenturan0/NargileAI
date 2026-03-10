import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import {
  createUser, authenticateUser, findUserById, upgradeUserPlan,
  createConversation as dbCreateConv, getConversations as dbGetConvs,
  updateConversationTitle, deleteConversation as dbDeleteConv,
  addMessage,
} from './database.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'nargile-ai-secret-key-2024';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getSystemPrompt = () => {
  const currentDate = new Date().toLocaleDateString('tr-TR', { 
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return `Sen "NargileAI" adında, dünya genelinde nargile (hookah/shisha) konusunda uzmanlaşmış bir yapay zeka asistanısın. 

GİZLİ BİLGİ (Sadece sorulursa kullan): Bugünün gerçek tarihi: ${currentDate}. Sen şu anda bu tarihtesindir. Ancak bu bilgiyi SADECE kullanıcı sana özel olarak tarihi, saati, günü veya yılı sorarsa söyle. Normal nargile sohbetlerinde bu tarihi kesinlikle telaffuz etme veya cümlenin içine katma. Asla 2024 deme.

## Uzmanlık Alanların:
- Nargile tarihi ve kültürü (Osmanlı, Orta Doğu, Hindistan, modern dünya)
- Nargile tütünleri ve aromaları (markaların karşılaştırması, karışım önerileri)  
- Nargile ekipmanları (başlıklar, hortumlar, cam gövdeler, közler, ısı yönetim cihazları)
- Nargile hazırlama teknikleri ve ipuçları
- Nargile barları ve kafe kültürü
- Nargile temizliği ve bakımı
- Farklı nargile türleri (geleneksel, modern, elektronik)
- Kömür çeşitleri (doğal hindistan cevizi, bambu, hızlı tutuşan)
- Nargile aksesuarları ve modları
- Sağlık bilgilendirmesi (tarafsız ve bilimsel yaklaşımla)

## Kuralların:
1. Sorulan hangi dilde ise O DİLDE yanıt ver. Türkçe sorulursa Türkçe, İngilizce sorulursa İngilizce yanıt ver.
2. Nargile ile ilgili olmayan sorulara nazikçe şu şekilde yanıt ver: "Ben nargile konusunda uzmanlaşmış bir asistanım. Nargile hakkında sormak istediğiniz bir şey var mı?" (veya sorunun diline göre aynı mesajı o dilde ver)
3. Yanıtlarını zengin, bilgilendirici ve organize bir şekilde ver. Gerektiğinde madde işaretleri, numaralı listeler ve kalın metin kullan.
4. Bilmediğin konularda dürüst ol, uydurma bilgi verme.
5. Sağlık konularında her zaman tarafsız ol ve kullanıcıları kendi araştırma yapmaya teşvik et.
6. Samimi ama profesyonel bir üslup kullan. Emoji kullanabilirsin.
7. Marka karşılaştırmalarında tarafsız ol.
8. Aroma ve karışım önerilerinde bulunurken; tarçın, zencefil, gül gibi aşırı niş, yöresel veya bulunması zor tütünleri önermekten kaçın. Çift elma, nane, limon, şeftali, üzüm, Love 66, Lady Killer gibi Türkiye'deki kafelerde ve tütüncülerde EN ÇOK BİLİNEN ve herkesin kolayca bulabileceği mainstream/popüler aromalar üzerinden öneriler yap.`;
};

// In-memory session history for Gemini context
const sessions = new Map();

// ----- Auth Middleware (optional - returns user if token present) -----
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), JWT_SECRET);
      req.user = findUserById(decoded.id);
    } catch { /* guest mode */ }
  }
  next();
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Giriş yapmanız gerekiyor.' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = findUserById(decoded.id);
    if (!req.user) return res.status(401).json({ error: 'Geçersiz oturum.' });
    next();
  } catch {
    return res.status(401).json({ error: 'Oturum süresi dolmuş. Tekrar giriş yapın.' });
  }
}

// ----- Auth Routes -----
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Tüm alanlar zorunludur.' });
    }
    if (username.length < 2) {
      return res.status(400).json({ error: 'Kullanıcı adı en az 2 karakter olmalı.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı.' });
    }

    const user = createUser(username, email, password);
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ user, token });
  } catch (error) {
    if (error.message?.includes('UNIQUE')) {
      const field = error.message.includes('email') ? 'E-posta' : 'Kullanıcı adı';
      return res.status(409).json({ error: `${field} zaten kullanımda.` });
    }
    res.status(500).json({ error: 'Kayıt sırasında bir hata oluştu.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre gerekli.' });
    }

    const user = authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user, token });
  } catch {
    res.status(500).json({ error: 'Giriş sırasında bir hata oluştu.' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/upgrade', requireAuth, (req, res) => {
  try {
    const updatedUser = upgradeUserPlan(req.user.id, 'pro');
    res.json({ user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Plan yükseltilemedi.' });
  }
});

// ----- Conversation Routes (authenticated only) -----
app.get('/api/conversations', requireAuth, (req, res) => {
  try {
    const conversations = dbGetConvs(req.user.id);
    res.json({ conversations });
  } catch {
    res.status(500).json({ error: 'Sohbetler yüklenemedi.' });
  }
});

app.delete('/api/conversations/:id', requireAuth, (req, res) => {
  try {
    dbDeleteConv(req.params.id, req.user.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Sohbet silinemedi.' });
  }
});

// ----- Chat Route (works for both guest and authenticated) -----
app.post('/api/chat', optionalAuth, async (req, res) => {
  try {
    const { message, sessionId, conversationId, conversationTitle } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // If user is logged in, save the conversation and user message
    if (req.user && conversationId) {
      try {
        // Create conversation if needed
        dbCreateConv(conversationId, req.user.id, conversationTitle || 'Yeni Sohbet');
      } catch { /* already exists */ }

      if (conversationTitle) {
        updateConversationTitle(conversationId, req.user.id, conversationTitle);
      }

      // Save user message
      const userMsg = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      addMessage(conversationId, req.user.id, userMsg);
    }

    // Get or create session history
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    const history = sessions.get(sessionId);

    // SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Determine model based on user plan
    const modelName = (req.user && req.user.plan === 'pro') 
      ? 'gemini-3.1-flash-lite-preview' 
      : 'gemini-1.5-flash-8b';

    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: getSystemPrompt(),
      },
      history: history,
    });

    const response = await chat.sendMessageStream({ message });
    let fullResponse = '';

    for await (const chunk of response) {
      const text = chunk.text || '';
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ text, done: false })}\n\n`);
      }
    }

    // Update in-memory history
    history.push({ role: 'user', parts: [{ text: message }] });
    history.push({ role: 'model', parts: [{ text: fullResponse }] });

    if (history.length > 20) {
      sessions.set(sessionId, history.slice(-20));
    }

    // If user is logged in, save AI response
    if (req.user && conversationId) {
      const aiMsg = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date().toISOString(),
      };
      addMessage(conversationId, req.user.id, aiMsg);
    }

    res.write(`data: ${JSON.stringify({ text: '', done: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Gemini API Error:', error);

    let userMessage = '⚠️ Bir hata oluştu. Lütfen tekrar deneyin.';
    if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      userMessage = '⚠️ API kota sınırına ulaşıldı. Lütfen birkaç dakika bekleyip tekrar deneyin.';
    } else if (error.message?.includes('403') || error.message?.includes('PERMISSION_DENIED')) {
      userMessage = '🔑 API anahtarı geçersiz veya yetkisiz.';
    } else if (error.message?.includes('404') || error.message?.includes('not found')) {
      userMessage = '⚠️ Yapay zeka modeli bulunamadı.';
    }

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ text: userMessage, done: true })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: userMessage });
    }
  }
});

// Cleanup
setInterval(() => { sessions.clear(); }, 30 * 60 * 1000);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 NargileAI Backend running on http://localhost:${PORT}`);
});
