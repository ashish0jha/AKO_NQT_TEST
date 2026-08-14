import crypto from "crypto";

/**
 * Encrypts each user's own Groq API key before it's stored in Mongo, so a
 * database dump/leak doesn't hand out live API keys in plaintext.
 * Needs a 32-byte secret in ENCRYPTION_KEY (see backend/.env.example) —
 * this is separate from JWT_SECRET on purpose, so rotating one never
 * invalidates the other.
 */
const ALGO = "aes-256-gcm";

function getKey() {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Add a 32+ character random string to backend/.env (used to encrypt stored Groq API keys)."
    );
  }
  // Accepts any length input and derives a stable 32-byte key from it, so
  // the .env value doesn't have to be exactly 32 chars.
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSecret(stored) {
  if (!stored) return null;
  const [ivHex, tagHex, dataHex] = stored.split(":");
  if (!ivHex || !tagHex || !dataHex) return null;
  try {
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

/** Shows only the last 4 characters, for a "which key is saved" UI hint. */
export function maskSecret(plainText) {
  if (!plainText) return "";
  return `gsk_••••••••${plainText.slice(-4)}`;
}
