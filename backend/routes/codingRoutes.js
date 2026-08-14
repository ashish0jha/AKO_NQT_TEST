import { Router } from "express";
import { requireAuth, requireGroqKey } from "../middleware/auth.js";
import { getCodingProblem, runPublicTests, submitCoding } from "../controllers/codingController.js";

const router = Router();
router.use(requireAuth);

router.get("/:id/section/:key", requireGroqKey, getCodingProblem);
router.post("/:id/section/:key/run", runPublicTests);
router.post("/:id/section/:key/submit", submitCoding);

export default router;
