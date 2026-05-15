import os
import json
import re
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

load_dotenv(override=True)

flash = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    request_timeout=120,
    max_retries=3
)
pro = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    request_timeout=120,
    max_retries=3
)

CONSTITUTION = """
You are an agent operating inside AXIOM, an autonomous business operating system.
You must follow these company rules at all times:
1. Never approve actions that exceed $5000 without escalation
2. Always prioritize customer satisfaction over short term profit
3. Brand tone must remain professional and trustworthy
4. No decisions that carry legal risk without human approval
5. Sustainability and ethics must be considered in every decision
"""


def parse_json_safe(text: str, fallback: dict) -> dict:
    text = text.strip()
    text = re.sub(r'^```json\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    text = re.sub(r'^```\s*', '', text)
    try:
        return json.loads(text)
    except:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except:
                fallback["raw"] = text[:500]
                return fallback
        fallback["raw"] = text[:500]
        return fallback


def run_sales_agent(scenario: str) -> str:
    messages = [
        SystemMessage(content=CONSTITUTION + "\nYou are the Sales Agent. Your goal is to maximize revenue and customer acquisition. Propose a bold action in 2-3 sentences."),
        HumanMessage(content=scenario)
    ]
    response = flash.invoke(messages)
    return response.content


def run_finance_agent(scenario: str) -> str:
    messages = [
        SystemMessage(content=CONSTITUTION + "\nYou are the Finance Agent. Your goal is to protect margins and control costs. Propose a conservative action in 2-3 sentences."),
        HumanMessage(content=scenario)
    ]
    response = flash.invoke(messages)
    return response.content


def run_operations_agent(scenario: str) -> str:
    messages = [
        SystemMessage(content=CONSTITUTION + "\nYou are the Operations Agent. Your goal is to ensure smooth execution and efficiency. Propose an operational action in 2-3 sentences."),
        HumanMessage(content=scenario)
    ]
    response = flash.invoke(messages)
    return response.content


def run_conflict_resolver(scenario: str, sales_proposal: str, finance_proposal: str, operations_proposal: str) -> dict:
    prompt = f"""
You are the Governor of AXIOM — an autonomous AI judge.

SCENARIO: {scenario}
SALES PROPOSAL: {sales_proposal}
FINANCE PROPOSAL: {finance_proposal}
OPERATIONS PROPOSAL: {operations_proposal}

Respond ONLY with valid JSON. No markdown. No code blocks. No newlines inside string values. Keep each string value on one line.

{{
"winner": "Sales or Finance or Operations or Hybrid",
"decision": "Action in one sentence",
"reasoning": "Reasoning in one paragraph without quotes or newlines",
"conditions": "Conditions in one line",
"risk_flags": "Risks in one line",
"confidence": 85
}}
"""
    messages = [
        SystemMessage(content="You are the AXIOM Governor. Output ONLY raw JSON. No markdown formatting. No newlines inside strings."),
        HumanMessage(content=prompt)
    ]
    response = pro.invoke(messages)
    fallback = {
        "winner": "Hybrid",
        "decision": "Parser failed",
        "reasoning": "Could not parse model output",
        "conditions": "",
        "risk_flags": "",
        "confidence": 50
    }
    return parse_json_safe(response.content, fallback)


def run_auditor(scenario: str, decision: dict, agent_proposals: dict) -> dict:
    prompt = f"""
You are the AXIOM Auditor. Score the decision and agents.

SCENARIO: {scenario}
DECISION: {decision}

Respond ONLY with valid JSON. No markdown. No newlines inside strings.

{{
"sales_score": 75,
"finance_score": 80,
"operations_score": 70,
"decision_quality": 85,
"overall_health": "Good",
"agents_needing_improvement": [],
"improvement_reason": "",
"audit_summary": "Brief summary in one line"
}}
"""
    messages = [
        SystemMessage(content="You are the AXIOM Auditor. Output ONLY raw JSON. No markdown. No newlines inside strings."),
        HumanMessage(content=prompt)
    ]
    response = pro.invoke(messages)
    fallback = {
        "sales_score": 70,
        "finance_score": 70,
        "operations_score": 70,
        "decision_quality": 70,
        "overall_health": "Unknown",
        "agents_needing_improvement": [],
        "improvement_reason": "",
        "audit_summary": "Parser failed"
    }
    return parse_json_safe(response.content, fallback)