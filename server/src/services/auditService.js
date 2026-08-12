const prisma = require("../config/db");

async function logAction({ actorId, action, targetTable, targetId }) {
  return prisma.auditLog.create({
    data: { actorId, action, targetTable, targetId: String(targetId) },
  });
}

module.exports = { logAction };
