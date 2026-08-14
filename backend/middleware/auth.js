import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { decryptSecret } from "../utils/crypto.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Every route that triggers AI question generation or AI scoring needs the
// candidate's own Groq API key (see models/User.js) instead of a shared
// server-side one. Run this AFTER requireAuth on those specific routes.
export async function requireGroqKey(req, res, next) {
  try {
    const user = await User.findById(req.userId).select("+groqApiKeyEncrypted");
    if (!user) return res.status(404).json({ message: "User not found" });

    const apiKey = decryptSecret(user.groqApiKeyEncrypted);
    if (!apiKey) {
      return res.status(400).json({
        code: "GROQ_KEY_REQUIRED",
        message: "Add your Groq API key in Settings before starting a test.",
      });
    }
    req.groqApiKey = apiKey;
    next();
  } catch (err) {
    res.status(500).json({ message: "Could not verify API key", error: err.message });
  }
}
