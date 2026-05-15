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
