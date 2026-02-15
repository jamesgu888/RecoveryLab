"""
GaitGuard Fetch.ai uAgent — REST API + ASI:One / Agentverse.

- REST GET/POST for the Next.js app.
- ASI:One Chat Protocol so the agent is discoverable on Agentverse & ASI:One
  (required for hackathon prize eligibility).

Run: python agent.py
Then: open Agent Inspector link → Connect → Mailbox. Agent becomes discoverable on ASI:One.
"""
import os
import time
from datetime import datetime
from uuid import uuid4
from typing import Any, Dict

from uagents import Agent, Context, Model, Protocol

# ASI:One chat protocol — required for Agentverse/ASI:One discoverability
try:
    from uagents_core.contrib.protocols.chat import (
        ChatAcknowledgement,
        ChatMessage,
        EndSessionContent,
        TextContent,
        chat_protocol_spec,
    )
    HAS_CHAT_PROTOCOL = True
except ImportError:
    HAS_CHAT_PROTOCOL = False

# ---------------------------------------------------------------------------
# Models for REST endpoints
# ---------------------------------------------------------------------------

class Request(Model):
    text: str

class Response(Model):
    timestamp: int
    text: str
    agent_address: str

# ---------------------------------------------------------------------------
# Agent config — ASI/Agentverse connection
# ---------------------------------------------------------------------------

USE_MAILBOX = os.environ.get("FETCH_AGENT_MAILBOX", "true").lower() == "true"
ENDPOINT = os.environ.get("FETCH_AGENT_ENDPOINT", "http://localhost:8001/submit")
PORT = int(os.environ.get("FETCH_AGENT_PORT", "8001"))
SEED = os.environ.get("FETCH_AGENT_SEED", "gaitguard fetch agent secret phrase")

# When mailbox is True, do not pass endpoint so Agentverse/mailbox is used (ASI:One discoverable)
_kw: Any = {"name": "GaitGuard", "seed": SEED, "port": PORT, "mailbox": USE_MAILBOX, "publish_agent_details": True}
if not USE_MAILBOX:
    _kw["endpoint"] = [ENDPOINT]
agent = Agent(**_kw)

# ---------------------------------------------------------------------------
# ASI:One Chat Protocol — makes agent discoverable on ASI:One
# ---------------------------------------------------------------------------

if HAS_CHAT_PROTOCOL:
    chat_protocol = Protocol(spec=chat_protocol_spec)

    @chat_protocol.on_message(ChatMessage)
    async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
        await ctx.send(
            sender,
            ChatAcknowledgement(timestamp=datetime.now(), acknowledged_msg_id=msg.msg_id),
        )
        text = ""
        for item in msg.content:
            if isinstance(item, TextContent):
                text += item.text
        # Reply with a short GaitGuard intro so ASI:One users see a real response
        response = (
            "I'm GaitGuard, an agent for gait analysis and rehab coaching. "
            "I can help with exercise guidance and recovery check-ins. How can I help?"
        )
        if text.strip():
            response = f"You said: {text.strip()}. " + response
        await ctx.send(
            sender,
            ChatMessage(
                timestamp=datetime.utcnow(),
                msg_id=uuid4(),
                content=[
                    TextContent(type="text", text=response),
                    EndSessionContent(type="end-session"),
                ],
            ),
        )

    @chat_protocol.on_message(ChatAcknowledgement)
    async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
        pass

    agent.include(chat_protocol, publish_manifest=True)

# ---------------------------------------------------------------------------
# REST routes (agent-level)
# ---------------------------------------------------------------------------

@agent.on_rest_get("/rest/get", Response)
async def handle_get(ctx: Context) -> Dict[str, Any]:
    ctx.logger.info("Received GET request")
    return {
        "timestamp": int(time.time()),
        "text": "Hello from GaitGuard Fetch.ai agent!",
        "agent_address": ctx.agent.address,
    }

@agent.on_rest_post("/rest/post", Request, Response)
async def handle_post(ctx: Context, req: Request) -> Response:
    ctx.logger.info("Received POST request")
    return Response(
        text=f"Received: {req.text}",
        agent_address=ctx.agent.address,
        timestamp=int(time.time()),
    )

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    agent.run()
