import jwt from 'jsonwebtoken';
import { getDbPool, isDbConnected, mockStore } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'qless_jwt_secret_dev';

export async function login(req, res) {
  try {
    const { email, password, role } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    let user = null;

    if (isDbConnected()) {
      const pool = getDbPool();
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (rows.length > 0) {
        user = rows[0];
      }
    }

    // Fallback to mock store
    if (!user) {
      user = mockStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    // If still not found, create a demo user session on the fly
    if (!user) {
      user = {
        id: `user-${Date.now()}`,
        email,
        full_name: email.split('@')[0],
        role: role || 'CUSTOMER',
        org_id: role === 'STAFF' ? 'org-hosp-01' : null
      };
      mockStore.users.push(user);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, org_id: user.org_id, name: user.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        org_id: user.org_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Authentication failed' });
  }
}

export async function getCurrentUser(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    return res.json({
      success: true,
      user: decoded
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
