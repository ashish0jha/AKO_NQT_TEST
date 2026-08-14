import jwt from "jsonwebtoken";
import axios from "axios";
import User from "../models/User.js";
import { encryptSecret, decryptSecret, maskSecret } from "../utils/crypto.js";

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const user = await User.create({ name, email, password });
    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() }).select(
      "+groqApiKeyEncrypted"
    );
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await user.comparePassword(password || "");
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user._id);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
}

export async function me(req, res) {
  const user = await User.findById(req.userId).select("+groqApiKeyEncrypted");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user: user.toSafeObject() });
}

// Verifies the key actually works before we save it, so a typo'd key
// doesn't silently sit there until the candidate's first test section
// fails mid-attempt.
async function verifyGroqKey(apiKey) {
  try {
    await axios.get("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 8000,
    });
    return true;
  } catch (err) {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      return false;
    }
    // Network/5xx/timeout - don't block saving on a transient Groq outage,
    // just skip the pre-check.
    return true;
  }
}

export async function saveGroqKey(req, res) {
  try {
    const apiKey = (req.body.apiKey || "").trim();
    if (!apiKey) return res.status(400).json({ message: "API key is required" });
    if (!apiKey.startsWith("gsk_")) {
      return res.status(400).json({ message: "That doesn't look like a Groq API key (should start with gsk_)" });
    }

    const valid = await verifyGroqKey(apiKey);
    if (!valid) {
      return res.status(400).json({ message: "Groq rejected this key — double-check you copied it correctly." });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.groqApiKeyEncrypted = encryptSecret(apiKey);
    await user.save();

    res.json({ hasGroqKey: true, preview: maskSecret(apiKey) });
  } catch (err) {
    res.status(500).json({ message: "Could not save API key", error: err.message });
  }
}

export async function deleteGroqKey(req, res) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.groqApiKeyEncrypted = null;
    await user.save();
    res.json({ hasGroqKey: false });
  } catch (err) {
    res.status(500).json({ message: "Could not remove API key", error: err.message });
  }
}

export async function groqKeyStatus(req, res) {
  const user = await User.findById(req.userId).select("+groqApiKeyEncrypted");
  if (!user) return res.status(404).json({ message: "User not found" });
  const key = decryptSecret(user.groqApiKeyEncrypted);
  res.json({ hasGroqKey: !!key, preview: key ? maskSecret(key) : null });
}
