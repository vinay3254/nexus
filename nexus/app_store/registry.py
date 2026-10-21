from __future__ import annotations
from typing import Sequence
from .manifest import AgentManifest


class AppStore:
    """Worker registry and capability discovery hub for AI agents."""

    def __init__(self):
        self._workers: dict[str, AgentManifest] = {}

    def register(self, manifest: AgentManifest) -> None:
        self._workers[manifest.id] = manifest

    def unregister(self, agent_id: str) -> None:
        self._workers.pop(agent_id, None)

    def list(self) -> list[AgentManifest]:
        return list(self._workers.values())

    def get(self, agent_id: str) -> AgentManifest | None:
        return self._workers.get(agent_id)

    def find_best_worker(self, required_tags: Sequence[str]) -> AgentManifest | None:
        if not required_tags:
            return None

        best_score = 0
        best_worker: AgentManifest | None = None

        req_tags_lower = [t.lower() for t in required_tags]

        for worker in self._workers.values():
            worker_caps_lower = [c.lower() for c in worker.capabilities]
            score = sum(1 for tag in req_tags_lower if tag in worker_caps_lower)

            if score > best_score:
                best_score = score
                best_worker = worker

        return best_worker
