import { Router } from "express";
import { requireAuth, requireGroqKey } from "../middleware/auth.js";
import {
  startAttempt,
  getSection,
  submitSection,
  completeAttempt,
  abandonAttempt,
  reportError,
  saveProgress,
  getAttempt,
  listAttempts,
} from "../controllers/testController.js";

const router = Router();
router.use(requireAuth);

router.post("/start", startAttempt);
router.get("/", listAttempts);
router.get("/:id", getAttempt);
router.get("/:id/section/:key", requireGroqKey, getSection);
router.post("/:id/section/:key/submit", requireGroqKey, submitSection);
router.post("/:id/complete", completeAttempt);
router.post("/:id/abandon", abandonAttempt);
router.post("/:id/report-error", reportError);
router.post("/:id/progress", saveProgress);

export default router;
