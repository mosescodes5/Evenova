import "dotenv/config";

const required = (key) => {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
  return process.env[key];
};

export const config = {
  env:  process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "4000", 10),
  isDev: process.env.NODE_ENV !== "production",

  jwt: {
    secret:    process.env.JWT_SECRET || "dev_secret_change_me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  db: {
    url: process.env.DATABASE_URL || process.env.MONGO_URI || "",
  },

  email: {
    provider:    process.env.EMAIL_PROVIDER || "mock",
    resendKey:   process.env.RESEND_API_KEY || "",
    sesUrl:      process.env.SES_ENDPOINT_URL || "",
    sesKey:      process.env.SES_API_KEY || "",
    brevoKey:       process.env.BREVO_API_KEY      || "",
    mailersendKey:  process.env.MAILERSEND_API_KEY || "",
    smtp: {
      host: process.env.SMTP_HOST || "",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
    fromName:    process.env.EMAIL_FROM_NAME    || "Evenova",
    fromAddress: process.env.EMAIL_FROM_ADDRESS || "hello.evenova@gmail.com",
  },

  payments: {
    paystack: {
      secretKey: process.env.PAYSTACK_SECRET_KEY || "",
      publicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
    },
    flutterwave: {
      secretKey:  process.env.FLW_SECRET_KEY   || "",
      publicKey:  process.env.FLW_PUBLIC_KEY   || "",
      secretHash: process.env.FLW_SECRET_HASH  || "",
    },
  },

  storage: {
    s3: {
      region:    process.env.AWS_REGION          || "eu-west-1",
      accessKey: process.env.AWS_ACCESS_KEY_ID   || "",
      secretKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      bucket:    process.env.S3_BUCKET_NAME      || "evenova-assets",
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME  || "",
      apiKey:    process.env.CLOUDINARY_API_KEY     || "",
      apiSecret: process.env.CLOUDINARY_API_SECRET  || "",
    },
  },

  cors: {
    origins: (
      process.env.ALLOWED_ORIGINS ||
      "http://localhost:5173,https://evenova.vercel.app,https://evenova.ng"
    ).split(","),
  },

  ticket: {
    secret: process.env.TICKET_SECRET || "EVENOVA_PRIME_NG_2025",
  },
};