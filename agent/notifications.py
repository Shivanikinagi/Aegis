import os
import aiohttp
import structlog
import asyncio
from typing import Optional

logger = structlog.get_logger()

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

async def send_notification(title: str, description: str, color: int = 0x5865F2, fields: list = None):
    """
    Send a notification to Discord Webhook.
    
    Args:
        title: Title of the embed
        description: Main text body
        color: Hex color integer (default: Blurple)
        fields: List of dictionaries {"name": str, "value": str, "inline": bool}
    """
    if not DISCORD_WEBHOOK_URL:
        # notification disabled or not configured
        return

    embed = {
        "title": title,
        "description": description,
        "color": color,
        "footer": {
            "text": "Autonomous Treasury Agent"
        }
    }
    
    if fields:
        embed["fields"] = fields

    payload = {
        "username": "Treasury Agent",
        "avatar_url": "https://i.imgur.com/8u1o8sD.png", # Generic robot icon
        "embeds": [embed]
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(DISCORD_WEBHOOK_URL, json=payload) as response:
                if response.status >= 400:
                    text = await response.text()
                    logger.error("Failed to send discord notification", status=response.status, response=text)
                else:
                    logger.info("Discord notification sent", title=title)
    except Exception as e:
        logger.error("Error sending discord notification", error=str(e))

async def notify_high_value_task_created(task_id: int, creator: str, amount: float, description: str):
    """Notify when a high value task (>100 MON) is created."""
    await send_notification(
        title="🚨 High Value Task Created",
        description=f"A new high-value task has been submitted to the treasury.",
        color=0xFFA500, # Orange
        fields=[
            {"name": "Task ID", "value": str(task_id), "inline": True},
            {"name": "Amount", "value": f"{amount:.2f} MON", "inline": True},
            {"name": "Creator", "value": f"`{creator}`", "inline": False},
            {"name": "Description", "value": description or "No description provided", "inline": False}
        ]
    )

async def notify_high_value_task_completed(task_id: int, worker: str, amount: float, success: bool):
    """Notify when a high value task is completed."""
    color = 0x00FF00 if success else 0xFF0000 # Green or Red
    status = "SUCCESSFUL" if success else "FAILED"
    
    await send_notification(
        title=f"💰 High Value Task Completed: {status}",
        description=f"Task #{task_id} has been finalized.",
        color=color,
        fields=[
            {"name": "Task ID", "value": str(task_id), "inline": True},
            {"name": "Payout", "value": f"{amount:.2f} MON", "inline": True},
            {"name": "Worker", "value": f"`{worker}`", "inline": False}
        ]
    )
