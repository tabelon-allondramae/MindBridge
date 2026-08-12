const { z } = require("zod");

const submitAssessmentSchema = z.object({
  templateId: z.string().uuid(),
  answers: z
    .array(
      z.object({
        questionKey: z.string(),
        answerValue: z.number().int().min(0).max(5),
      })
    )
    .min(1),
});

const createJournalSchema = z.object({
  content: z.string().min(1).max(5000),
  moodTag: z.string().max(50).optional(),
});

const chatMessageSchema = z.object({
  sessionId: z.string().uuid().optional(), // omit to start a new session
  message: z.string().min(1).max(2000),
});

module.exports = { submitAssessmentSchema, createJournalSchema, chatMessageSchema };
