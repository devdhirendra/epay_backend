import express from 'express';
import bcrypt from 'bcrypt';
import mysql from 'mysql2'; 
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const db = mysql.createConnection({
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect(err => {
    if (err) {
        console.error('Database connection error:', err);
        process.exit(1); 
    }
    console.log('Connected to the database');
});

router.post('/signup', async (req, res) => {
    const { firstName, lastName, mobileNumber, email, pin } = req.body;

    try {
        const [rows] = await db.promise().query('SELECT * FROM users WHERE mobileNumber = ? OR email = ?', [mobileNumber, email]);
        if (rows.length > 0) {
            return res.status(400).json({ message: 'User with this mobile number or email already exists' });
        }

        const hashedPin = await bcrypt.hash(pin, 10);
        await db.promise().query('INSERT INTO users (firstName, lastName, mobileNumber, email, pin) VALUES (?, ?, ?, ?, ?)', [firstName, lastName, mobileNumber, email, hashedPin]);

        res.json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Failed to register' });
    }
});

router.post('/signin', (req, res) => {
    const { mobileNumber, pin } = req.body;
    const query = 'SELECT * FROM users WHERE mobileNumber = ?';
    
    db.query(query, [mobileNumber], async (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        if (results.length === 0) {
            console.log('User not found:', mobileNumber);
            return res.status(401).json({ message: 'User not found' });
        }
  
        const user = results[0];
        const match = await bcrypt.compare(pin, user.pin);
        if (!match) {
            console.log('Invalid credentials for user:', mobileNumber);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
  
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token });
    });
  });
  
export default router;
