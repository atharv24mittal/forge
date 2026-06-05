import json, time
from abc import ABC, abstractmethod
import redis.asyncio as aioredis

class BaseAgent(ABC):
    def __init__(self, redis: aioredis.Redis, run_id: str, name: str, role: str, color: str):
        self.redis = redis
        self.run_id = run_id
        self.name = name
        self.role = role
        self.color = color

    async def emit(self, etype: str, msg: str, data=None):
        ev = {"type": etype, "agent": self.name, "role": self.role,
              "color": self.color, "message": msg, "data": data, "ts": time.time()}
        await self.redis.rpush(f"run:{self.run_id}:events", json.dumps(ev))

    async def thinking(self, msg): await self.emit("thinking", msg)
    async def action(self, msg, data=None): await self.emit("action", msg, data)
    async def result(self, msg, data=None): await self.emit("result", msg, data)
    async def error(self, msg): await self.emit("error", msg)

    async def call_claude(self, system: str, prompt: str, max_tokens=2500) -> str:
        import os, httpx
        key = os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise ValueError("ANTHROPIC_API_KEY not set")
        async with httpx.AsyncClient(timeout=90) as c:
            r = await c.post("https://api.anthropic.com/v1/messages",
                headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={"model": "claude-sonnet-4-20250514", "max_tokens": max_tokens,
                      "system": system, "messages": [{"role": "user", "content": prompt}]})
            r.raise_for_status()
            return r.json()["content"][0]["text"]

    def parse_json(self, text: str) -> dict:
        t = text.strip()
        if t.startswith("```"):
            parts = t.split("```")
            t = parts[1]
            if t.startswith("json"): t = t[4:]
        return json.loads(t.strip())

    @abstractmethod
    async def execute(self, ctx: dict) -> dict: pass
