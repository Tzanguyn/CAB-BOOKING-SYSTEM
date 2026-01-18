const express = require('express');
const cors = require('cors');

// Import Routes
const authRoutes = require('./routes/authRoutes'); 

// Import Models (Để đảm bảo bảng được tạo khi App chạy)
require('./models/user'); 

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Health Check ---
app.get('/', (req, res) => {
    res.json({ message: 'Auth Service is running...', timestamp: new Date() });
});

// --- Routes ---
app.use('/auth', authRoutes); 

module.exports = app;