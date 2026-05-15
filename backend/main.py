from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
import os

load_dotenv(override=True)

from graph import run_axiom_workflow
from database import save_decision, get_all_decisions, get_decision_by_id
from self_improvement import improve_failing_agents, load_prompt_history

app = FastAPI(title="AXIOM")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScenarioRequest(BaseModel):
    scenario: str


@app.get("/")
def root():
    return {"status": "AXIOM is alive"}


@app.post("/run")
def run_axiom(request: ScenarioRequest):
    result = run_axiom_workflow(request.scenario)

    response_data = {
        "scenario": result["scenario"],
        "proposals": result["proposals"],
        "decision": result["decision"],
        "audit": result["audit"],
        "needs_improvement": result.get("needs_improvement", False),
        "failing_agents": result.get("failing_agents", []),
    }

    saved = save_decision(response_data)
    response_data["id"] = saved["id"]
    response_data["timestamp"] = saved["timestamp"]
    return response_data


@app.get("/history")
def get_history():
    return {"decisions": get_all_decisions()}


@app.get("/history/{decision_id}")
def get_decision(decision_id: int):
    decision = get_decision_by_id(decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return decision


@app.post("/improve")
def trigger_improvement(request: ScenarioRequest):
    decisions = get_all_decisions()
    if not decisions:
        raise HTTPException(status_code=400, detail="No past decisions to base improvement on")

    latest_audit = decisions[-1].get("audit", {})
    improvements = improve_failing_agents(latest_audit)

    return {
        "improved_agents": list(improvements.keys()),
        "improvements": improvements,
        "message": f"Improved {len(improvements)} agent(s)",
    }


@app.get("/prompts")
def get_prompt_history():
    return {"history": load_prompt_history()}
