import pg from 'pg';
const { Pool } = pg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool to PostgreSQL / Cloud SQL
const isUnixSocket = process.env.DB_HOST?.startsWith('/');

const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nargile_ai',
  ...(isUnixSocket ? {} : { port: parseInt(process.env.DB_PORT) || 5432 }),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: isUnixSocket ? false : (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false),
});

// Initialize database schema
async function initDb() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        plan VARCHAR(50) DEFAULT 'basic',
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) DEFAULT 'Yeni Sohbet',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        conversation_id VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);

    // Ensure users table has plan column (Postgres migration safety)
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'basic'`);
    } catch { /* likely exists */ }
    
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'`);
    } catch { /* likely exists */ }
    
    await client.query('COMMIT');
    console.log("PostgreSQL Database Initialized successfully.");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Database initialization failed:", error);
  } finally {
    client.release();
  }
}

// Call initDb on connection
initDb().catch(err => console.error('initDb failed (non-fatal):', err.message));

// User operations
export async function createUser(username, email, password) {
  const hash = await bcrypt.hash(password, 10);
  const result = await db.query(
    'INSERT INTO users (username, email, password, plan, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [username, email, hash, 'basic', 'user']
  );
  return { id: result.rows[0].id, username, email, plan: 'basic', role: 'user' };
}

export async function authenticateUser(email, password) {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return null;
  }
  return { id: user.id, username: user.username, email: user.email, plan: user.plan || 'basic', role: user.role || 'user' };
}

export async function findUserById(id) {
  const result = await db.query(
    'SELECT id, username, email, plan, role, created_at FROM users WHERE id = $1', 
    [id]
  );
  return result.rows[0] || null;
}

export async function upgradeUserPlan(id, newPlan) {
  await db.query('UPDATE users SET plan = $1 WHERE id = $2', [newPlan, id]);
  return findUserById(id);
}

export async function updateUserRole(id, newRole) {
  await db.query('UPDATE users SET role = $1 WHERE id = $2', [newRole, id]);
  return findUserById(id);
}

export async function deleteUser(id) {
  await db.query('DELETE FROM users WHERE id = $1', [id]);
}

export async function makeUserAdmin(username) {
  await db.query("UPDATE users SET role = 'admin' WHERE username = $1", [username]);
}

// Conversation operations
export async function createConversation(id, userId, title) {
  await db.query('INSERT INTO conversations (id, user_id, title) VALUES ($1, $2, $3)', [id, userId, title]);
  return { id, user_id: userId, title, messages: [] };
}

export async function getConversations(userId) {
  const result = await db.query('SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
  const convs = result.rows;
  
  for (let c of convs) {
    const msgsResult = await db.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY timestamp ASC', [c.id]);
    c.messages = msgsResult.rows;
  }
  return convs;
}

export async function updateConversationTitle(id, userId, title) {
  await db.query('UPDATE conversations SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3', [title, id, userId]);
}

export async function deleteConversation(id, userId) {
  await db.query('DELETE FROM conversations WHERE id = $1 AND user_id = $2', [id, userId]);
}

// Message operations
export async function addMessage(conversationId, userId, message) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO messages (id, conversation_id, role, content, timestamp) VALUES ($1, $2, $3, $4, $5)',
      [message.id, conversationId, message.role, message.content, message.timestamp]
    );
    await client.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2', [conversationId, userId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Export raw db connecton for direct operations
export { db };
