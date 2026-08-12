const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

function issueTokens(user) {
  const payload = { sub: user.id, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });
  return { accessToken, refreshToken };
}

async function register(req, res, next) {
  try {
    const { email, password, role, schoolId, program, yearLevel } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "An account with this email already exists" });

    if (role === "student" && (!schoolId || !program || !yearLevel)) {
      return res.status(400).json({ error: "schoolId, program, and yearLevel are required for student accounts" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        ...(role === "student" && {
          student: { create: { schoolId, program, yearLevel, consentAiData: false } },
        }),
      },
    });

    const tokens = issueTokens(user);
    res.status(201).json({ user: { id: user.id, email: user.email, role: user.role }, ...tokens });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    const tokens = issueTokens(user);
    res.json({ user: { id: user.id, email: user.email, role: user.role }, ...tokens });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "refreshToken is required" });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: "Invalid refresh token" });

    const tokens = issueTokens(user);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}

module.exports = { register, login, refresh };
