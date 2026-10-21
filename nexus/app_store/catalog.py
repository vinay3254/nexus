"""Local, persistent catalog. Publishing data never imports or executes Python."""
from __future__ import annotations

from contextlib import contextmanager
import json
import os
from pathlib import Path
import sqlite3
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from nexus.agents.base import Agent, AgentOutput
from nexus.agents import CodingAgent, ResearchAgent, DataAgent, OpsAgent
from nexus.blackboard import Blackboard
from nexus.llm.base import LlmClient
from .manifest import AgentManifest
from .registry import AppStore

def default_catalog_path() -> Path:
    return Path(os.environ.get("NEXUS_STORE_PATH", Path.home() / ".local/share/nexus/store.sqlite3"))


CATEGORIES = Literal["Development", "Research", "Data", "Operations", "Writing", "Productivity"]


class AgentDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    id: str = Field(pattern=r"^[a-z][a-z0-9-]{2,63}$")
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=10, max_length=600)
    publisher: str = Field(min_length=2, max_length=80)
    version: str = Field(pattern=r"^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$")
    category: CATEGORIES
    capabilities: list[str] = Field(min_length=1, max_length=15)
    system_prompt: str = Field(min_length=10, max_length=12000)
    sample_task: str = Field(min_length=5, max_length=1000)
    timeout_secs: float = Field(default=45, ge=1, le=300, strict=True)

    @field_validator("capabilities")
    @classmethod
    def clean_tags(cls, tags: list[str]) -> list[str]:
        import re
        cleaned = list(dict.fromkeys(tag.strip().lower() for tag in tags))
        if any(not re.fullmatch(r"[a-z0-9][a-z0-9 -]{0,39}", tag) for tag in cleaned):
            raise ValueError("Capabilities must be short words or phrases.")
        return cleaned

    def manifest(self) -> AgentManifest:
        return AgentManifest(**self.model_dump(include={"id", "name", "capabilities", "version", "timeout_secs"}))


class PromptAgent(Agent):
    def __init__(self, llm: LlmClient, definition: AgentDefinition):
        super().__init__(llm)
        self.definition = definition

    def manifest(self) -> AgentManifest:
        return self.definition.manifest()

    async def execute(self, task: str, blackboard: Blackboard) -> AgentOutput:
        result = await self.llm.complete(task, system=self.definition.system_prompt)
        await blackboard.set(f"{self.definition.id}:output", {"result": result}, author=self.definition.id)
        return AgentOutput(agent_id=self.definition.id, result=result, is_code=False)


BUILTIN_TYPES = {"coding-agent": CodingAgent, "research-agent": ResearchAgent, "data-agent": DataAgent, "ops-agent": OpsAgent}

BUILTINS = {
    "coding-agent": ("Development", "Writes Python code and sends generated code through the sandbox and repair loop.",
                     "Write a Python script to count word frequencies in a sentence."),
    "research-agent": ("Research", "Synthesizes explanations and reports using your configured model. No built-in web browsing.",
                       "Research and summarize the trade-offs of SQLite and PostgreSQL."),
    "data-agent": ("Data", "Produces structured analysis, transformations, and queries from your supplied task context.",
                   "Analyze this CSV: month,sales; January,120; February,180."),
    "ops-agent": ("Operations", "Produces deployment instructions and automation with sandbox execution for code outputs.",
                  "Write deployment instructions for a small Python API."),
}


class Catalog:
    def __init__(self, path: Path, store: AppStore, agents: dict[str, Agent], llm: LlmClient):
        self.path, self.store, self.agents, self.llm = path, store, agents, llm
        self.factories = {agent_id: agent for agent_id, agent in agents.items() if store.get(agent_id) is not None}
        path.parent.mkdir(parents=True, exist_ok=True)
        with self.db() as db:
            db.execute("CREATE TABLE IF NOT EXISTS catalog (id TEXT PRIMARY KEY, definition TEXT NOT NULL, source TEXT NOT NULL, installed TEXT, enabled INTEGER NOT NULL)")
            for manifest in store.list():
                if manifest.id not in agents:
                    continue
                builtin = BUILTINS.get(manifest.id) if type(agents[manifest.id]) is BUILTIN_TYPES.get(manifest.id) else None
                category, description, sample = builtin or (
                    "Productivity", "Python plugin provided by this server's administrator.", f"Run a task with {manifest.name}.")
                definition = {**manifest.model_dump(), "description": description, "publisher": "Nexus" if builtin else "Server administrator",
                              "category": category, "sample_task": sample, "system_prompt": "Defined by the server's Python agent implementation."}
                data = json.dumps(definition)
                existing = db.execute("SELECT source FROM catalog WHERE id=?", (manifest.id,)).fetchone()
                if existing is not None and existing["source"] == "local":
                    raise ValueError(f"Server plugin ID '{manifest.id}' conflicts with a published agent. Choose a different plugin ID.")
                source = "builtin" if builtin else "plugin"
                db.execute("INSERT INTO catalog VALUES (?, ?, ?, ?, 1) ON CONFLICT(id) DO UPDATE SET definition=excluded.definition WHERE catalog.source IN ('builtin', 'plugin')",
                           (manifest.id, data, source, data))
        self.sync()

    @contextmanager
    def db(self):
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def rows(self):
        with self.db() as db:
            return db.execute("SELECT * FROM catalog ORDER BY rowid").fetchall()

    def present(self, row) -> dict:
        definition = json.loads(row["definition"])
        installed = json.loads(row["installed"]) if row["installed"] else None
        available = row["source"] == "local" or row["id"] in self.factories
        compatible = available and (row["source"] == "local" or not installed or
                                     installed["version"] == self.factories[row["id"]].manifest().version)
        code = row["id"] in {"coding-agent", "ops-agent"} and row["source"] == "builtin"
        permissions = ["Send task text to configured model", "Write own output to shared blackboard"]
        if code:
            permissions.append("Execute generated code in Bubblewrap sandbox")
        if row["source"] == "plugin":
            permissions = ["Trusted server Python code: host access determined by plugin implementation"]
        return {**definition, "source": row["source"], "permissions": permissions, "available": available,
                "installed": installed is not None, "enabled": bool(row["enabled"]) and installed is not None and compatible,
                "installed_version": installed["version"] if installed else None,
                "installed_definition": installed,
                "update_available": bool(installed and installed["version"] != definition["version"])}

    def list(self):
        return [self.present(row) for row in self.rows()]

    def get(self, agent_id: str):
        with self.db() as db:
            row = db.execute("SELECT * FROM catalog WHERE id=?", (agent_id,)).fetchone()
        if row is None:
            raise KeyError("Agent not found.")
        return self.present(row)

    def publish(self, definition: AgentDefinition):
        if definition.id in BUILTINS:
            raise ValueError("Agent ID is reserved by a Nexus built-in.")
        with self.db() as db:
            row = db.execute("SELECT * FROM catalog WHERE id=?", (definition.id,)).fetchone()
            if row:
                if row["source"] != "local":
                    raise ValueError("Built-in and server plugin listings cannot be replaced through publishing.")
                old = json.loads(row["definition"])
                if tuple(map(int, definition.version.split("."))) <= tuple(map(int, old["version"].split("."))):
                    raise ValueError("Publish a version newer than the current listing.")
                db.execute("UPDATE catalog SET definition=? WHERE id=?", (definition.model_dump_json(), definition.id))
            else:
                if self.store.get(definition.id) is not None:
                    raise ValueError("Agent ID is reserved by a registered worker.")
                db.execute("INSERT INTO catalog VALUES (?, ?, 'local', NULL, 0)", (definition.id, definition.model_dump_json()))
        return self.get(definition.id)

    def change(self, agent_id: str, action: str):
        current = self.get(agent_id)
        if action != "uninstall" and not current["available"]:
            raise ValueError("Restart the server with this plugin directory before installing or enabling it.")
        if action == "enable" and current["source"] != "local" and current["update_available"]:
            raise ValueError("Update this agent to match the server implementation before enabling it.")
        if action in {"enable", "disable", "update"} and not current["installed"]:
            raise ValueError("Install this agent first.")
        with self.db() as db:
            if action == "install":
                if current["installed"]:
                    raise ValueError("Agent is already installed. Use Update or Enable.")
                db.execute("UPDATE catalog SET installed=definition, enabled=1 WHERE id=?", (agent_id,))
            elif action == "update":
                db.execute("UPDATE catalog SET installed=definition WHERE id=?", (agent_id,))
            elif action == "uninstall":
                db.execute("UPDATE catalog SET installed=NULL, enabled=0 WHERE id=?", (agent_id,))
            else:
                db.execute("UPDATE catalog SET enabled=? WHERE id=?", (action == "enable", agent_id))
        self.sync()
        return self.get(agent_id)

    def sync(self):
        for row in self.rows():
            agent_id = row["id"]
            self.store.unregister(agent_id)
            self.agents.pop(agent_id, None)
            if not row["installed"] or not row["enabled"]:
                continue
            if row["source"] == "local":
                agent = PromptAgent(self.llm, AgentDefinition.model_validate_json(row["installed"]))
            else:
                agent = self.factories.get(agent_id)
                if agent is None or agent.manifest().version != json.loads(row["installed"])["version"]:
                    continue
            self.agents[agent_id] = agent
            self.store.register(agent.manifest())
