import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config';
import { errorHandler } from './middleware/error.middleware';

// Routers
import authRouter from './modules/auth/auth.router';
import buildingsRouter from './modules/buildings/buildings.router';
import apartmentsRouter from './modules/apartments/apartments.router';
import residentsRouter from './modules/residents/residents.router';
import expensesRouter from './modules/expenses/expenses.router';
import paymentsRouter from './modules/payments/payments.router';
import reservationsRouter from './modules/reservations/reservations.router';
import dashboardRouter from './modules/dashboard/dashboard.router';
import maintenanceRouter from './modules/maintenance/maintenance.router';
import documentsRouter from './modules/documents/documents.router';
import announcementsRouter from './modules/announcements/announcements.router';

const app = express();

// ── Security & perf middleware ──────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.isDev) {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ── Health check ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ───────────────────────────────────────────────
const v1 = express.Router();

v1.use('/auth',          authRouter);
v1.use('/buildings',     buildingsRouter);
v1.use('/apartments',    apartmentsRouter);
v1.use('/residents',     residentsRouter);
v1.use('/expenses',      expensesRouter);
v1.use('/payments',      paymentsRouter);
v1.use('/reservations',  reservationsRouter);
v1.use('/maintenance',   maintenanceRouter);
v1.use('/documents',     documentsRouter);
v1.use('/announcements', announcementsRouter);
v1.use('/dashboard',     dashboardRouter);

app.use('/api/v1', v1);

// ── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Error handler ────────────────────────────────────────────
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`🚀 PropAdmin API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

export default app;
