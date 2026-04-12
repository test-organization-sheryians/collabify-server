import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  LOG_HEADERS: z.coerce.boolean().default(false),
  LOG_COOKIES: z.coerce.boolean().default(false),
  LOG_REQ_BODY: z.coerce.boolean().default(false),
  LOG_RES_BODY: z.coerce.boolean().default(false),
  LOG_GRAPHQL_VARS: z.coerce.boolean().default(false),
  LOG_DB_PARAMS: z.coerce.boolean().default(false),
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1),
  REDIS_URL: z.string().url(),

  // Email
  EMAIL_FROM: z.string().email(),
  EMAIL_PROVIDER: z
    .enum(["ses", "console", "sendgrid", "nodemailer", "resend"])
    .default("console"),

  // Push
  PUSH_PROVIDER: z
    .enum(["fcm", "console"])
    .default("console"),
  FIREBASE_PROJECT_ID:           z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(), // JSON string of service account key

  // SendGrid
  SENDGRID_API_KEY: z.string().optional(),

  // Resend
  RESEND_API_KEY: z.string().optional(),

  // SMTP (Nodemailer adapter — works with any SMTP server or Ethereal for local dev)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().default(false), // true for port 465

  // AWS (SES, S3, etc)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),
  S3_WHITEBOARD_BUCKET: z.string().min(1).default("collabify-dev-whiteboards"),
  S3_VAULT_BUCKET: z.string().min(1).default("collabify-dev-vault"),

  // Vault Lifecycle — dev/test overrides (ignored in production)
  // VAULT_FAST_CLEANUP_MS: override the 30-min unreferenced grace period (e.g. 10000 = 10s)
  // VAULT_CLEANUP_INTERVAL_MS: override the 30-min job run cadence (e.g. 15000 = 15s)
  VAULT_FAST_CLEANUP_MS: z.coerce.number().optional(),
  VAULT_CLEANUP_INTERVAL_MS: z.coerce.number().optional(),

  // Chat Debug / Chaos
  DEBUG_CHAT: z.enum(["true", "false"]).default("false"),
  DEBUG_CHAT_DROP_RATE: z.string().optional(),
  DEBUG_CHAT_DELAY_MS: z.string().optional(),

  // General
  API_URL: z.string().url().default("http://localhost:3000"), // Default for dev
  ASSIGNMENT_SERVER_HOST: z.string().default("172.17.0.1:3001"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsed.error.format(), null, 4)
  );
  process.exit(1);
}

export const env = parsed.data;
