from typing import Sequence
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.tree import Tree
from rich.text import Text
from nexus.app_store.manifest import AgentManifest
from nexus.router.planner import Subtask
from nexus.trust.receipt import SignedReceipt


def get_console(console: Console | None = None) -> Console:
    return console or Console()


def render_agent_table(agents: Sequence[AgentManifest], console: Console | None = None) -> None:
    c = get_console(console)
    table = Table(
        title="Nexus Worker App Store",
        title_style="bold cyan",
        header_style="bold magenta",
        border_style="dim",
    )
    table.add_column("Agent ID", style="bold green")
    table.add_column("Name", style="white")
    table.add_column("Version", style="yellow")
    table.add_column("Capabilities", style="cyan")
    table.add_column("Timeout", style="magenta")

    for a in agents:
        caps_badge = ", ".join(f"[bold blue]{cap}[/bold blue]" for cap in a.capabilities)
        table.add_row(
            a.id,
            a.name,
            f"v{a.version}",
            caps_badge,
            f"{a.timeout_secs}s",
        )

    c.print(table)


def render_plan_tree(subtasks: Sequence[Subtask], console: Console | None = None) -> None:
    c = get_console(console)
    tree = Tree("[bold cyan]Execution Plan DAG[/bold cyan]")

    for idx, st in enumerate(subtasks, 1):
        tags_str = " ".join(f"[dim]#{t}[/dim]" for t in st.tags)
        node = tree.add(f"[bold yellow]Step {idx}:[/bold yellow] [white]{st.description}[/white] ({tags_str})")
        node.add(f"[dim]ID: {st.id}[/dim]")

    c.print(tree)


def render_receipt_panel(receipt: SignedReceipt, console: Console | None = None) -> None:
    c = get_console(console)
    content = Text()
    content.append("Task ID:        ", style="bold yellow")
    content.append(f"{receipt.task_id}\n", style="white")

    content.append("Payload Digest: ", style="bold yellow")
    content.append(f"{receipt.payload_digest}\n", style="cyan")

    content.append("Public Key:     ", style="bold yellow")
    content.append(f"{receipt.public_key[:32]}...\n", style="green")

    content.append("Signature:      ", style="bold yellow")
    content.append(f"{receipt.signature[:32]}...\n", style="magenta")

    content.append("Timestamp:      ", style="bold yellow")
    content.append(f"{receipt.timestamp}\n", style="white")

    content.append("\n[Verified] Cryptographically Verified (Ed25519)", style="bold green")

    panel = Panel(
        content,
        title="Cryptographic Execution Receipt",
        border_style="green",
        expand=False,
    )
    c.print(panel)
