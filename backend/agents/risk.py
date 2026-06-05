from agents.base import BaseAgent

SYSTEM = """You are a technical risk officer making deployment go/no-go decisions.
Return ONLY valid JSON:
{
  "decision": "GO|NO_GO|GO_WITH_CONDITIONS",
  "confidence": <0-100>,
  "assessment": {
    "risk_score": <0-100>,
    "blockers": ["critical blocker"],
    "conditions": ["condition before deploy"],
    "mitigations": ["risk mitigation"],
    "deployment_risk": "low|medium|high|critical"
  },
  "pre_deploy_checklist": ["item"],
  "rollback_plan": "<string>",
  "monitoring_recommendations": ["item"]
}"""

class RiskAgent(BaseAgent):
    def __init__(self, redis, run_id):
        super().__init__(redis, run_id, "Risk", "Risk Officer", "#EF4444")

    async def pre_assess(self, ctx: dict) -> dict:
        await self.thinking("Pre-assessing deployment risk from requirements...")
        return {"pre_assessment": "running"}

    async def execute(self, ctx: dict) -> dict:
        sec = ctx.get("security", {})
        comp = ctx.get("compliance", {})
        await self.thinking("Aggregating all agent findings for final risk assessment...")
        await self.action(
            f"Evaluating: Security score {sec.get('score',0)}/100 | "
            f"Compliance score {comp.get('score',0)}/100 | Risk level: {sec.get('risk_level','unknown')}")
        try:
            raw = await self.call_claude(SYSTEM,
                f"Make go/no-go decision for: {ctx['requirement']}\n\n"
                f"Security: score={sec.get('score',0)}, risk={sec.get('risk_level','')}, "
                f"critical_findings={sum(1 for f in sec.get('findings',[]) if f.get('severity')=='critical')}\n"
                f"Compliance: score={comp.get('score',0)}\n"
                f"Code quality: {ctx.get('code',{}).get('quality_score',0)}/100")
            result = self.parse_json(raw)
            decision = result.get("decision", "GO_WITH_CONDITIONS")
            icon = "✅" if decision == "GO" else "⚠️" if "CONDITIONS" in decision else "🚫"
            await self.result(
                f"{icon} Risk Decision: {decision} | "
                f"Confidence: {result.get('confidence',0)}% | "
                f"Risk score: {result.get('assessment',{}).get('risk_score',0)}/100",
                {"decision": decision}
            )
            return result
        except Exception as e:
            await self.error(f"Risk assessment failed: {e}")
            return {"decision": "GO_WITH_CONDITIONS", "assessment": {"risk_score": 50}, "confidence": 70}
