import { Router } from "express";
import { register, login, me, saveGroqKey, deleteGroqKey, groqKeyStatus } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, me);
router.get("/groq-key", requireAuth, groqKeyStatus);
router.put("/groq-key", requireAuth, saveGroqKey);
router.delete("/groq-key", requireAuth, deleteGroqKey);

export default router;
