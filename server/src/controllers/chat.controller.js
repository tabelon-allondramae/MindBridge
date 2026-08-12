const prisma = require("../config/db");
const { getChatResponse } = require("../services/aiService");

const MEMORY_WINDOW = 10; // last N messages sent as context — session-scoped only

async function sendMessage(req, res, next) {
  try {
    const studentId = req.user.sub;
    let { sessionId, message } = req.body;

    let session = sessionId
      ? await prisma.chatSession.findFirst({ where: { id: sessionId, studentId } })
      : null;

    if (!session) {
      session = await prisma.chatSession.create({ data: { studentId } });
    }

    const recent = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "desc" },
      take: MEMORY_WINDOW,
    });
    const history = recent
      .reverse()
      .map((m) => ({ role: m.sender === "student" ? "user" : "assistant", content: m.content }));

    await prisma.chatMessage.create({
      data: { sessionId: session.id, sender: "student", content: message },
    });

    const { content, flagged } = await getChatResponse(history, message);

    const aiMessage = await prisma.chatMessage.create({
      data: { sessionId: session.id, sender: "ai", content, flagged },
    });

    res.status(201).json({
      sessionId: session.id,
      reply: content,
      flagged,
      createdAt: aiMessage.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { sendMessage };
