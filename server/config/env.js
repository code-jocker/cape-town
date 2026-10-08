import 'dotenv/config';

function int(v, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

const env = process.env.NODE_ENV || 'development';

export const config = {
  env,
  isProd: env === 'production',
  port: int(process.env.PORT, 3000),
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret',
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  tableTokenSecret: process.env.TABLE_TOKEN_SECRET || 'dev-table-token-secret',
  corsOrigin: (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim()),
  uploadDir: process.env.UPLOAD_DIR || 'public/uploads',
  rateLimit: {
    windowMin: int(process.env.RATE_LIMIT_WINDOW_MIN, 15),
    max: int(process.env.RATE_LIMIT_MAX, 300),
    loginMax: int(process.env.LOGIN_RATE_MAX, 10),
    orderMax: int(process.env.ORDER_RATE_MAX, 5),
    orderWindowMin: int(process.env.ORDER_RATE_WINDOW_MIN, 10),
    requestMax: int(process.env.REQUEST_RATE_MAX, 3),
    requestWindowMin: int(process.env.REQUEST_RATE_WINDOW_MIN, 5)
  },
  lateOrderMinutes: int(process.env.LATE_ORDER_MINUTES, 20),
  warnOrderMinutes: int(process.env.WARN_ORDER_MINUTES, 10),
  autoCloseSessionHours: int(process.env.AUTO_CLOSE_SESSION_HOURS, 3)
};

if (config.isProd) {
  if (!process.env.JWT_SECRET || !process.env.TABLE_TOKEN_SECRET) {
    throw new Error('JWT_SECRET and TABLE_TOKEN_SECRET are required in production');
  }
}
