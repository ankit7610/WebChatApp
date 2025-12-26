import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || '5I40mOCKLq4DzEj4c4NbWOl88ZIsEhg65KxiyOnAXOU=';
const API_URL = 'http://localhost:3001';

const testAddContact = async () => {
  const token = jwt.sign(
    {
      userId: 'RWY1CnJNEQVhMpwuH22eyoTrHJm2',
      username: 'Ankit',
    },
    JWT_SECRET
  );

  try {
    console.log('Sending POST /api/contacts/add...');
    const response = await fetch(`${API_URL}/api/contacts/add`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ addEmail: 'apoorva@gmail.com' })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (err) {
    console.error('Error:', err.message);
  }
};

testAddContact();
