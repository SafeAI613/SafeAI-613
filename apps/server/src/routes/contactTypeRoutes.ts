import { Router } from "express";
import {
  getContactTypes,
  getAllContactTypesAdmin,
  createContactType,
  updateContactType,
  deleteContactType,
} from "../controllers/contactTypeController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

// GET / - active types only, used by the contact form dropdown (any authenticated user)
router.get("/", authenticateToken, getContactTypes);

// GET /all - all types including inactive ones, for the admin management screen
router.get("/all", authenticateToken, requireAdmin, getAllContactTypesAdmin);

router.post("/", authenticateToken, requireAdmin, createContactType);
router.put("/:id", authenticateToken, requireAdmin, updateContactType);
router.delete("/:id", authenticateToken, requireAdmin, deleteContactType);

export default router;
