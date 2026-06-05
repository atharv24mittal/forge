from agents.base import BaseAgent

SYSTEM = """You are a compliance and governance expert (GDPR, SOC2, ISO 27001, OWASP ASVS).
Analyze the project for regulatory compliance. Return ONLY valid JSON:
{
  "score": <0-100>,
  "report": {
    "gdpr": {"status":"compliant|partial|non-compliant","findings":["..."],"recommendations":["..."]},
    "soc2": {"controls_met":["..."],"controls_missing":["..."]},
    "data_handling": {"pii_identified":true,"storage":"...","encryption":"...","retention_policy":"..."},
    "accessibility": {"wcag_level":"A|AA|AAA|N/A","notes":"..."}
  },
  "required_policies": ["policy document needed"],
  "privacy_by_design_score": <0-10>,
  "summary": "<paragraph>"
}"""

class ComplianceAgent(BaseAgent):
    def __init__(self, redis, run_id):
        super().__init__(redis, run_id, "Compliance", "Regulatory Officer", "#FB923C")

    async def execute(self, ctx: dict) -> dict:
        await self.thinking("Evaluating codebase against GDPR, SOC2, and data governance frameworks...")
        await self.action("Scanning data flows, PII handling, consent mechanisms, and audit trails...")

        code_sample = str(ctx.get("code", {}).get("files", [])[:4])[:2000]
        arch = str(ctx.get("architecture", {}))[:1000]
        try:
            raw = await self.call_claude(SYSTEM,
                f"Check compliance for: {ctx['requirement']}\n\nArchitecture: {arch}\n\nCode sample: {code_sample}")
            result = self.parse_json(raw)
            await self.result(
                f"Compliance audit complete — Score: {result.get('score',0)}/100 | "
                f"Privacy by Design: {result.get('privacy_by_design_score',0)}/10",
                {"score": result.get("score")}
            )
            return result
        except Exception as e:
            await self.error(f"Compliance check failed: {e}")
            return {"score": 70, "report": {}, "summary": "Compliance check incomplete"}
