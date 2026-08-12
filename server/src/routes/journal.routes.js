const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { validate } = require("../middleware/validate");
const { createJournalSchema } = require("../validators/wellness.validators");
const { createEntry, myEntries } = require("../controllers/journal.controller");

const router = express.Router();

router.post("/", requireAuth, requireRole("student"), validate(createJournalSchema), createEntry);
router.get("/", requireAuth, requireRole("student"), myEntries);

module.exports = router;
