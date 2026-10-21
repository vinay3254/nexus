from __future__ import annotations
import asyncio
from contextlib import asynccontextmanager
import json
from pathlib import Path
from typing import Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field
from nexus.app_store import AppStore
from nexus.app_store.catalog import Catalog, AgentDefinition, default_catalog_path
from nexus.blackboard import Blackboard
from nexus.llm import LlmClient, create_llm_client
from nexus.agents import CodingAgent, ResearchAgent, DataAgent, OpsAgent, Agent
from nexus.router import TaskPlanner, RouterSupervisor
from nexus.trust import SandboxRunner, SelfHealer, ReceiptSigner


class RunTaskRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    task: str = Field(min_length=1, max_length=20000)
    agent_id: str | None = None


class AgentStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    enabled: bool


class ConnectionManager:
    def __init__(self):
        self.active_connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict[str, Any]):
        msg_str = json.dumps(message)
        dead = []
        for conn in tuple(self.active_connections):
            try:
                await conn.send_text(msg_str)
            except Exception:
                dead.append(conn)
        for d in dead:
            self.active_connections.discard(d)


def create_app(
    app_store: AppStore | None = None,
    blackboard: Blackboard | None = None,
    llm: LlmClient | None = None,
    agents: dict[str, Agent] | None = None,
    catalog_path: str | Path | None = None,
) -> FastAPI:
    manager = ConnectionManager()

    # Default dependencies
    llm_client = llm or create_llm_client()
    is_custom_store = app_store is not None
    store = app_store or AppStore()
    bb = blackboard or Blackboard()

    if agents is None:
        agent_dict: dict[str, Agent] = {
            "coding-agent": CodingAgent(llm_client),
            "research-agent": ResearchAgent(llm_client),
            "data-agent": DataAgent(llm_client),
            "ops-agent": OpsAgent(llm_client),
        }
        if not is_custom_store:
            for a in agent_dict.values():
                store.register(a.manifest())
    else:
        agent_dict = agents

    catalog = Catalog(
        Path(catalog_path) if catalog_path is not None else default_catalog_path(),
        store, agent_dict, llm_client,
    )
    running: set[asyncio.Task] = set()

    @asynccontextmanager
    async def lifespan(app_inst: FastAPI):
        async def blackboard_listener():
            rx = bb.subscribe()
            while True:
                try:
                    event = await rx.get()
                    await manager.broadcast({
                        "type": "blackboard_update",
                        "key": event.entry.key,
                        "author": event.entry.author,
                        "version": event.entry.version,
                        "value": event.entry.value,
                    })
                except asyncio.CancelledError:
                    break
                except Exception:
                    pass

        task = asyncio.create_task(blackboard_listener())
        try:
            yield
        finally:
            executions = tuple(running)
            task.cancel()
            for execution in executions:
                execution.cancel()
            await asyncio.gather(task, *executions, return_exceptions=True)

    app = FastAPI(title="Nexus Hub Daemon", lifespan=lifespan)

    static_dir = Path(__file__).parent / "static"
    frontend_index = static_dir / "index.html"
    frontend_assets = static_dir / "assets"

    if frontend_assets.is_dir():
        app.mount("/assets", StaticFiles(directory=str(frontend_assets)), name="frontend-assets")

    @app.get("/health")
    async def health_check():
        return {"status": "ok", "version": "1.0.0"}

    @app.get("/", response_class=HTMLResponse)
    @app.get("/dashboard", response_class=HTMLResponse)
    @app.get("/min", response_class=HTMLResponse)
    @app.get("/next", response_class=HTMLResponse)
    @app.get("/workspace", response_class=HTMLResponse)
    @app.get("/store", response_class=HTMLResponse)
    @app.get("/installed", response_class=HTMLResponse)
    @app.get("/agents", response_class=HTMLResponse)
    @app.get("/executions", response_class=HTMLResponse)
    @app.get("/blackboard", response_class=HTMLResponse)
    @app.get("/execution-inspector", response_class=HTMLResponse)
    @app.get("/trust", response_class=HTMLResponse)
    @app.get("/runtime", response_class=HTMLResponse)
    async def get_index():
        if frontend_index.exists():
            return HTMLResponse(content=frontend_index.read_text(encoding="utf-8"))
        return HTMLResponse(
            content="<h1>Nexus frontend is not built</h1><p>Run npm ci and npm run build in frontend/.</p>",
            status_code=503,
        )

    @app.get("/api/agents")
    async def get_agents():
        return [manifest.model_dump() for manifest in store.list()]

    @app.get("/api/store")
    async def list_catalog():
        return catalog.list()

    def catalog_call(operation, *args):
        try:
            return operation(*args)
        except KeyError as error:
            raise HTTPException(404, str(error.args[0])) from error
        except ValueError as error:
            raise HTTPException(409, str(error)) from error

    def require_idle():
        if running:
            raise HTTPException(409, "An execution is active. Wait before changing installed agents.")

    @app.get("/api/store/{agent_id}")
    async def get_listing(agent_id: str):
        return catalog_call(catalog.get, agent_id)

    @app.post("/api/store", status_code=201)
    async def publish_agent(definition: AgentDefinition):
        result = catalog_call(catalog.publish, definition)
        await manager.broadcast({"type": "catalog_changed"})
        return result

    async def change_agent(agent_id: str, action: str):
        require_idle()
        result = catalog_call(catalog.change, agent_id, action)
        await manager.broadcast({"type": "catalog_changed"})
        return result

    @app.post("/api/store/{agent_id}/install")
    async def install_agent(agent_id: str):
        return await change_agent(agent_id, "install")

    @app.post("/api/store/{agent_id}/update")
    async def update_agent(agent_id: str):
        return await change_agent(agent_id, "update")

    @app.patch("/api/store/{agent_id}")
    async def set_agent_enabled(agent_id: str, req: AgentStatusRequest):
        return await change_agent(agent_id, "enable" if req.enabled else "disable")

    @app.delete("/api/store/{agent_id}/install")
    async def uninstall_agent(agent_id: str):
        return await change_agent(agent_id, "uninstall")

    @app.get("/api/blackboard")
    async def get_blackboard():
        entries = await bb.list_all()
        return [
            {
                "key": e.key,
                "value": e.value,
                "author": e.author,
                "version": e.version,
                "timestamp": e.timestamp.isoformat(),
            }
            for e in entries
        ]

    async def _execute_task_pipeline(task_text: str, agent_id: str | None = None):
        await manager.broadcast({"type": "log", "message": f"🚀 Decomposing task: '{task_text}'"})
        planner = TaskPlanner()
        subtasks = planner.decompose(task_text)
        if agent_id:
            from nexus.router.planner import Subtask
            subtasks = [Subtask(id="subtask-selected", description=task_text)]
            selected_store = AppStore()
            selected_store.register(agent_dict[agent_id].manifest())
            supervisor = RouterSupervisor(selected_store)
        else:
            supervisor = RouterSupervisor(store)
        sandbox = SandboxRunner()
        healer = SelfHealer(sandbox=sandbox, llm=llm_client)

        results = []

        for st in subtasks:
            worker_id = supervisor.select_worker(st)
            await manager.broadcast({
                "type": "log",
                "message": f"⚡ Routed subtask [{st.id}] to {worker_id}",
            })

            output = await supervisor.execute_subtask(st, agent_dict, bb)

            if output.is_code:
                await manager.broadcast({
                    "type": "sandbox_event",
                    "message": f"Executing code generated by {worker_id} in Bubblewrap container...",
                    "code": output.result,
                })
                try:
                    verified_code = await healer.execute_with_healing(output.result, max_retries=2)
                    if verified_code.strip() != output.result.strip():
                        await manager.broadcast({
                            "type": "sandbox_event",
                            "message": f"Self-healing repaired code for [{st.id}]",
                            "code": output.result,
                            "healed_code": verified_code,
                            "status": "repaired",
                        })
                    await manager.broadcast({
                        "type": "log",
                        "message": f"✅ Sandbox execution and self-healing passed for [{st.id}]",
                    })
                    results.append(verified_code)
                except Exception as e:
                    await manager.broadcast({
                        "type": "sandbox_event",
                        "message": f"Sandbox error on [{st.id}]: {e}",
                        "code": output.result,
                        "stderr": str(e),
                        "status": "error",
                    })
                    await manager.broadcast({
                        "type": "log",
                        "message": f"⚠️ Sandbox error on [{st.id}]: {e}",
                    })
                    results.append(output.result)
            else:
                results.append(output.result)

        merged = "\n".join(results)
        signer = ReceiptSigner.generate()
        receipt = signer.sign("nexus-task", merged)

        await manager.broadcast({
            "type": "receipt",
            "task_id": receipt.task_id,
            "signature": receipt.signature,
            "payload_digest": receipt.payload_digest,
            "timestamp": receipt.timestamp,
        })
        await manager.broadcast({"type": "log", "message": "✨ Task completed successfully."})

    async def execute_safely(req: RunTaskRequest):
        try:
            await _execute_task_pipeline(req.task, req.agent_id)
        except asyncio.CancelledError:
            raise
        except Exception as error:
            await manager.broadcast({"type": "log", "message": f"Task failed: {error}"})

    def schedule(req: RunTaskRequest):
        require_idle()
        if req.agent_id and (store.get(req.agent_id) is None or req.agent_id not in agent_dict):
            raise HTTPException(409, "Selected agent is not installed and enabled.")
        if not any(agent_id in agent_dict for agent_id in [a.id for a in store.list()]):
            raise HTTPException(409, "Install and enable an agent before running a task.")
        execution = asyncio.create_task(execute_safely(req))
        running.add(execution)
        execution.add_done_callback(running.discard)

    @app.post("/api/run")
    async def run_task(req: RunTaskRequest):
        schedule(req)
        return {"status": "dispatched", "task": req.task, "agent_id": req.agent_id}

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await manager.connect(websocket)
        try:
            while True:
                data_text = await websocket.receive_text()
                try:
                    payload = json.loads(data_text)
                    if payload.get("action") == "run_task":
                        task = payload.get("task", "")
                        if task:
                            schedule(RunTaskRequest(task=task, agent_id=payload.get("agent_id")))
                except Exception as error:
                    await websocket.send_json({"type": "log", "message": f"Task failed: {error}"})
        except WebSocketDisconnect:
            manager.disconnect(websocket)

    return app
