import { config } from 'dotenv';
config();

export const env = {
  PORT: parseInt(process.env.PORT || '4000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  // Brevo HTTP API key (xkeysib-...) — used for transactional email via REST
  // SMTP keys (xsmtpsib-...) don't work here; Render blocks outbound port 587
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  // Legacy / kept for reference — not used in production
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  BREVO_SMTP_USER: process.env.BREVO_SMTP_USER || '',
  BREVO_SMTP_KEY: process.env.BREVO_SMTP_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'PropAdmin <propadminok@gmail.com>',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
  DEFAULT_INTEREST_RATE: parseFloat(process.env.DEFAULT_INTEREST_RATE || '0.03'),
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
};

const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}
