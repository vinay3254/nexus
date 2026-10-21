import pytest


@pytest.fixture(autouse=True)
def isolated_agent_catalog(tmp_path, monkeypatch):
    """Tests must never read or modify the user's installed agent library."""
    monkeypatch.setenv("NEXUS_STORE_PATH", str(tmp_path / "catalog.sqlite3"))
