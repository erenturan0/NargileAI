import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool to MySQL / Cloud SQL
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nargile_ai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Initialize database schema
async function initDb() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        plan VARCHAR(50) DEFAULT 'basic',
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) DEFAULT 'Yeni Sohbet',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        conversation_id VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);

    // Ensure users table has plan column (for backwards compatibility if DB already existed differently)
    try {
      await db.query(`ALTER TABLE users ADD COLUMN plan VARCHAR(50) DEFAULT 'basic'`);
    } catch { /* Column likely exists */ }
    
    try {
      await db.query(`ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'`);
    } catch { /* Column likely exists */ }
    
    console.log("MySQL Database Initialized successfully.");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
}

// Call initDb on connection
initDb();

// User operations
export async function createUser(username, email, password) {
  const hash = await bcrypt.hash(password, 10);
  const [result] = await db.execute(
    'INSERT INTO users (username, email, password, plan, role) VALUES (?, ?, ?, ?, ?)',
    [username, email, hash, 'basic', 'user']
  );
  return { id: result.insertId, username, email, plan: 'basic', role: 'user' };
}

export async function authenticateUser(email, password) {
  const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return null;
  }
  return { id: user.id, username: user.username, email: user.email, plan: user.plan || 'basic', role: user.role || 'user' };
}

export async function findUserById(id) {
  const [rows] = await db.execute(
    'SELECT id, username, email, plan, role, created_at FROM users WHERE id = ?', 
    [id]
  );
  return rows[0] || null;
}

export async function upgradeUserPlan(id, newPlan) {
  await db.execute('UPDATE users SET plan = ? WHERE id = ?', [newPlan, id]);
  return findUserById(id);
}

export async function updateUserRole(id, newRole) {
  await db.execute('UPDATE users SET role = ? WHERE id = ?', [newRole, id]);
  return findUserById(id);
}

export async function makeUserAdmin(username) {
  await db.execute("UPDATE users SET role = 'admin' WHERE username = ?", [username]);
}

// Conversation operations
export async function createConversation(id, userId, title) {
  await db.execute('INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)', [id, userId, title]);
  return { id, user_id: userId, title, messages: [] };
}

export async function getConversations(userId) {
  const [convs] = await db.execute('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
  
  for (let c of convs) {
    const [msgs] = await db.execute('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC', [c.id]);
    c.messages = msgs;
  }
  return convs;
}

export async function updateConversationTitle(id, userId, title) {
  await db.execute('UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?', [title, id, userId]);
}

export async function deleteConversation(id, userId) {
  await db.execute('DELETE FROM conversations WHERE id = ? AND user_id = ?', [id, userId]);
}

// Message operations
export async function addMessage(conversationId, userId, message) {
  // Using a simple transaction logic for safety, though 2 sequential queries is fine.
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      'INSERT INTO messages (id, conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
      [message.id, conversationId, message.role, message.content, message.timestamp]
    );
    // update_at on conversations is auto-updated via ON UPDATE CURRENT_TIMESTAMP in schema 
    // but just to be sure we can touch it if we need to.
    await connection.execute('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [conversationId, userId]);
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// Export raw db connecton for direct operations
export { db };
