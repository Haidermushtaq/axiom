# AXIOM

Built for the AI Agent Olympics Hackathon (Milan AI Week 2026) by **Team Orchestrator**. 4 days, 2 founders, starting from scratch.

AXIOM is a self-governing multi-agent system for enterprise decision-making. You describe a business problem. Five specialized AI agents powered by Gemini 2.5 Flash argue their corners — Sales wants revenue, Finance wants margins, Operations wants efficiency. When they conflict, a Governor agent makes a binding decision with written reasoning. Then an Auditor scores every agent's judgment and, if anyone scored below 60, rewrites their system prompt automatically.

The agents don't just run once. They improve.

## What it does

You type: "Our biggest client just threatened to leave unless we cut prices 25%. What do we do?"

AXIOM runs five agents in a LangGraph orchestration pipeline. Each proposes an action from its own mandate. The Governor reads all three proposals, reasons through the tradeoffs against the company constitution, and issues a binding decision — winner, reasoning, conditions, risk flags. The Auditor scores everyone 0–100. If any agent underperforms, the self-improvement loop rewrites its prompt before the next run.

Every decision is stored. You can call `/history` to see how the system's reasoning has evolved.

## Stack

Python + FastAPI backend, LangGraph for orchestration, Gemini 2.5 Flash for all agents, React + Vite + Tailwind frontend, file-based storage for decisions and prompt history.

## Agents

- **Sales** — pushes for revenue and customer acquisition
- **Finance** — protects margins and flags budget risks
- **Operations** — optimizes execution and efficiency
- **Governor** — resolves conflicts, issues binding decisions with full reasoning
- **Auditor** — scores decisions, triggers self-improvement when agents underperform

## Why this is different

Most agent systems run once and stop. AXIOM runs continuously and gets better. The self-improvement loop is the part nobody else built — when an agent consistently makes poor decisions, the system rewrites its own instructions without human input.

## Running it

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

Add your `GOOGLE_API_KEY` to `backend/.env`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — agent roles, LangGraph pipeline, self-improvement loop, stack
- [API Reference](docs/API.md) — all endpoints with request/response examples
- [Demo Script](docs/DEMO.md) — pitch, walkthrough, and judge FAQ

## Team Orchestrator

**Haider Mushtaq** — AI Engineer, Backend & Agent Architecture
Final Year AI Student, CIIT Wah Cantt

**Amman Khan** — Co-founder, AI Engineer & Full Stack Developer
GitHub: [AMAN-X12](https://github.com/AMAN-X12)
