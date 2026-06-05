import re
from agents.base import BaseAgent

SYSTEM = """You are a senior application security engineer (OWASP, SANS Top 25, CWE).
Analyze generated code for vulnerabilities. Return ONLY valid JSON:
{
  "score": <0-100>,
  "risk_level": "critical|high|medium|low",
  "findings": [
    {
      "id": "SEC-001",
      "owasp": "A01:2021 Broken Access Control",
      "cwe": "CWE-284",
      "severity": "critical|high|medium|low",
      "title": "...",
      "description": "...",
      "file": "...",
      "line_hint": "...",
      "remediation": "...",
      "effort": "low|medium|high"
    }
  ],
  "secrets_exposed": [],
  "positive_controls": ["security control implemented"],
  "attack_surface": "<summary>",
  "hardening_checklist": ["item"]
}"""

SECRET_RE = {
    "AWS_KEY": r"AKIA[0-9A-Z]{16}",
    "PRIVATE_KEY": r"-----BEGIN.*PRIVATE KEY-----",
    "DB_URL_WITH_CREDS": r"(?i)(postgres|mysql|mongodb)://[^:]+:[^@]+@",
    "HARDCODED_SECRET": r'(?i)(secret_key|password|passwd)\s*=\s*["\'][^"\']{8,}["\']',
}

class SecurityAgent(BaseAgent):
    def __init__(self, redis, run_id):
        super().__init__(redis, run_id, "Security", "Threat Hunter", "#F472B6")

    async def execute(self, ctx: dict) -> dict:
        files = ctx.get("code", {}).get("files", [])
        await self.thinking("Initiating OWASP Top 10 vulnerability scan on generated codebase...")

        # Local secret scan
        secrets = []
        for f in files:
            content = f.get("content", "")
            for stype, pattern in SECRET_RE.items():
                if re.search(pattern, content):
                    secrets.append({"type": stype, "file": f["path"]})

        if secrets:
            await self.action(f"⚠️  Secret scanner: {len(secrets)} hardcoded credential(s) detected!")
        else:
            await self.action("Secret scanner: ✓ No hardcoded credentials found")

        await self.action("Running OWASP Top 10 analysis: injection, broken auth, exposure, IDOR...")

        code_summary = "\n\n".join([
            f"### {f['path']}\n```{f.get('language','')}\n{f.get('content','')[:2000]}\n```"
            for f in files[:8]
        ])

        try:
            raw = await self.call_claude(SYSTEM,
                f"Security audit this generated codebase:\n\n{code_summary}\n\n"
                f"Secrets already found by scanner: {secrets}\n"
                "Produce a complete OWASP-aligned security report.")
            result = self.parse_json(raw)
            if secrets:
                result.setdefault("secrets_exposed", []).extend(secrets)

            critical = sum(1 for f in result.get("findings",[]) if f.get("severity") == "critical")
            await self.result(
                f"Security scan complete — Score: {result.get('score',0)}/100 | "
                f"Risk: {result.get('risk_level','N/A').upper()} | "
                f"{critical} critical | {len(result.get('findings',[]))} total findings",
                {"score": result.get("score"), "critical": critical}
            )
            return result
        except Exception as e:
            await self.error(f"Security scan failed: {e}")
            return {"score": 60, "risk_level": "medium", "findings": [], "secrets_exposed": secrets}
