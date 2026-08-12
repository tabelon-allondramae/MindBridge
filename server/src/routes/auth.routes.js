const express = require("express");
const rateLimit = require("express-rate-limit");
const { validate } = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../validators/auth.validators");
const { register, login, refresh } = require("../controllers/auth.controller");

const router = express.Router();

// Auth endpoints get their own tighter rate limit (brute-force protection).
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", authLimiter, refresh);

module.exports = router;
