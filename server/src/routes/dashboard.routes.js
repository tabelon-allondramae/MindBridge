const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { summary, studentProfile } = require("../controllers/dashboard.controller");

const router = express.Router();

router.get("/summary", requireAuth, requireRole("counselor", "admin"), summary);
router.get("/students/:id", requireAuth, requireRole("counselor", "admin"), studentProfile);

module.exports = router;
