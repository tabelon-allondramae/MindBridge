const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { listUsers, createUser, deactivateUser, auditLog } = require("../controllers/admin.controller");

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

router.get("/users", listUsers);
router.post("/users", createUser);
router.delete("/users/:id", deactivateUser);
router.get("/audit-log", auditLog);

module.exports = router;
