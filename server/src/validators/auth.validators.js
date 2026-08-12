const { z } = require("zod");

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["student", "counselor", "admin"]),
  // Student-only fields (optional at the schema level, enforced in controller)
  schoolId: z.string().optional(),
  program: z.string().optional(),
  yearLevel: z.number().int().min(1).max(6).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

module.exports = { registerSchema, loginSchema };
