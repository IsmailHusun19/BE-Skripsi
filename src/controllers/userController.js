const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.users.findMany();
    res.json(users);
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(200).json({ message: 'Login successful', userId: user.id, token });
  }
};

const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.users.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Get User Error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

const updateUserById = async (req, res) => {
  const { id } = req.params;
  const { nama, email, role, newNomorInduk, password } = req.body;
  
  let hashedPassword;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  try {
    const user = await prisma.users.update({
      where: { id: parseInt(id) },
      data: {
        nama,
        email,
        role,
        nomorinduk: newNomorInduk,
        ...(hashedPassword && { password: hashedPassword }),
      },
    });
    res.json(user);
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(400).json({ error: 'Update failed' });
  }
};

const deleteUserById = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.users.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(400).json({ error: 'Delete failed' });
  }
};

module.exports = { getAllUsers, getUserById, updateUserById, deleteUserById };
