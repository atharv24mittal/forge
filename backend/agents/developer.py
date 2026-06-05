from agents.base import BaseAgent
import asyncio

SYSTEM = """You are an elite senior developer. Generate production-quality, working code.
Code must be complete, with proper error handling, type hints, security best practices, comments.

Return ONLY valid JSON:
{
  "files": [
    {
      "path": "relative/path/filename.ext",
      "language": "python|javascript|typescript|yaml|json|markdown",
      "description": "what this file does",
      "content": "FULL file content here, no truncation"
    }
  ],
  "dependencies": ["package==version"],
  "setup_instructions": "step by step setup",
  "env_vars": ["VAR_NAME=description"],
  "quality_score": <70-100>
}

Generate at minimum: main app file, models/schema, API routes, auth module, config, README."""

class DeveloperAgent(BaseAgent):
    def __init__(self, redis, run_id):
        super().__init__(redis, run_id, "Developer", "Code Generator", "#34D399")

    async def execute(self, ctx: dict) -> dict:
        plan = ctx.get("plan", {})
        arch = ctx.get("architecture", {})
        stack = ctx.get("stack", "python")

        await self.thinking("Initializing code generation pipeline — translating architecture to implementation...")
        await self.action(f"Generating production {stack.upper()} codebase for "
                         f"\"{plan.get('project_name','project')}\"...")

        folder_structure = arch.get("folder_structure", [])
        endpoints = arch.get("api_endpoints", [])
        schema = arch.get("database_schema", [])

        prompt = f"""Generate complete, production-quality code for this project.

Project: {plan.get('project_name', ctx['requirement'][:50])}
Requirement: {ctx['requirement']}
Stack: {stack} (use FastAPI + SQLAlchemy + Alembic if python, Express + Prisma if node)

Architecture:
Pattern: {arch.get('pattern', '')}
Components: {str(arch.get('components', []))[:800]}
API Endpoints: {str(endpoints[:8])[:800]}
DB Schema: {str(schema[:4])[:600]}
Folder structure: {str(folder_structure[:12])[:600]}

Tech Stack: {str(plan.get('tech_stack', {}))[:300]}

Generate complete working code. Include:
1. Main application entry point
2. All API route handlers (with request/response models)
3. Database models with relationships
4. Authentication middleware (JWT)
5. Configuration/settings module
6. Docker compose file
7. README with setup instructions

Make the code genuinely impressive and production-ready."""

        try:
            raw = await self.call_claude(SYSTEM, prompt, max_tokens=4000)
            result = self.parse_json(raw)
            files = result.get("files", [])

            # Announce each file as it "generates"
            for f in files[:6]:
                await self.action(f"✍ Writing {f['path']} ({f.get('language','').upper()})")
                await asyncio.sleep(0.3)

            await self.result(
                f"Codebase generated — {len(files)} files | "
                f"Quality score: {result.get('quality_score', 85)}/100 | "
                f"{len(result.get('dependencies', []))} dependencies",
                {"file_count": len(files), "quality_score": result.get("quality_score", 85)}
            )
            return result
        except Exception as e:
            await self.error(f"Code generation failed: {e}")
            return {"files": [], "dependencies": [], "quality_score": 0}
