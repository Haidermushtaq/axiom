# AXIOM API Reference

Base URL: http://66.245.203.1

## POST /run
Run the full AXIOM agent pipeline on a business scenario.

**Request:**
```json
{
  "scenario": "Our biggest client just threatened to leave unless we cut prices by 25%."
}
```

**Response:**
```json
{
  "id": 1,
  "timestamp": "2026-05-16T14:23:11",
  "scenario": "...",
  "proposals": {
    "sales": "Offer a 15% discount tied to a 2-year contract...",
    "finance": "Do not discount. Present margin impact alternatives...",
    "operations": "Propose a value-add package instead of price reduction..."
  },
  "decision": {
    "winner": "Hybrid",
    "decision": "Offer 10% discount tied to 2-year contract",
    "reasoning": "Full reasoning paragraph...",
    "conditions": "CFO approval required before offer",
    "risk_flags": "Precedent risk with other clients",
    "confidence": 82
  },
  "audit": {
    "sales_score": 74,
    "finance_score": 81,
    "operations_score": 68,
    "decision_quality": 85,
    "overall_health": "Good",
    "agents_needing_improvement": [],
    "audit_summary": "Strong deliberation across all agents."
  },
  "needs_improvement": false,
  "failing_agents": []
}
```

---

## GET /history
Returns all past decisions.

---

## GET /history/{id}
Returns a single decision by ID.

---

## POST /improve
Triggers self-improvement loop for agents scoring below 60.

---

## GET /prompts
Returns full prompt version history for all agents.
