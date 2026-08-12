const prisma = require("../config/db");
const { encryptField, decryptField } = require("../utils/encryption");

async function createEntry(req, res, next) {
  try {
    const studentId = req.user.sub;
    const { content, moodTag } = req.body;

    const entry = await prisma.journalEntry.create({
      data: { studentId, contentEncrypted: encryptField(content), moodTag },
    });

    res.status(201).json({ id: entry.id, moodTag: entry.moodTag, createdAt: entry.createdAt });
  } catch (err) {
    next(err);
  }
}

async function myEntries(req, res, next) {
  try {
    const studentId = req.user.sub;
    const entries = await prisma.journalEntry.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });

    const decrypted = entries.map((e) => ({
      id: e.id,
      content: decryptField(e.contentEncrypted),
      moodTag: e.moodTag,
      createdAt: e.createdAt,
    }));

    res.json(decrypted);
  } catch (err) {
    next(err);
  }
}

module.exports = { createEntry, myEntries };
