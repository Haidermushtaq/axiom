# AXIOM API Reference

**Base URL:** http://66.245.203.1

---

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
  "scenario": "Our biggest client just threatened to leave unless we cut prices by 25%.",
  "proposals": {
    "sales": "Offer a 15% discount tied to a 2-year contract extension...",
    "finance": "Do not discount. Present a detailed margin impact analysis instead...",
    "operations": "Propose a value-add service package as an alternative to price reduction..."
  },
  "decision": {
    "winner": "Hybrid",
    "decision": "Offer a 10% discount tied to a 2-year contract with expanded SLA",
    "reasoning": "A full 25% discount sets a dangerous precedent and destroys margin...",
    "conditions": "CFO approval required before making the offer",
    "risk_flags": "Precedent risk with other clients if deal becomes known",
    "confidence": 82
  },
  "audit": {
    "sales_score": 74,
    "finance_score": 81,
    "operations_score": 68,
    "decision_quality": 85,
    "overall_health": "Good",
    "agents_needing_improvement": [],
    "improvement_reason": "",
    "audit_summary": "Strong deliberation across all agents with well-reasoned hybrid outcome."
  },
  "needs_improvement": false,
  "failing_agents": []
}
```

---

## GET /history

Returns all past decisions in chronological order.

**Response:**
```json
{
  "decisions": [
    {
      "id": 1,
      "timestamp": "2026-05-16T14:23:11",
      "scenario": "...",
      "proposals": { "sales": "...", "finance": "...", "operations": "..." },
      "decision": { "winner": "Hybrid", "decision": "...", "confidence": 82 },
      "audit": { "overall_health": "Good", "agents_needing_improvement": [] },
      "needs_improvement": false,
      "failing_agents": []
    }
  ]
}
```

---

## GET /history/{id}

Returns a single decision by ID.

**Response:** Same structure as a single entry in `GET /history`.

**404 response:**
```json
{ "detail": "Decision not found" }
```

---

## POST /improve

Triggers the self-improvement loop for agents that scored below 60 in the most recent decision.

**Request:**
```json
{
  "scenario": ""
}
```

**Response:**
```json
{
  "improved_agents": ["operations"],
  "improvements": {
    "operations": {
      "old_prompt": "You are the Operations Agent. Your goal is to ensure smooth execution...",
      "new_prompt": "You are the Execute Agent. Your mandate is operational feasibility...",
      "score": 54,
      "feedback": "Score: 54/100. Reason: Proposals lacked concrete implementation steps."
    }
  },
  "message": "Improved 1 agent(s)"
}
```

**400 response (no history):**
```json
{ "detail": "No past decisions to base improvement on" }
```

---

## GET /prompts

Returns the full prompt version history for all agents.

**Response:**
```json
{
  "history": {
    "sales": [
      {
        "timestamp": "2026-05-16T15:10:44",
        "prompt": "You are the Sales Agent...",
        "feedback": "Score: 52/100. Reason: Proposals lacked competitive differentiation.",
        "previous_prompt": "You are the Sales Agent. Your goal is to maximize revenue..."
      }
    ],
    "operations": []
  }
}
```
