const express = require('express');
const { getAllUsers, getUserById, updateUserById, deleteUserById } = require('../controllers/userController');
const authenticateToken = require('../middlewares/authenticateToken');
const router = express.Router();

router.get('/', authenticateToken, getAllUsers);
router.get('/:id', authenticateToken, getUserById);
router.put('/:id', authenticateToken, updateUserById);
router.delete('/:id', authenticateToken, deleteUserById);

module.exports = router;
