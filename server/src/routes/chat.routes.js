const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { validate } = require("../middleware/validate");
const { chatMessageSchema } = require("../validators/wellness.validators");
const { sendMessage } = require("../controllers/chat.controller");

const router = express.Router();

// Prevent runaway AI API costs from a single account.
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 15 });

router.post("/message", requireAuth, requireRole("student"), chatLimiter, validate(chatMessageSchema), sendMessage);

module.exports = router;
