const express = require('express');
const cookieParser = require('cookie-parser');
const corsConfig = require('./config/corsConfig');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(corsConfig);

app.use('/auth', authRoutes);
app.use('/users', userRoutes);

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
