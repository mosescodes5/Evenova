import rateLimit from "express-rate-limit";

/** General API limiter — 100 requests/min per IP */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

/** Auth limiter — prevent brute-force on login/register */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: "Too many auth attempts, try again later." },
});

/** Ticket purchase limiter */
export const ticketLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Too many ticket requests, slow down." },
});
