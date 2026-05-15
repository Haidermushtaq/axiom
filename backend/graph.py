from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from agents import (
    run_sales_agent,
    run_finance_agent,
    run_operations_agent,
    run_conflict_resolver,
    run_auditor,
)


class AxiomState(TypedDict):
    scenario: str
    proposals: dict
    decision: dict
    audit: dict
    needs_improvement: bool
    failing_agents: List[str]


def sales_node(state: AxiomState) -> dict:
    proposal = run_sales_agent(state["scenario"])
    proposals = dict(state.get("proposals") or {})
    proposals["sales"] = proposal
    return {"proposals": proposals}


def finance_node(state: AxiomState) -> dict:
    proposal = run_finance_agent(state["scenario"])
    proposals = dict(state.get("proposals") or {})
    proposals["finance"] = proposal
    return {"proposals": proposals}


def operations_node(state: AxiomState) -> dict:
    proposal = run_operations_agent(state["scenario"])
    proposals = dict(state.get("proposals") or {})
    proposals["operations"] = proposal
    return {"proposals": proposals}


def governor_node(state: AxiomState) -> dict:
    proposals = state["proposals"]
    decision = run_conflict_resolver(
        state["scenario"],
        proposals.get("sales", ""),
        proposals.get("finance", ""),
        proposals.get("operations", ""),
    )
    return {"decision": decision}


def auditor_node(state: AxiomState) -> dict:
    audit = run_auditor(state["scenario"], state["decision"], state["proposals"])

    failing_agents = [
        agent
        for agent, key in [("sales", "sales_score"), ("finance", "finance_score"), ("operations", "operations_score")]
        if audit.get(key, 100) < 60
    ]

    return {
        "audit": audit,
        "needs_improvement": len(failing_agents) > 0,
        "failing_agents": failing_agents,
    }


builder = StateGraph(AxiomState)
builder.add_node("sales", sales_node)
builder.add_node("finance", finance_node)
builder.add_node("operations", operations_node)
builder.add_node("governor", governor_node)
builder.add_node("auditor", auditor_node)

builder.set_entry_point("sales")
builder.add_edge("sales", "finance")
builder.add_edge("finance", "operations")
builder.add_edge("operations", "governor")
builder.add_edge("governor", "auditor")
builder.add_edge("auditor", END)

axiom_graph = builder.compile()


def run_axiom_workflow(scenario: str) -> AxiomState:
    initial_state: AxiomState = {
        "scenario": scenario,
        "proposals": {},
        "decision": {},
        "audit": {},
        "needs_improvement": False,
        "failing_agents": [],
    }
    return axiom_graph.invoke(initial_state)
