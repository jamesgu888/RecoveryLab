# GaitGuard Fetch.ai Agent

uAgent with REST API and **ASI:One Chat Protocol**, so it can be **registered with Agentverse and discoverable on ASI:One** (required for hackathon prize eligibility).

---

## Prize eligibility — Agentverse & ASI:One discoverability

**To be eligible for a prize, at least one agent must be registered with Agentverse and discoverable on ASI:One.**

Check the Hackpack for judging criteria, challenge statement, and submission requirements.

**Checklist:**

1. **Sign up at [Agentverse](https://agentverse.ai/)** and create a mailbox.
2. **Run the agent** with mailbox enabled (default):
   ```bash
   cd fetch-agent
   pip install -r requirements.txt
   python agent.py
   ```
3. **Open the Agent Inspector link** printed in the terminal (e.g. `https://agentverse.ai/inspect/?uri=...`).
4. **Connect → Mailbox** and complete the steps so the agent registers in Agentverse.
5. Confirm in the terminal: `Successfully registered as mailbox agent in Agentverse`.
6. **(Optional)** In Agentverse, set the agent’s name/handle and profile so it’s easy to find (e.g. “GaitGuard”).
7. The agent uses the **ASI:One Chat Protocol**, so it will appear as **discoverable on ASI:One** once registered and connected.

---

## Quick start

```bash
cd fetch-agent
pip install -r requirements.txt
python agent.py
```

- REST API: **http://localhost:8000**
  - GET  http://localhost:8000/rest/get
  - POST http://localhost:8000/rest/post  (body: `{"text": "hello"}`)
- Open the **Agent Inspector** link printed in the terminal.

## Connect to Fetch.ai ASI server

1. **Sign up at [Agentverse](https://agentverse.ai/)** and create a mailbox for your agent.
2. Run the agent: `python agent.py`.
3. In the terminal you’ll see: `Agent inspector available at https://agentverse.ai/inspect/?uri=...`
4. Open that link → **Connect** → choose **Mailbox** and complete the steps.
5. After mailbox is connected you should see:
   - `Registration on Almanac API successful`
   - `Registering on almanac contract...complete`
   - `Successfully registered as mailbox agent in Agentverse`

The agent is then reachable on the Fetch.ai network and can be used with ASI:One.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FETCH_AGENT_MAILBOX` | `true` | Use Agentverse mailbox for ASI/Almanac registration |
| `FETCH_AGENT_ENDPOINT` | `http://localhost:8000/submit` | Public URL for Almanac (use your IP or ngrok for full registration) |
| `FETCH_AGENT_PORT` | `8000` | Port the agent listens on |
| `FETCH_AGENT_SEED` | (built-in) | Seed for deterministic agent address |

For Almanac registration from another machine, set `FETCH_AGENT_ENDPOINT` to a reachable URL (e.g. `http://YOUR_IP:8000/submit` or an ngrok URL).

## Calling from the Next.js app

The app proxies to this agent via **`/api/fetch-ai`**:

- **GET** `/api/fetch-ai?route=rest/get` → agent’s GET `/rest/get`
- **POST** `/api/fetch-ai` with body `{"text": "..."}` → agent’s POST `/rest/post`

Set `FETCH_AI_AGENT_URL=http://localhost:8000` in `.env.local` if the agent runs on another host/port.
