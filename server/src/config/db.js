const { PrismaClient } = require("@prisma/client");

// Reuse a single instance across the app (avoids exhausting DB connections
// during dev hot-reload).
const prisma = global.__mindbridge_prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.__mindbridge_prisma = prisma;

module.exports = prisma;
