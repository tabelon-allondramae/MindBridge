const prisma = require("../config/db");

async function listAlerts(req, res, next) {
  try {
    const status = req.query.status || "open";
    const alerts = await prisma.alert.findMany({
      where: { status },
      orderBy: [{ riskLevel: "desc" }, { createdAt: "asc" }],
      include: { student: { include: { user: { select: { email: true } } } } },
    });
    res.json(alerts);
  } catch (err) {
    next(err);
  }
}

async function addNote(req, res, next) {
  try {
    const { id } = req.params; // alert id
    const { note } = req.body;
    if (!note || !note.trim()) return res.status(400).json({ error: "note is required" });

    const log = await prisma.interventionLog.create({
      data: { alertId: id, counselorId: req.user.sub, note },
    });
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["open", "in_progress", "resolved"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const alert = await prisma.alert.update({ where: { id }, data: { status } });
    res.json(alert);
  } catch (err) {
    next(err);
  }
}

module.exports = { listAlerts, addNote, updateStatus };
