import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createUser, authenticateUser, findUserById, upgradeUserPlan,
  createConversation as dbCreateConv, getConversations as dbGetConvs,
  updateConversationTitle, deleteConversation as dbDeleteConv,
  addMessage, updateUserRole, deleteUser, db
} from './database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS - production'da sadece kendi domain'imiz
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3001', 'http://localhost:5173'];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('CORS policy violation'));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Rate limiting
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' } });
const chatLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 30, message: { error: 'Çok fazla mesaj. Biraz bekleyin.' } });

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set!');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
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
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), JWT_SECRET);
      req.user = await findUserById(decoded.id);
    } catch { /* guest mode */ }
  }
  next();
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Giriş yapmanız gerekiyor.' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = await findUserById(decoded.id);
    if (!req.user) return res.status(401).json({ error: 'Geçersiz oturum.' });
    next();
  } catch {
    return res.status(401).json({ error: 'Oturum süresi dolmuş. Tekrar giriş yapın.' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superuser')) {
      next();
    } else {
      res.status(403).json({ error: 'Bu işlem için yönetici yetkisi gereklidir.' });
    }
  });
}

// ----- Auth Routes -----
app.post('/api/auth/register', authLimiter, async (req, res) => {
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

    const user = await createUser(username, email, password);
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ user, token });
  } catch (error) {
    if (error.code === '23505' || error.message?.includes('UNIQUE') || error.message?.includes('Duplicate')) {
      const field = error.detail?.includes('email') || error.message?.includes('email') ? 'E-posta' : 'Kullanıcı adı';
      return res.status(409).json({ error: `${field} zaten kullanımda.` });
    }
    res.status(500).json({ error: 'Kayıt sırasında bir hata oluştu.' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre gerekli.' });
    }

    const user = await authenticateUser(email, password);
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

app.post('/api/auth/upgrade', requireAuth, async (req, res) => {
  try {
    const updatedUser = await upgradeUserPlan(req.user.id, 'pending_pro');
    res.json({ user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Yükseltme talebi oluşturulamadı.' });
  }
});

// ----- Admin Routes -----

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const usersRow = await db.query('SELECT COUNT(*) as count FROM users');
    const proUsersRow = await db.query('SELECT COUNT(*) as count FROM users WHERE plan = $1', ['pro']);
    const convsRow = await db.query('SELECT COUNT(*) as count FROM conversations');
    const msgsRow = await db.query('SELECT COUNT(*) as count FROM messages');
    
    res.json({ 
      userCount: parseInt(usersRow.rows[0].count), 
      proUserCount: parseInt(proUsersRow.rows[0].count), 
      conversationCount: parseInt(convsRow.rows[0].count), 
      messageCount: parseInt(msgsRow.rows[0].count) 
    });
  } catch (error) {
    res.status(500).json({ error: 'İstatistikler alınamadı.' });
  }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, email, plan, role, created_at FROM users ORDER BY created_at DESC');
    res.json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Kullanıcılar alınamadı.' });
  }
});

app.post('/api/admin/users/:id/approve', requireAdmin, async (req, res) => {
  try {
    const updatedUser = await upgradeUserPlan(req.params.id, 'pro');
    res.json({ user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Kullanıcı onaylanamadı.' });
  }
});

app.post('/api/admin/users/:id/reject', requireAdmin, async (req, res) => {
  try {
    const updatedUser = await upgradeUserPlan(req.params.id, 'basic');
    res.json({ user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Kullanıcı reddedilemedi.' });
  }
});

app.post('/api/admin/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const { role } = req.body;
    
    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ error: 'Geçersiz rol belirtildi.' });
    }

    if (targetId === req.user.id) {
      return res.status(403).json({ error: 'Kendi yetkinizi değiştiremezsiniz.' });
    }

    const targetUser = await findUserById(targetId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }
    
    if (targetUser.role === 'superuser') {
       return res.status(403).json({ error: 'Superuser yetkisine müdahale edilemez.' });
    }

    const updatedUser = await updateUserRole(targetId, role);
    res.json({ user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Kullanıcı yetkisi güncellenemedi.' });
  }
});

app.post('/api/admin/users/:id/plan', requireAdmin, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const { plan } = req.body;

    if (plan !== 'basic' && plan !== 'pro') {
      return res.status(400).json({ error: 'Geçersiz plan belirtildi.' });
    }

    const targetUser = await findUserById(targetId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const updatedUser = await upgradeUserPlan(targetId, plan);
    res.json({ user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Kullanıcı planı güncellenemedi.' });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);

    if (req.user.role !== 'superuser') {
      return res.status(403).json({ error: 'Kullanıcı silme yetkisi sadece superuser\'a aittir.' });
    }

    if (targetId === req.user.id) {
      return res.status(403).json({ error: 'Kendinizi silemezsiniz.' });
    }

    const targetUser = await findUserById(targetId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    if (targetUser.role === 'superuser') {
      return res.status(403).json({ error: 'Superuser silinemez.' });
    }

    await deleteUser(targetId);
    res.json({ message: 'Kullanıcı silindi.', deletedId: targetId });
  } catch (error) {
    res.status(500).json({ error: 'Kullanıcı silinemedi.' });
  }
});

// ----- Conversation Routes (authenticated only) -----
app.get('/api/conversations', requireAuth, async (req, res) => {
  try {
    const conversations = await dbGetConvs(req.user.id);
    res.json({ conversations });
  } catch {
    res.status(500).json({ error: 'Sohbetler yüklenemedi.' });
  }
});

app.delete('/api/conversations/:id', requireAuth, async (req, res) => {
  try {
    await dbDeleteConv(req.params.id, req.user.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Sohbet silinemedi.' });
  }
});

// ----- Chat Route (works for both guest and authenticated) -----
app.post('/api/chat', chatLimiter, optionalAuth, async (req, res) => {
  try {
    const { message, sessionId, conversationId, conversationTitle } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // If user is logged in, save the conversation and user message
    if (req.user && conversationId) {
      try {
        // Create conversation if needed
        await dbCreateConv(conversationId, req.user.id, conversationTitle || 'Yeni Sohbet');
      } catch { /* already exists */ }

      if (conversationTitle) {
        await updateConversationTitle(conversationId, req.user.id, conversationTitle);
      }

      // Save user message
      const userMsg = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      await addMessage(conversationId, req.user.id, userMsg);
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
      : 'gemini-2.5-flash-lite';

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
        // MySQL TIMESTAMP generic format without T
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      await addMessage(conversationId, req.user.id, aiMsg);
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

// Any other route should serve the React app (Client-side routing fallback)
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Cleanup
setInterval(() => { sessions.clear(); }, 30 * 60 * 1000);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 NargileAI Backend running on http://localhost:${PORT}`);
});
