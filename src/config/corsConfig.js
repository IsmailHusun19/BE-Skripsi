const cors = require('cors');

const corsConfig = cors({
  origin: 'http://localhost:5173', // Sesuaikan dengan URL frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

module.exports = corsConfig;
