import pytest
from httpx import AsyncClient, ASGITransport
from nexus.server.app import create_app
from nexus.llm.mock import MockLlmClient


DEFINITION = {
    "id": "review-agent", "name": "Code Reviewer", "description": "Reviews code for clear, actionable issues.",
    "publisher": "My workspace", "version": "1.0.0", "category": "Development",
    "capabilities": ["review", "code"], "system_prompt": "Review code with concrete evidence.",
    "sample_task": "Review this Python function", "timeout_secs": 30,
}


def client_for(path):
    app = create_app(llm=MockLlmClient(), catalog_path=path)
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.mark.asyncio
async def test_publish_install_update_pinning_disable_uninstall_and_restart(tmp_path):
    path = tmp_path / "store.sqlite3"
    async with client_for(path) as client:
        initial = (await client.get("/api/store")).json()
        assert len(initial) == 4
        assert all(a["installed"] and a["enabled"] for a in initial)
        published = await client.post("/api/store", json=DEFINITION)
        assert published.status_code == 201
        assert not published.json()["installed"]
        assert (await client.post("/api/run", json={"task": "Review", "agent_id": "review-agent"})).status_code == 409
        installed = await client.post("/api/store/review-agent/install")
        assert installed.status_code == 200
        assert installed.json()["installed_version"] == "1.0.0"
        assert "review-agent" in [a["id"] for a in (await client.get("/api/agents")).json()]
        update = {**DEFINITION, "version": "1.1.0", "system_prompt": "New instructions", "capabilities": ["audit"]}
        assert (await client.post("/api/store", json=update)).status_code == 201
        detail = (await client.get("/api/store/review-agent")).json()
        assert detail["update_available"] and detail["installed_version"] == "1.0.0"
        active = next(a for a in (await client.get("/api/agents")).json() if a["id"] == "review-agent")
        assert active["capabilities"] == ["review", "code"]
    async with client_for(path) as client:
        assert (await client.get("/api/store/review-agent")).json()["installed_version"] == "1.0.0"
        assert (await client.post("/api/store/review-agent/update")).json()["installed_version"] == "1.1.0"
        disabled = await client.patch("/api/store/review-agent", json={"enabled": False})
        assert not disabled.json()["enabled"]
        assert "review-agent" not in [a["id"] for a in (await client.get("/api/agents")).json()]
        assert (await client.patch("/api/store/review-agent", json={"enabled": True})).json()["enabled"]
        assert not (await client.delete("/api/store/review-agent/install")).json()["installed"]
    async with client_for(path) as client:
        assert not (await client.get("/api/store/review-agent")).json()["installed"]


@pytest.mark.asyncio
async def test_validation_and_builtin_protection(tmp_path):
    async with client_for(tmp_path / "store.sqlite3") as client:
        assert (await client.post("/api/store", json={**DEFINITION, "id": "coding-agent"})).status_code == 409
        for field, value in [("id", "../escape"), ("version", "latest"), ("capabilities", []),
                             ("system_prompt", " "), ("timeout_secs", -1), ("verified", True)]:
            assert (await client.post("/api/store", json={**DEFINITION, field: value})).status_code == 422
        assert (await client.post("/api/store", json=DEFINITION)).status_code == 201
        assert (await client.post("/api/store", json=DEFINITION)).status_code == 409
        assert (await client.post("/api/store", json={**DEFINITION, "version": "0.9.0"})).status_code == 409
        assert (await client.get("/api/store/missing")).status_code == 404
        assert (await client.patch("/api/store/review-agent", json={"enabled": True})).status_code == 409


@pytest.mark.asyncio
async def test_builtin_uninstall_survives_restart(tmp_path):
    path = tmp_path / "store.sqlite3"
    async with client_for(path) as client:
        assert (await client.delete("/api/store/coding-agent/install")).status_code == 200
    async with client_for(path) as client:
        assert not (await client.get("/api/store/coding-agent")).json()["installed"]
        assert "coding-agent" not in [a["id"] for a in (await client.get("/api/agents")).json()]


@pytest.mark.asyncio
async def test_targeted_execution_uses_installed_instructions_and_locks_lifecycle(tmp_path):
    import asyncio
    from nexus.blackboard import Blackboard

    started, release = asyncio.Event(), asyncio.Event()

    class RecordingLlm(MockLlmClient):
        async def complete(self, prompt, system=None):
            self.seen = (prompt, system)
            started.set()
            await release.wait()
            return "Review complete."

    llm, board = RecordingLlm(), Blackboard()
    app = create_app(llm=llm, blackboard=board, catalog_path=tmp_path / "catalog.sqlite3")
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post("/api/store", json=DEFINITION)
            await client.post("/api/store/review-agent/install")
            await client.post("/api/store", json={**DEFINITION, "version": "2.0.0", "system_prompt": "Updated instructions"})
            response = await client.post("/api/run", json={"task": "Review supplied function", "agent_id": "review-agent"})
            assert response.status_code == 200
            await asyncio.wait_for(started.wait(), timeout=2)
            assert llm.seen == ("Review supplied function", DEFINITION["system_prompt"])
            assert (await client.delete("/api/store/review-agent/install")).status_code == 409
            assert (await client.post("/api/run", json={"task": "Another task"})).status_code == 409
            release.set()
            for _ in range(100):
                if await board.get("review-agent:output"):
                    break
                await asyncio.sleep(0.01)
            entries = await board.list_all()
            assert len(entries) == 1 and entries[0].author == "review-agent"
            assert entries[0].value == {"result": "Review complete."}
            # Receipt and completion finish before the lifecycle unlocks.
            for _ in range(100):
                result = await client.patch("/api/store/review-agent", json={"enabled": False})
                if result.status_code == 200:
                    break
                await asyncio.sleep(0.01)
            assert result.status_code == 200
            assert (await client.post("/api/run", json={"task": "Review", "agent_id": "review-agent"})).status_code == 409


@pytest.mark.asyncio
async def test_cli_uses_same_installed_library(tmp_path):
    from click.testing import CliRunner
    from nexus.cli import cli
    # Uses the same isolated NEXUS_STORE_PATH as the CLI.
    app = create_app(llm=MockLlmClient())
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/api/store", json=DEFINITION)
        await client.post("/api/store/review-agent/install")
        await client.patch("/api/store/coding-agent", json={"enabled": False})
    result = CliRunner().invoke(cli, ["list-agents"])
    assert result.exit_code == 0, result.output
    assert "review-agent" in result.output
    assert "coding-agent" not in result.output


@pytest.mark.asyncio
async def test_failed_agent_releases_execution_slot(tmp_path):
    import asyncio
    from nexus.blackboard import Blackboard

    class FailingLlm(MockLlmClient):
        async def complete(self, prompt, system=None):
            raise RuntimeError("Provider unavailable")

    board = Blackboard()
    app = create_app(llm=FailingLlm(), blackboard=board, catalog_path=tmp_path / "catalog.sqlite3")
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post("/api/store", json=DEFINITION)
            await client.post("/api/store/review-agent/install")
            assert (await client.post("/api/run", json={"task": "Review function", "agent_id": "review-agent"})).status_code == 200
            for _ in range(100):
                if await board.get("router:failover:subtask-selected"):
                    break
                await asyncio.sleep(0.01)
            assert await board.get("router:failover:subtask-selected") is not None
            for _ in range(100):
                response = await client.patch("/api/store/review-agent", json={"enabled": False})
                if response.status_code == 200:
                    break
                await asyncio.sleep(0.01)
            assert response.status_code == 200


@pytest.mark.asyncio
async def test_server_plugin_version_changes_require_update_and_missing_plugin_is_unavailable(tmp_path):
    from nexus.agents.base import Agent, AgentOutput
    from nexus.app_store import AgentManifest, AppStore

    class VersionedPlugin(Agent):
        def manifest(self):
            return AgentManifest(id="local-plugin", name="Server Plugin", version=self.version, capabilities=["custom"])

        async def execute(self, task, blackboard):
            return AgentOutput(agent_id="local-plugin", result=task)

    path = tmp_path / "catalog.sqlite3"
    def plugin_client(version):
        llm = MockLlmClient()
        agent = VersionedPlugin(llm)
        agent.version = version
        store = AppStore()
        store.register(agent.manifest())
        app = create_app(app_store=store, agents={"local-plugin": agent}, llm=llm, catalog_path=path)
        return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")

    async with plugin_client("1.0.0") as client:
        assert (await client.get("/api/store/local-plugin")).json()["source"] == "plugin"
    async with plugin_client("2.0.0") as client:
        listing = (await client.get("/api/store/local-plugin")).json()
        assert listing["installed_version"] == "1.0.0" and not listing["enabled"]
        assert (await client.get("/api/agents")).json() == []
        assert (await client.patch("/api/store/local-plugin", json={"enabled": True})).status_code == 409
        assert (await client.post("/api/store/local-plugin/update")).json()["enabled"]
    async with client_for(path) as client:
        listing = (await client.get("/api/store/local-plugin")).json()
        assert listing["installed"] and not listing["available"] and not listing["enabled"]
        assert (await client.post("/api/store/local-plugin/install")).status_code == 409
        assert (await client.delete("/api/store/local-plugin/install")).status_code == 200
