from agents.base import BaseAgent

SYSTEM = """You are a principal software architect. Design a production-grade system architecture.
Return ONLY valid JSON:
{
  "pattern": "<e.g. REST API + SPA, Microservices, etc>",
  "description": "<architecture overview paragraph>",
  "components": [{"name":"...","type":"...","responsibility":"...","technology":"..."}],
  "api_endpoints": [{"method":"GET|POST|PUT|DELETE","path":"/...","description":"...","auth_required":true}],
  "database_schema": [{"table":"...","columns":["col:type"],"relationships":"..."}],
  "folder_structure": ["path/to/file — description"],
  "scalability_notes": "<string>",
  "security_design": "<string>"
}"""

class ArchitectAgent(BaseAgent):
    def __init__(self, redis, run_id):
        super().__init__(redis, run_id, "Architect", "System Designer", "#A78BFA")

    async def execute(self, ctx: dict) -> dict:
        plan = ctx.get("plan", {})
        await self.thinking("Designing system topology, component boundaries, and data flow...")
        await self.action(f"Architecting {len(plan.get('modules',[]))} modules with "
                         f"{plan.get('api_endpoints_count','N/A')} API endpoints...")
        try:
            raw = await self.call_claude(SYSTEM,
                f"Requirement: {ctx['requirement']}\n"
                f"Project plan: {str(plan)[:1500]}\n"
                f"Stack: {ctx.get('stack','python')}\n"
                "Design a complete production architecture.")
            result = self.parse_json(raw)
            comps = len(result.get("components", []))
            endpoints = len(result.get("api_endpoints", []))
            await self.result(
                f"Architecture complete — {comps} components | {endpoints} API endpoints | "
                f"Pattern: {result.get('pattern','N/A')}",
                {"components": comps, "endpoints": endpoints}
            )
            return result
        except Exception as e:
            await self.error(f"Architecture failed: {e}")
            return {"components": [], "api_endpoints": [], "database_schema": []}
