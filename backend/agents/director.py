import asyncio, json
import redis.asyncio as aioredis
from agents.base import BaseAgent
from agents.planner import PlannerAgent
from agents.architect import ArchitectAgent
from agents.developer import DeveloperAgent
from agents.security import SecurityAgent
from agents.qa import QAAgent
from agents.compliance import ComplianceAgent
from agents.risk import RiskAgent
from agents.deployment import DeploymentAgent


class ProductionDirector(BaseAgent):
    def __init__(self, redis: aioredis.Redis, run_id: str):
        super().__init__(redis, run_id, "Director", "Production Director", "#FF6B35")

    async def run(self, requirement: str, stack: str):
        await self.redis.set(f"run:{self.run_id}:status", "running")
        try:
            await self.thinking(f"Initializing FORGE autonomous factory for: \"{requirement[:80]}\"")
            await asyncio.sleep(0.2)
            await self.action("Analyzing requirement complexity and spawning agent pipeline...")

            ctx = {"requirement": requirement, "stack": stack, "run_id": self.run_id}

            # Stage 1 — Plan
            planner = PlannerAgent(self.redis, self.run_id)
            plan = await planner.execute(ctx)
            ctx["plan"] = plan

            # Stage 2 — Architecture (parallel with Risk pre-assessment)
            architect = ArchitectAgent(self.redis, self.run_id)
            risk_pre = RiskAgent(self.redis, self.run_id)
            arch_task = asyncio.create_task(architect.execute(ctx))
            risk_pre_task = asyncio.create_task(risk_pre.pre_assess(ctx))
            architecture, risk_pre_result = await asyncio.gather(arch_task, risk_pre_task)
            ctx["architecture"] = architecture
            ctx["risk_pre"] = risk_pre_result

            # Stage 3 — Code generation
            developer = DeveloperAgent(self.redis, self.run_id)
            code = await developer.execute(ctx)
            ctx["code"] = code

            # Stage 4 — Security + QA in parallel
            await self.action("Parallel execution: Security Agent ↔ QA Agent")
            security = SecurityAgent(self.redis, self.run_id)
            qa = QAAgent(self.redis, self.run_id)
            sec_task = asyncio.create_task(security.execute(ctx))
            qa_task = asyncio.create_task(qa.execute(ctx))
            security_result, qa_result = await asyncio.gather(sec_task, qa_task)
            ctx["security"] = security_result
            ctx["qa"] = qa_result

            # Stage 5 — Compliance
            compliance = ComplianceAgent(self.redis, self.run_id)
            compliance_result = await compliance.execute(ctx)
            ctx["compliance"] = compliance_result

            # Stage 6 — Risk go/no-go
            risk = RiskAgent(self.redis, self.run_id)
            risk_result = await risk.execute(ctx)
            ctx["risk"] = risk_result

            # Stage 7 — Deploy
            deploy = DeploymentAgent(self.redis, self.run_id)
            deploy_result = await deploy.execute(ctx)
            ctx["deployment"] = deploy_result

            # Build final report
            report = self._build_report(ctx)
            await self.redis.set(f"run:{self.run_id}:report", json.dumps(report))
            await self.redis.set(f"run:{self.run_id}:status", "completed")
            await self.result(
                f"🏭 FORGE complete — {len(code.get('files', []))} files generated | "
                f"Security: {security_result.get('score', 0)}/100 | "
                f"Deployed: {deploy_result.get('url', 'N/A')}"
            )

        except Exception as e:
            await self.error(f"Factory fault: {str(e)}")
            await self.redis.set(f"run:{self.run_id}:status", "failed")

    def _build_report(self, ctx: dict) -> dict:
        plan = ctx.get("plan", {})
        arch = ctx.get("architecture", {})
        code = ctx.get("code", {})
        sec = ctx.get("security", {})
        qa = ctx.get("qa", {})
        comp = ctx.get("compliance", {})
        risk = ctx.get("risk", {})
        dep = ctx.get("deployment", {})

        quality = code.get("quality_score", 80)
        security_score = sec.get("score", 75)
        compliance_score = comp.get("score", 85)
        overall = int((quality * 0.35 + security_score * 0.35 + compliance_score * 0.30))

        return {
            "requirement": ctx["requirement"],
            "project_name": plan.get("project_name", "Generated Project"),
            "scores": {
                "overall": overall,
                "quality": quality,
                "security": security_score,
                "compliance": compliance_score,
            },
            "badge": "PRODUCTION_READY" if overall >= 85 else "NEEDS_REVIEW" if overall >= 70 else "AT_RISK",
            "plan": plan,
            "architecture": arch,
            "generated_files": code.get("files", []),
            "dependencies": code.get("dependencies", []),
            "security_findings": sec.get("findings", []),
            "test_suite": qa.get("tests", []),
            "test_coverage": qa.get("coverage_estimate", "N/A"),
            "compliance_report": comp.get("report", {}),
            "risk_assessment": risk.get("assessment", {}),
            "deployment": dep,
            "audit_trail": self._build_audit(ctx),
        }

    def _build_audit(self, ctx: dict) -> list:
        entries = []
        for agent, key in [("Planner", "plan"), ("Architect", "architecture"),
                           ("Developer", "code"), ("Security", "security"),
                           ("QA", "qa"), ("Compliance", "compliance"),
                           ("Risk", "risk"), ("Deployment", "deployment")]:
            if key in ctx:
                entries.append({"agent": agent, "status": "completed",
                                 "output_keys": list(ctx[key].keys()) if isinstance(ctx[key], dict) else []})
        return entries

    async def execute(self, ctx: dict) -> dict:
        return {}
