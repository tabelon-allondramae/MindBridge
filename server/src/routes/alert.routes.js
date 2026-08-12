const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { listAlerts, addNote, updateStatus } = require("../controllers/alert.controller");

const router = express.Router();

router.get("/", requireAuth, requireRole("counselor", "admin"), listAlerts);
router.post("/:id/notes", requireAuth, requireRole("counselor"), addNote);
router.patch("/:id/status", requireAuth, requireRole("counselor"), updateStatus);

module.exports = router;
