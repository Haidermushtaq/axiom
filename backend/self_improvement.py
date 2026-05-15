import os
import json
from datetime import datetime
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

load_dotenv(override=True)

PROMPT_HISTORY_FILE = os.path.join(os.path.dirname(__file__), "prompt_history.json")

_flash = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    request_timeout=120,
    max_retries=3,
)

AGENT_BASE_PROMPTS = {
    "sales": "You are the Sales Agent. Your goal is to maximize revenue and customer acquisition. Propose a bold action in 2-3 sentences.",
    "finance": "You are the Finance Agent. Your goal is to protect margins and control costs. Propose a conservative action in 2-3 sentences.",
    "operations": "You are the Operations Agent. Your goal is to ensure smooth execution and efficiency. Propose an operational action in 2-3 sentences.",
}


def load_prompt_history() -> dict:
    if os.path.exists(PROMPT_HISTORY_FILE):
        with open(PROMPT_HISTORY_FILE, "r") as f:
            return json.load(f)
    return {}


def _save_prompt_history(history: dict):
    with open(PROMPT_HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)


def get_current_prompt(agent_name: str) -> str:
    history = load_prompt_history()
    versions = history.get(agent_name, [])
    if versions:
        return versions[-1]["prompt"]
    return AGENT_BASE_PROMPTS.get(agent_name, "")


def rewrite_agent_prompt(agent_name: str, current_prompt: str, audit_feedback: str) -> str:
    meta_prompt = f"""You are an AI meta-optimizer improving agent prompts for AXIOM.

AGENT: {agent_name}
CURRENT PROMPT:
{current_prompt}

AUDIT FEEDBACK:
{audit_feedback}

Rewrite the agent's system prompt to address the weaknesses identified above.
Keep the agent's core role and goals intact, but make the reasoning sharper and the output more useful.
Output ONLY the new prompt text. No explanations, no markdown fences, no quotes."""

    messages = [
        SystemMessage(content="You are an AI meta-optimizer. Output only the improved prompt text, nothing else."),
        HumanMessage(content=meta_prompt),
    ]
    response = _flash.invoke(messages)
    new_prompt = response.content.strip()

    history = load_prompt_history()
    history.setdefault(agent_name, []).append(
        {
            "timestamp": datetime.utcnow().isoformat(),
            "prompt": new_prompt,
            "feedback": audit_feedback,
            "previous_prompt": current_prompt,
        }
    )
    _save_prompt_history(history)
    return new_prompt


def improve_failing_agents(audit: dict) -> dict:
    improvements = {}
    agents_to_improve = audit.get("agents_needing_improvement", [])

    for agent_name in agents_to_improve:
        score_key = f"{agent_name}_score"
        score = audit.get(score_key, 0)
        reason = audit.get("improvement_reason", "Performance below threshold")
        feedback = f"Score: {score}/100. Reason: {reason}"

        current_prompt = get_current_prompt(agent_name)
        new_prompt = rewrite_agent_prompt(agent_name, current_prompt, feedback)

        improvements[agent_name] = {
            "old_prompt": current_prompt,
            "new_prompt": new_prompt,
            "score": score,
            "feedback": feedback,
        }

    return improvements
