import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { listGroups, getGroup, createGroup, joinGroup, leaveGroup, renameGroup, removeMember, deleteGroup } from "../controllers/groupController.js";

const router = express.Router();

router.use(protect);

router.get("/", listGroups);
router.get("/:id", getGroup);
router.post("/", createGroup);
router.post("/:id/join", joinGroup);
router.post("/:id/leave", leaveGroup);
router.patch("/:id/rename", renameGroup);
router.delete("/:id/members/:userId", removeMember);
router.delete("/:id", deleteGroup);

export default router;


