# backend/agent.py — Agentic AI logic (OpenAI GPT-4o)
import os, json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL  = os.getenv("AGENT_MODEL", "gpt-4o")

CATEGORY_SLA = {
    "Life Support":         5,
    "Oxygen Supply":        5,
    "Cold Chain / Vaccine": 10,
    "ER Power":             10,
    "IT / Network":         60,
    "Facilities / HVAC":    120,
}

ESCALATION_TARGET = {
    "Life Support":         "Biomedical On-Call — Suresh Kumar",
    "Oxygen Supply":        "Biomedical On-Call — Suresh Kumar",
    "Cold Chain / Vaccine": "Facility Admin — Vikram Nair",
    "ER Power":             "Electrical On-Call — Farah Sheikh",
    "IT / Network":         "Facility Admin — Vikram Nair",
    "Facilities / HVAC":    "Facility Admin — Vikram Nair",
}

SYSTEM_PROMPT = """You are SENTINEL-AI, an intelligent hospital maintenance assistant.
You help hospital staff raise maintenance requests and help admins manage escalations.

You have access to these tools:
- analyze_request: analyze a description and return category, priority, title
- suggest_assignee: suggest best technician for a request
- suggest_escalation: suggest escalation target and reason
- chat_reply: reply to general questions about the system

Always respond in JSON matching the tool called.
Categories allowed: Life Support, Oxygen Supply, Cold Chain / Vaccine, ER Power, IT / Network, Facilities / HVAC
Priorities allowed: Low, Medium, High, Critical

Priority rules:
- Critical: patient safety at immediate risk (ventilator, oxygen, life support)
- High: significant risk, affects patient care (ER power, cold chain, surgical)
- Medium: operational disruption (Wi-Fi, HVAC, lab equipment)
- Low: comfort or minor issues
"""


def analyze_request(description: str) -> dict:
    """AI analyzes plain English → returns category, priority, title."""
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"""Analyze this hospital maintenance issue and return JSON only:
Description: "{description}"

Return exactly:
{{
  "title": "short title under 80 chars",
  "category": "one of the 6 allowed categories",
  "priority": "Critical|High|Medium|Low",
  "reasoning": "one sentence why this priority and category"
}}"""}
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    return json.loads(resp.choices[0].message.content)


def suggest_assignee(category: str, priority: str, technicians: list[dict]) -> dict:
    """AI picks best technician for this request."""
    if not technicians:
        return {"assigned_to_id": None, "assigned_to_name": None, "reasoning": "No technicians available"}

    tech_list = "\n".join([f"- ID {t['id']}: {t['name']} ({t['role']}, {t['department']})" for t in technicians])

    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"""Pick the best technician for this hospital maintenance request.

Category: {category}
Priority: {priority}
Available technicians:
{tech_list}

Return exactly:
{{
  "assigned_to_id": <integer id>,
  "assigned_to_name": "<name>",
  "reasoning": "one sentence why this person"
}}"""}
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    return json.loads(resp.choices[0].message.content)


def suggest_escalation(request: dict) -> dict:
    """AI suggests escalation target and reason for a breached ticket."""
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"""This hospital maintenance ticket has breached its SLA. Suggest escalation.

Ticket: {json.dumps(request, indent=2)}
Default escalation target: {ESCALATION_TARGET.get(request.get('category'), 'Facility Admin')}

Return exactly:
{{
  "escalate_to": "<name of person/role to escalate to>",
  "urgency": "Critical|High|Medium",
  "message": "one sentence escalation message for the on-call person",
  "reasoning": "why this escalation is needed"
}}"""}
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    return json.loads(resp.choices[0].message.content)


def chat(message: str, context: dict = None) -> dict:
    """General AI chat — employee describes issue, AI responds helpfully."""
    ctx = ""
    if context:
        ctx = f"\nCurrent system context: {json.dumps(context)}"

    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT + ctx},
            {"role": "user", "content": message}
        ],
        temperature=0.3,
    )
    return {"reply": resp.choices[0].message.content}
