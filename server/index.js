require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const logger = require('./lib/logger');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// ─── Security ───────────────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// ─── Parsing ─────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// ─── Logging ─────────────────────────────────────────────────────────────────
app.use(morgan('dev', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ─── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/admin', adminRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Route not found.' });
});

// ─── Error handler ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(err.status || 500).json({
    error: true,
    code: err.code || 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message,
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`SIMS DMS server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
