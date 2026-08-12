const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { validate } = require("../middleware/validate");
const { submitAssessmentSchema } = require("../validators/wellness.validators");
const { submitAssessment, myAssessments } = require("../controllers/assessment.controller");

const router = express.Router();

router.post("/", requireAuth, requireRole("student"), validate(submitAssessmentSchema), submitAssessment);
router.get("/me", requireAuth, requireRole("student"), myAssessments);

module.exports = router;
