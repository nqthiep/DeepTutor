"""
CLI memory commands for the two-file public memory system (SUMMARY/PROFILE).
"""

from __future__ import annotations

from typing import cast

from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
import typer

from deeptutor.services.memory import get_memory_service
from deeptutor.services.memory.service import MemoryFile

console = Console()


def register(app: typer.Typer) -> None:
    @app.command("show")
    def memory_show(
        file: str = typer.Argument(
            "all",
            help="File to show: summary, profile, or all.",
        ),
    ) -> None:
        """Display memory file content."""
        svc = get_memory_service()
        if file == "all":
            snap = svc.read_snapshot()
            for label, content in [
                ("SUMMARY", snap.summary),
                ("PROFILE", snap.profile),
            ]:
                if content:
                    console.print(Panel(Markdown(content), title=f"[bold]{label}.md[/]"))
                else:
                    console.print(f"[dim]{label}.md: (rỗng)[/]")
        elif file in ("summary", "profile"):
            content = svc.read_file(cast(MemoryFile, file))
            if content:
                console.print(Panel(Markdown(content), title=f"[bold]{file.upper()}.md[/]"))
            else:
                console.print(f"[dim]{file.upper()}.md: (rỗng)[/]")
        else:
            console.print(f"[red]Tệp không xác định: {file}. Sử dụng summary, profile hoặc all.[/]")

    @app.command("clear")
    def memory_clear(
        file: str = typer.Argument(
            "all",
            help="File to clear: summary, profile, or all.",
        ),
        force: bool = typer.Option(False, "--force", "-f", help="Skip confirmation."),
    ) -> None:
        """Clear memory file(s)."""
        svc = get_memory_service()
        if file not in ("summary", "profile", "all"):
            console.print(f"[red]Tệp không xác định: {file}[/]")
            raise typer.Exit(1)

        if not force:
            target = "tất cả tệp bộ nhớ" if file == "all" else f"{file.upper()}.md"
            if not typer.confirm(f"Xóa {target}?"):
                raise typer.Abort()

        if file == "all":
            svc.clear_memory()
            console.print("[green]Đã xóa tất cả tệp bộ nhớ.[/]")
        else:
            svc.clear_file(cast(MemoryFile, file))
            console.print(f"[green]Đã xóa {file.upper()}.md.[/]")
