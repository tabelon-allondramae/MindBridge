/**
 * Usage: router.post('/auth/register', validate(registerSchema), handler)
 * Validates req.body against a Zod schema; on failure returns 400 with details.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Validation failed", details: result.error.flatten() });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
