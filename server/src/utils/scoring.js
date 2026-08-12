/**
 * Computes an assessment score from raw answers using the template's
 * scoring rules. This MUST run server-side only — never accept a
 * pre-computed score from the client.
 *
 * template.scoringRules example (WHO-5 style):
 * { multiplier: 4, thresholds: { high: 28, moderate: 50 } }
 *
 * answers: [{ questionKey, answerValue }]
 */
function computeScore(template, answers) {
  const rawSum = answers.reduce((sum, a) => sum + Number(a.answerValue), 0);
  const totalScore = rawSum * template.scoringRules.multiplier;
  const riskLevel = computeRiskLevel(totalScore, template.scoringRules.thresholds);
  return { totalScore, riskLevel };
}

function computeRiskLevel(totalScore, thresholds) {
  if (totalScore < thresholds.high) return "high";
  if (totalScore < thresholds.moderate) return "moderate";
  return "low";
}

module.exports = { computeScore, computeRiskLevel };
