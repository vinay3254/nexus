import asyncio
import json
import os
import sys
import click
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
import uvicorn

from nexus.app_store import AppStore
from nexus.blackboard import Blackboard
from nexus.persistence import SqliteBlackboardStore
from nexus.plugins import PluginLoader
from nexus.llm import create_llm_client, LlmClient
from nexus.agents import CodingAgent, ResearchAgent, DataAgent, OpsAgent, Agent
from nexus.router import TaskPlanner, RouterSupervisor
from nexus.trust import ReceiptSigner, SignedReceipt, SandboxRunner, SelfHealer
from nexus.ui import render_agent_table, render_plan_tree, render_receipt_panel, get_console
from nexus.demo import run_demo_scenario, list_demo_scenarios


def init_system(
    provider: str | None = None,
    mock_llm: bool = False,
    persist_db: str | None = None,
    plugins_dir: str | None = None,
    use_catalog: bool = True,
):
    selected_provider = "mock" if mock_llm else provider
    llm = create_llm_client(preferred=selected_provider)

    store = AppStore()
    agents: dict[str, Agent] = {
        "coding-agent": CodingAgent(llm),
        "research-agent": ResearchAgent(llm),
        "data-agent": DataAgent(llm),
        "ops-agent": OpsAgent(llm),
    }

    # Load dynamic plugins if specified
    if plugins_dir:
        loader = PluginLoader()
        custom_agents = loader.load_from_directory(plugins_dir, llm)
        for ca in custom_agents:
            agents[ca.manifest().id] = ca

    for agent in agents.values():
        store.register(agent.manifest())

    if use_catalog:
        from nexus.app_store.catalog import Catalog, default_catalog_path
        Catalog(default_catalog_path(), store, agents, llm)

    persistence_store = None
    if persist_db:
        persistence_store = SqliteBlackboardStore(persist_db)

    return store, agents, llm, persistence_store


@click.group()
def cli():
    """Nexus: Autonomous Multi-Agent Orchestration Hub."""
    pass


@cli.command("list-agents")
@click.option("--plugins", default=None, help="Directory to load custom agent plugins from.")
def list_agents(plugins: str | None):
    """List all registered agents in the App Store with Rich formatting."""
    store, _, _, _ = init_system(mock_llm=True, plugins_dir=plugins)
    render_agent_table(store.list())


@cli.command("demo")
@click.option(
    "--scenario",
    type=click.Choice(list_demo_scenarios()),
    default="self-heal",
    help="Pre-configured showcase scenario to run.",
)
def run_demo(scenario: str):
    """Run an interactive demonstration scenario of Nexus capabilities."""
    console = get_console()
    console.print(f"\n[bold cyan]✨ Running Showcase Scenario: '{scenario}'[/bold cyan]\n")

    result = asyncio.run(run_demo_scenario(scenario))

    if scenario == "self-heal":
        console.print(Panel(
            "[bold red]Step 1: Broken Input Code (NameError injected)[/bold red]\n"
            f"[dim]{result['broken_input']}[/dim]\n\n"
            "[bold yellow]Step 2: Trust Layer caught non-zero sandbox exit & intercepted stderr[/bold yellow]\n\n"
            "[bold green]Step 3: Healed & Verified Output:[/bold green]\n"
            f"[bold white]{result['output']}[/bold white]",
            title="🛡️ Self-Healing Security Guard Demo",
            border_style="green",
        ))
    elif scenario == "orchestration":
        console.print(f"[bold green]✅ Executed {result['subtasks_executed']} subtasks across workers.[/bold green]")
        for item in result["outputs"]:
            console.print(f"  • [[bold cyan]{item['agent_id']}[/bold cyan]] {item['result'][:80]}...")
        console.print("\n[bold yellow]Cryptographic Receipt generated for merged output.[/bold yellow]")
    elif scenario == "app-store":
        console.print(f"[bold green]App Store catalog healthy: {result['total_workers']} workers active.[/bold green]")
        console.print(f"Best worker matched for Python code: [bold cyan]{result['best_coder']}[/bold cyan]")


@cli.command("verify-receipt")
@click.argument("receipt_path", type=click.Path(exists=True, dir_okay=False))
def verify_receipt(receipt_path: str):
    """Cryptographically verify an execution receipt."""
    try:
        with open(receipt_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        receipt = SignedReceipt(**data)
        if receipt.verify():
            render_receipt_panel(receipt)
            click.echo("✅ Receipt signature is VALID")
        else:
            click.echo("❌ Receipt signature is INVALID or tampered with.", err=True)
            sys.exit(1)
    except Exception as e:
        click.echo(f"❌ Failed to parse receipt: {e}", err=True)
        sys.exit(1)


@cli.command("serve")
@click.option("--host", default="127.0.0.1", help="Daemon host address.")
@click.option("--port", default=8000, type=int, help="Daemon port.")
@click.option("--persist", default=None, help="SQLite path for persistent blackboard.")
@click.option("--plugins", default=None, help="Directory to load external plugins from.")
@click.option("--mock-llm", is_flag=True, default=False, help="Force mock LLM mode.")
def serve_dashboard(
    host: str,
    port: int,
    persist: str | None,
    plugins: str | None,
    mock_llm: bool,
):
    """Launch the Nexus web dashboard and realtime WebSocket daemon."""
    from nexus.server.app import create_app

    store, agents, llm, pers_store = init_system(
        mock_llm=mock_llm,
        persist_db=persist,
        plugins_dir=plugins,
        use_catalog=False,  # create_app needs all server implementations, including uninstalled ones.
    )

    async def _start():
        if pers_store:
            await pers_store.initialize()
            bb = await Blackboard.from_persistence(pers_store)
        else:
            bb = Blackboard()

        app = create_app(
            app_store=store,
            blackboard=bb,
            llm=llm,
            agents=agents,
        )
        config = uvicorn.Config(app=app, host=host, port=port, log_level="info")
        server = uvicorn.Server(config)
        await server.serve()

    console = get_console()
    console.print(Panel(
        f"[bold green]Nexus Web Dashboard & Daemon active[/bold green]\n"
        f"URL: [bold cyan]http://{host}:{port}[/bold cyan]\n"
        f"WebSocket: [bold magenta]ws://{host}:{port}/ws[/bold magenta]",
        border_style="cyan",
    ))
    asyncio.run(_start())


@cli.command("run")
@click.argument("task")
@click.option("--mock-llm", is_flag=True, default=False, help="Use deterministic mock LLM.")
@click.option(
    "--provider",
    type=click.Choice(["auto", "anthropic", "openai", "ollama", "mock"]),
    default="auto",
    help="LLM provider choice.",
)
@click.option("--sandbox-retries", default=3, help="Max self-healing retry iterations.")
@click.option("--persist", default=None, help="SQLite path for persistent blackboard.")
@click.option("--plugins", default=None, help="Directory to load custom agent plugins from.")
@click.option("--export-receipt", type=click.Path(dir_okay=False), help="Path to export signed receipt JSON.")
@click.option("--dry-run", is_flag=True, default=False, help="Display execution plan without running agents.")
def run_task(
    task: str,
    mock_llm: bool,
    provider: str,
    sandbox_retries: int,
    persist: str | None,
    plugins: str | None,
    export_receipt: str | None,
    dry_run: bool,
):
    """Decompose and execute a task across specialized worker agents."""
    asyncio.run(
        _run_task_async(
            task=task,
            mock_llm=mock_llm,
            provider=provider,
            sandbox_retries=sandbox_retries,
            persist=persist,
            plugins=plugins,
            export_receipt=export_receipt,
            dry_run=dry_run,
        )
    )


async def _run_task_async(
    task: str,
    mock_llm: bool,
    provider: str,
    sandbox_retries: int,
    persist: str | None,
    plugins: str | None,
    export_receipt: str | None,
    dry_run: bool,
):
    console = get_console()
    console.print(f"\n[bold cyan]🚀 Dispatching task:[/bold cyan] \"{task}\"\n")

    planner = TaskPlanner()
    subtasks = planner.decompose(task)

    if dry_run:
        console.print("[dim]Plan (dry run):[/dim]")
        render_plan_tree(subtasks, console=console)
        return

    chosen_provider = "mock" if mock_llm else (None if provider == "auto" else provider)
    store, agents, llm, pers_store = init_system(
        provider=chosen_provider,
        persist_db=persist,
        plugins_dir=plugins,
    )

    if pers_store:
        await pers_store.initialize()
        bb = await Blackboard.from_persistence(pers_store)
    else:
        bb = Blackboard()

    supervisor = RouterSupervisor(store)
    sandbox = SandboxRunner()
    healer = SelfHealer(sandbox=sandbox, llm=llm)

    render_plan_tree(subtasks, console=console)
    console.print("")

    results = []

    for st in subtasks:
        worker_id = supervisor.select_worker(st)
        console.print(f"⚡ Subtask [[bold yellow]{st.id}[/bold yellow]] routed to: [bold green]{worker_id}[/bold green]")

        output = await supervisor.execute_subtask(st, agents, bb)

        if output.is_code:
            console.print("🛡️  [bold purple]Trust Layer:[/bold purple] Testing code in isolated container...")
            try:
                verified_out = await healer.execute_with_healing(output.result, max_retries=sandbox_retries)
                console.print("✅ [bold green]Sandbox execution successful.[/bold green]")
                results.append(f"[{st.id}] Verified Code Output:\n{verified_out}")
            except Exception as e:
                console.print(f"⚠️  [yellow]Sandbox warning:[/yellow] {e}")
                results.append(f"[{st.id}] Raw Code:\n{output.result}")
        else:
            results.append(f"[{st.id}] Output:\n{output.result}")

    merged_result = "\n\n".join(results)
    console.print(Panel(
        merged_result,
        title="=== Merged Execution Result ===",
        border_style="cyan",
    ))

    # Sign receipt with Ed25519
    signer = ReceiptSigner.generate()
    receipt = signer.sign(task_id="nexus-run-final", payload=merged_result)

    render_receipt_panel(receipt, console=console)

    if export_receipt:
        with open(export_receipt, "w", encoding="utf-8") as f:
            f.write(receipt.model_dump_json(indent=2))
        console.print(f"\n📝 Signed receipt exported to [bold cyan]{export_receipt}[/bold cyan]")

    console.print("\n[bold green]✨ Task completed successfully.[/bold green]\n")


if __name__ == "__main__":
    cli()
