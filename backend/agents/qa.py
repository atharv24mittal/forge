from agents.base import BaseAgent

SYSTEM = """You are a senior QA engineer and test architect.
Generate a comprehensive test suite for the provided code. Return ONLY valid JSON:
{
  "tests": [
    {
      "file": "tests/test_filename.py",
      "type": "unit|integration|e2e",
      "framework": "pytest|jest|etc",
      "description": "what this tests",
      "content": "FULL test file content"
    }
  ],
  "coverage_estimate": "<X%>",
  "test_strategy": "<paragraph>",
  "ci_config": "full .github/workflows/test.yml content",
  "edge_cases_covered": ["case"],
  "missing_coverage": ["area"]
}"""

class QAAgent(BaseAgent):
    def __init__(self, redis, run_id):
        super().__init__(redis, run_id, "QA", "Test Engineer", "#FBBF24")

    async def execute(self, ctx: dict) -> dict:
        files = ctx.get("code", {}).get("files", [])
        plan = ctx.get("plan", {})
        await self.thinking("Analyzing code paths and generating comprehensive test coverage strategy...")
        await self.action(f"Writing unit tests, integration tests, and CI pipeline for "
                         f"{len(files)} source files...")

        code_summary = "\n\n".join([
            f"### {f['path']}\n```\n{f.get('content','')[:1800]}\n```"
            for f in files[:6]
        ])

        try:
            raw = await self.call_claude(SYSTEM,
                f"Generate tests for this codebase:\n\nProject: {plan.get('project_name','')}\n\n{code_summary}")
            result = self.parse_json(raw)
            ntests = len(result.get("tests", []))
            await self.result(
                f"Test suite ready — {ntests} test files | "
                f"Coverage estimate: {result.get('coverage_estimate','N/A')} | "
                f"CI pipeline included",
                {"test_count": ntests, "coverage": result.get("coverage_estimate")}
            )
            return result
        except Exception as e:
            await self.error(f"QA generation failed: {e}")
            return {"tests": [], "coverage_estimate": "N/A", "test_strategy": ""}
