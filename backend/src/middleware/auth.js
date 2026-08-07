import jwt from "jsonwebtoken";
import { config } from "../config.js";

/**
 * requireAuth — verifies Bearer JWT and attaches decoded payload to req.user
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized — token missing" });
  }

  try {
    req.user = jwt.verify(token, config.jwt.secret);
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized — invalid or expired token" });
  }
}

/**
 * requireAdmin — must be used after requireAuth
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden — admin only" });
  }
  next();
}

/**
 * requireOrganizer — must be used after requireAuth
 */
export function requireOrganizer(req, res, next) {
  if (!["admin", "organizer"].includes(req.user?.role)) {
    return res.status(403).json({ error: "Forbidden — organizers only" });
  }
  next();
}
