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

const logger = require('./lib/logger');
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

// ─── Security ───────────────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 10000 : 100,
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
app.use('/students', studentsRoutes);
app.use('/calendar', calendarRoutes);
app.use('/duty-slots', dutySlotsRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/violations', violationsRoutes);
app.use('/violation-types', violationTypesRoutes);
app.use('/cover-requests',  coverRequestsRoutes);
app.use('/messages',        messagesRoutes);
app.use('/reports',         reportsRoutes);

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
  startCronJobs();
});
