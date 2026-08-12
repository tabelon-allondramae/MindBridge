const prisma = require("../config/db");
const { logAction } = require("../services/auditService");

async function summary(req, res, next) {
  try {
    const [totalStudents, openAlerts, riskCounts] = await Promise.all([
      prisma.student.count(),
      prisma.alert.count({ where: { status: "open" } }),
      prisma.assessment.groupBy({
        by: ["riskLevel"],
        _count: true,
        // naive "latest per student" is better done with a raw query in
        // production; kept simple here for thesis-scale data volumes
      }),
    ]);

    res.json({ totalStudents, openAlerts, riskCounts });
  } catch (err) {
    next(err);
  }
}

async function studentProfile(req, res, next) {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { userId: id },
      include: {
        user: { select: { email: true } },
        assessments: { orderBy: { submittedAt: "asc" } },
        alerts: { orderBy: { createdAt: "desc" }, include: { interventionLogs: true } },
      },
    });

    if (!student) return res.status(404).json({ error: "Student not found" });

    // Every counselor view of a student's sensitive record is logged.
    await logAction({ actorId: req.user.sub, action: "view_profile", targetTable: "students", targetId: id });

    res.json(student);
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, studentProfile };
