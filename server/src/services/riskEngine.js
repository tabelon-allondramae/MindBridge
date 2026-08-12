const prisma = require("../config/db");

/**
 * Decides whether a new assessment should create a counselor alert.
 * Deliberately simple and explainable (defensible in a thesis panel):
 * - Any single "high" risk result → alert.
 * - Two consecutive "moderate" results → alert (catches a sustained dip
 *   without over-alerting on one bad day).
 */
async function evaluateRiskAndMaybeAlert(assessment) {
  if (assessment.riskLevel === "high") {
    return createAlert(assessment, "high");
  }

  if (assessment.riskLevel === "moderate") {
    const recent = await prisma.assessment.findMany({
      where: { studentId: assessment.studentId },
      orderBy: { submittedAt: "desc" },
      take: 2,
    });
    const bothModerate = recent.length === 2 && recent.every((a) => a.riskLevel === "moderate");
    if (bothModerate) return createAlert(assessment, "moderate");
  }

  return null;
}

async function createAlert(assessment, riskLevel) {
  // Avoid duplicate open alerts for the same student.
  const existingOpen = await prisma.alert.findFirst({
    where: { studentId: assessment.studentId, status: { in: ["open", "in_progress"] } },
  });
  if (existingOpen) return existingOpen;

  return prisma.alert.create({
    data: {
      studentId: assessment.studentId,
      sourceAssessmentId: assessment.id,
      riskLevel,
      status: "open",
    },
  });
}

module.exports = { evaluateRiskAndMaybeAlert };
