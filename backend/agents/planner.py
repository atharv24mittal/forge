from agents.base import BaseAgent

SYSTEM = """You are a senior product manager and technical lead.
Break down a business requirement into a structured project plan.
Return ONLY valid JSON:
{
  "project_name": "<short name>",
  "tagline": "<one line>",
  "user_stories": [{"id":"US-1","title":"...","description":"...","priority":"high|medium|low"}],
  "tech_stack": {"language":"...","framework":"...","database":"...","auth":"...","deployment":"..."},
  "modules": ["<module name>"],
  "api_endpoints_count": <int>,
  "estimated_complexity": "low|medium|high",
  "timeline_estimate": "<X weeks>",
  "key_challenges": ["<challenge>"]
}"""

class PlannerAgent(BaseAgent):
    def __init__(self, redis, run_id):
        super().__init__(redis, run_id, "Planner", "Requirements Analyst", "#38BDF8")

    async def execute(self, ctx: dict) -> dict:
        req = ctx["requirement"]
        await self.thinking(f"Decomposing requirement into epics, user stories, and technical tasks...")
        await self.action("Identifying system boundaries, actors, and core workflows...")
        try:
            raw = await self.call_claude(SYSTEM,
                f"Create a detailed project plan for: {req}\nPreferred stack: {ctx.get('stack','python')}")
            result = self.parse_json(raw)
            stories = len(result.get("user_stories", []))
            modules = len(result.get("modules", []))
            await self.result(
                f"Plan ready — {stories} user stories | {modules} modules | "
                f"Complexity: {result.get('estimated_complexity','N/A')} | "
                f"ETA: {result.get('timeline_estimate','N/A')}",
                {"project_name": result.get("project_name"), "stories": stories}
            )
            return result
        except Exception as e:
            await self.error(f"Planning failed: {e}")
            return {"project_name": "Generated Project", "user_stories": [], "modules": [], "tech_stack": {}}
