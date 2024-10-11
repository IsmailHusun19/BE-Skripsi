const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

const registerUser = async (req, res) => {
  const { nomorinduk, nama, email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.users.create({
      data: {
        nomorinduk,
        nama,
        email,
        password: hashedPassword,
        role
      },
    });
    res.status(201).json(user);
  } catch (error) {
    console.error('Register Error:', error);
    res.status(400).json({ error: 'User already exists or other error' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.users.findUnique({ where: { email } });

  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, nomorinduk: user.nomorinduk, nama: user.nama, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400000,
    sameSite: 'Strict'
  });

  res.status(200).json({ message: 'Login successful', userId: user.id, token });
};

const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    // secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    expires: new Date(0)
  });
  res.status(200).json({ message: 'Logout successful' });
};

module.exports = { registerUser, loginUser, logoutUser };
