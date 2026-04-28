"""
CLI commands for managing TutorBot instances.
"""

from __future__ import annotations

import asyncio

from rich.console import Console
from rich.table import Table
import typer

console = Console()


def register(app: typer.Typer) -> None:
    @app.command("list")
    def bot_list() -> None:
        """List all TutorBot instances."""
        from deeptutor.services.tutorbot import get_tutorbot_manager

        bots = get_tutorbot_manager().list_bots()
        if not bots:
            console.print("[dim]Chưa có TutorBot nào được cấu hình.[/]")
            return

        table = Table(title="TutorBot")
        table.add_column("ID", style="cyan")
        table.add_column("Name")
        table.add_column("Status")
        table.add_column("Model", style="dim")
        table.add_column("Channels", style="dim")

        for b in bots:
            status = "[green]đang chạy[/]" if b.get("running") else "[dim]đã dừng[/]"
            table.add_row(
                b["bot_id"],
                b.get("name", ""),
                status,
                b.get("model") or "(default)",
                ", ".join(b.get("channels", [])) or "-",
            )
        console.print(table)

    @app.command("start")
    def bot_start(
        name: str = typer.Argument(..., help="Bot ID to start."),
    ) -> None:
        """Start a TutorBot instance."""
        from deeptutor.services.tutorbot import get_tutorbot_manager

        mgr = get_tutorbot_manager()
        try:
            instance = asyncio.get_event_loop().run_until_complete(mgr.start_bot(name))
            console.print(f"[green]Đã khởi động TutorBot '{instance.config.name}' ({name})[/]")
        except RuntimeError as e:
            console.print(f"[red]Không thể khởi động: {e}[/]")
            raise typer.Exit(1)

    @app.command("stop")
    def bot_stop(
        name: str = typer.Argument(..., help="Bot ID to stop."),
    ) -> None:
        """Stop a running TutorBot instance."""
        from deeptutor.services.tutorbot import get_tutorbot_manager

        mgr = get_tutorbot_manager()
        stopped = asyncio.get_event_loop().run_until_complete(mgr.stop_bot(name))
        if stopped:
            console.print(f"[green]Đã dừng TutorBot '{name}'[/]")
        else:
            console.print(f"[yellow]Bot '{name}' không tìm thấy hoặc không chạy.[/]")

    @app.command("create")
    def bot_create(
        name: str = typer.Argument(..., help="Bot ID."),
        display_name: str = typer.Option("", "--name", "-n", help="Display name."),
        persona: str = typer.Option("", "--persona", "-p", help="Persona description."),
        model: str = typer.Option("", "--model", "-m", help="Model override."),
    ) -> None:
        """Create a new TutorBot configuration and start it."""
        from deeptutor.services.tutorbot import get_tutorbot_manager
        from deeptutor.services.tutorbot.manager import BotConfig

        config = BotConfig(
            name=display_name or name,
            persona=persona,
            model=model or None,
        )
        mgr = get_tutorbot_manager()
        try:
            instance = asyncio.get_event_loop().run_until_complete(mgr.start_bot(name, config))
            console.print(
                f"[green]Đã tạo và khởi động TutorBot '{instance.config.name}' ({name})[/]"
            )
        except RuntimeError as e:
            console.print(f"[red]Thất bại: {e}[/]")
            raise typer.Exit(1)
