import asyncio, uuid, json, os
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import redis.asyncio as aioredis
from contextlib import asynccontextmanager
from agents.director import ProductionDirector

redis_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_client = aioredis.from_url(redis_url, decode_responses=True)
    yield
    await redis_client.close()

app = FastAPI(title="FORGE API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class BuildRequest(BaseModel):
    requirement: str
    stack: str = "python"  # python | node

@app.post("/api/build")
async def start_build(req: BuildRequest, bg: BackgroundTasks):
    run_id = str(uuid.uuid4())
    await redis_client.set(f"run:{run_id}:status", "queued")
    await redis_client.set(f"run:{run_id}:requirement", req.requirement)
    bg.add_task(run_factory, run_id, req.requirement, req.stack)
    return {"run_id": run_id, "status": "queued"}

@app.get("/api/result/{run_id}")
async def get_result(run_id: str):
    status = await redis_client.get(f"run:{run_id}:status")
    if not status:
        raise HTTPException(404, "Run not found")
    events_raw = await redis_client.lrange(f"run:{run_id}:events", 0, -1)
    report_raw = await redis_client.get(f"run:{run_id}:report")
    return {
        "run_id": run_id,
        "status": status,
        "events": [json.loads(e) for e in events_raw],
        "report": json.loads(report_raw) if report_raw else None
    }

@app.get("/api/stream/{run_id}")
async def stream_events(run_id: str):
    async def generator():
        idx = 0
        while True:
            status = await redis_client.get(f"run:{run_id}:status")
            new_events = await redis_client.lrange(f"run:{run_id}:events", idx, -1)
            for e in new_events:
                yield f"data: {e}\n\n"
                idx += 1
            if status in ("completed", "failed"):
                report_raw = await redis_client.get(f"run:{run_id}:report")
                if report_raw:
                    yield f"data: {json.dumps({'type':'report','data':json.loads(report_raw)})}\n\n"
                yield f"data: {json.dumps({'type':'done','status':status})}\n\n"
                break
            await asyncio.sleep(0.4)
    return StreamingResponse(generator(), media_type="text/event-stream")

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "FORGE"}

async def run_factory(run_id: str, requirement: str, stack: str):
    director = ProductionDirector(redis_client, run_id)
    await director.run(requirement, stack)
