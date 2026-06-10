require('dotenv').config(); // reloaded: 20260607b

// Prevent unhandled async rejections from crashing the server
process.on('unhandledRejection', (err) => {
  const logger = require('./lib/logger');
  logger.error(`Unhandled rejection: ${err?.message ?? err}`);
});

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const logger = require('./lib/logger');
const csrfMiddleware = require('./middleware/csrf');
const botRoutes = require('./routes/bot.routes');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const adminRoutes = require('./routes/admin.routes');
const studentsRoutes = require('./routes/students.routes');
const calendarRoutes = require('./routes/calendar.routes');
const dutySlotsRoutes = require('./routes/duty-slots.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const violationsRoutes = require('./routes/violations.routes');
const violationTypesRoutes  = require('./routes/violation-types.routes');
const coverRequestsRoutes   = require('./routes/cover-requests.routes');
const messagesRoutes        = require('./routes/messages.routes');
const reportsRoutes         = require('./routes/reports.routes');
const { startCronJobs } = require('./lib/cron');

const app = express();

// ─── Trust proxy (required for deployed environments like Railway) ─────────────
app.set('trust proxy', 1);

// ─── Security ───────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      scriptSrc:     ["'self'", "'unsafe-inline'"],   // Vite module scripts + preloads
      styleSrc:      ["'self'", "'unsafe-inline'"],   // Tailwind inline styles
      imgSrc:        ["'self'", "data:", "blob:"],
      connectSrc:    ["'self'"],
      fontSrc:       ["'self'", "data:"],
      objectSrc:     ["'none'"],
      frameAncestors:["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,   // allows Vite assets with crossorigin attr
}));

app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:5173'];
    if (!origin || allowed.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── Telegram Bot Webhook (MUST be before global rate limiter) ────────────────
app.use(express.json()); // Need to parse JSON for webhook
app.use('/bot', botRoutes);

// ─── Health endpoints (MUST be before global rate limiter) ───────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// DB-backed health check — used by deployment monitors that need to verify the
// database is reachable, not just that the Node process is alive.
app.get('/health/db', async (req, res) => {
  try {
    const prisma = require('./lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error(`/health/db check failed: ${err.message}`);
    res.status(503).json({ status: 'degraded', db: 'error', timestamp: new Date().toISOString() });
  }
});

// Global limiter — high cap, DoS backstop only. Keep the strict OTP limiter in auth.routes.js.
// 100 req/15min would 429 every faculty on a shared NAT IP (30 users × 3 polls = ~90 req/15min).
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 10000 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// ─── Parsing ─────────────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── CSRF protection (POST/PUT/PATCH/DELETE on authenticated sessions) ────────
app.use(csrfMiddleware);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/admin', adminRoutes);
app.use('/students', studentsRoutes);
app.use('/calendar', calendarRoutes);
app.use('/duty-slots', dutySlotsRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/violations', violationsRoutes);
app.use('/violation-types', violationTypesRoutes);
app.use('/cover-requests',  coverRequestsRoutes);
app.use('/messages',        messagesRoutes);
app.use('/reports',         reportsRoutes);

// ─── Static frontend (production only) ───────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  // Catch-all: serve index.html for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  // ─── 404 (dev only — in prod the catch-all above handles unknown paths) ────
  app.use((req, res) => {
    res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Route not found.' });
  });
}

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
  startCronJobs();
});
