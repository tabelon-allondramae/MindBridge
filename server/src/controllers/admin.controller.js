const bcrypt = require("bcrypt");
const prisma = require("../config/db");
const { logAction } = require("../services/auditService");

async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { email, password, role } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { email, passwordHash, role } });
    await logAction({ actorId: req.user.sub, action: "create_user", targetTable: "users", targetId: user.id });
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    next(err);
  }
}

async function deactivateUser(req, res, next) {
  try {
    const { id } = req.params;
    // Soft-delete pattern would need a `status` column; deleting outright
    // here for simplicity — add a status field before using in production
    // so historical records (assessments, logs) aren't orphaned.
    await prisma.user.delete({ where: { id } });
    await logAction({ actorId: req.user.sub, action: "delete_user", targetTable: "users", targetId: id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function auditLog(req, res, next) {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { actor: { select: { email: true, role: true } } },
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, createUser, deactivateUser, auditLog };
