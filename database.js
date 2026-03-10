import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const db = new Database(join(__dirname, 'nargile.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    plan TEXT DEFAULT 'basic',
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT DEFAULT 'Yeni Sohbet',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
`);

// Auto-migrate existing databases to add 'plan' column if missing
try {
  db.exec("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'basic';");
} catch (err) {
  // Column likely already exists
}

// Auto-migrate existing databases to add 'role' column if missing
try {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';");
} catch (err) {
  // Column likely already exists
}

// Prepared statements
const stmts = {
  createUser: db.prepare('INSERT INTO users (username, email, password, plan, role) VALUES (?, ?, ?, ?, ?)'),
  findUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  findUserById: db.prepare('SELECT id, username, email, plan, role, created_at FROM users WHERE id = ?'),
  upgradeUserPlan: db.prepare('UPDATE users SET plan = ? WHERE id = ?'),
  updateUserRole: db.prepare('UPDATE users SET role = ? WHERE id = ?'),
  makeUserAdmin: db.prepare("UPDATE users SET role = 'admin' WHERE username = ?"),

  createConversation: db.prepare('INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)'),
  getConversations: db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC'),
  updateConversationTitle: db.prepare('UPDATE conversations SET title = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?'),
  updateConversationTime: db.prepare('UPDATE conversations SET updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?'),
  deleteConversation: db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?'),

  addMessage: db.prepare('INSERT INTO messages (id, conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)'),
  getMessages: db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC'),
};

// User operations
export function createUser(username, email, password) {
  const hash = bcrypt.hashSync(password, 10);
  const result = stmts.createUser.run(username, email, hash, 'basic', 'user');
  return { id: result.lastInsertRowid, username, email, plan: 'basic', role: 'user' };
}

export function authenticateUser(email, password) {
  const user = stmts.findUserByEmail.get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return null;
  }
  return { id: user.id, username: user.username, email: user.email, plan: user.plan || 'basic', role: user.role || 'user' };
}

export function findUserById(id) {
  return stmts.findUserById.get(id);
}

export function upgradeUserPlan(id, newPlan) {
  stmts.upgradeUserPlan.run(newPlan, id);
  return findUserById(id);
}

export function updateUserRole(id, newRole) {
  stmts.updateUserRole.run(newRole, id);
  return findUserById(id);
}

export function makeUserAdmin(username) {
  stmts.makeUserAdmin.run(username);
}

// Conversation operations
export function createConversation(id, userId, title) {
  stmts.createConversation.run(id, userId, title);
  return { id, user_id: userId, title, messages: [] };
}

export function getConversations(userId) {
  const convs = stmts.getConversations.all(userId);
  return convs.map(c => ({
    ...c,
    messages: stmts.getMessages.all(c.id),
  }));
}

export function updateConversationTitle(id, userId, title) {
  stmts.updateConversationTitle.run(title, id, userId);
}

export function deleteConversation(id, userId) {
  stmts.deleteConversation.run(id, userId);
}

// Message operations
export const addMessage = db.transaction((conversationId, userId, message) => {
  stmts.addMessage.run(message.id, conversationId, message.role, message.content, message.timestamp);
  stmts.updateConversationTime.run(conversationId, userId);
});

export default db;
