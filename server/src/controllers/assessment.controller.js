const prisma = require("../config/db");
const { computeScore } = require("../utils/scoring");
const { evaluateRiskAndMaybeAlert } = require("../services/riskEngine");

async function submitAssessment(req, res, next) {
  try {
    const studentId = req.user.sub;
    const { templateId, answers } = req.body;

    const template = await prisma.assessmentTemplate.findUnique({ where: { id: templateId } });
    if (!template || !template.isActive) {
      return res.status(404).json({ error: "Assessment template not found or inactive" });
    }

    // Server computes the score — client-provided scores are never trusted.
    const { totalScore, riskLevel } = computeScore(template, answers);

    const assessment = await prisma.assessment.create({
      data: {
        studentId,
        templateId,
        totalScore,
        riskLevel,
        responses: { create: answers.map((a) => ({ questionKey: a.questionKey, answerValue: a.answerValue })) },
      },
    });

    await evaluateRiskAndMaybeAlert(assessment);

    res.status(201).json({ totalScore, riskLevel, submittedAt: assessment.submittedAt });
  } catch (err) {
    next(err);
  }
}

async function myAssessments(req, res, next) {
  try {
    const studentId = req.user.sub;
    const assessments = await prisma.assessment.findMany({
      where: { studentId },
      orderBy: { submittedAt: "asc" },
      select: { id: true, totalScore: true, riskLevel: true, submittedAt: true },
    });
    res.json(assessments);
  } catch (err) {
    next(err);
  }
}

module.exports = { submitAssessment, myAssessments };
