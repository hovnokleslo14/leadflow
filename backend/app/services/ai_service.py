import json
from typing import Dict, Any, Tuple
from app.core.config import settings
from app.models import Lead, LeadSource


async def generate_draft(lead: Lead, request) -> Tuple[str, Dict[str, Any]]:
    """Generate a draft message using AI based on lead information."""
    
    client_info = ""
    if lead.client:
        client_info = f"""
Klient: {lead.client.name}
{lead.client.company and f'Firma: {lead.client.company}' or ''}
{lead.client.email and f'Email: {lead.client.email}' or ''}
{lead.client.website and f'Web: {lead.client.website}' or ''}
"""
    
    server_info = ""
    if lead.server_name:
        server_info = f"""
Server: {lead.server_name}
{lead.server_ip and f'IP: {lead.server_ip}' or ''}
{lead.server_version and f'Verze: {lead.server_version}' or ''}
{lead.server_players and f'Hráči: {lead.server_players}/{lead.server_max_players or "?"}' or ''}
"""
    
    prompt = f"""
Jsi zkušený vývojář a konzultant pro Minecraft servery. Napiš profesní, ale přátelský úvodní email/zprávu pro potenciálního klienta.

{client_info}
{server_info}

Zdroj leadu: {lead.source.value}
Titulek: {lead.title}
Popis: {lead.description or "Žádný podrobný popis"}

Kontaktní osoba: {lead.contact_username or "Neznámá"}
Platforma: {lead.contact_platform or "Neznámá"}

{request.custom_prompt or ""}

Tón: {request.tone}
Jazyk: {"Čeština" if request.language == "cs" else "English"}

Napiš stručný, osobní a relevantní zprávu, která:
1. Ukazuje, že jsme si prohlédli jejich server/projekt
2. Nabízí konkrétní hodnotu (vývoj, optimalizace, web, pluginy, atd.)
3. Má jasné call-to-action (zavolání, meeting, odkaz na portfolio)
4. Není spamovité ani generické

Maximálně 3 odstavce. Bez nadpisů. Podepiš se jako "Tým LeadFlow".
"""
    
    if settings.ai_provider == "openai" and settings.openai_api_key:
        return await _generate_openai(prompt)
    elif settings.ai_provider == "anthropic" and settings.anthropic_api_key:
        return await _generate_anthropic(prompt)
    else:
        # Fallback template
        return _generate_template(lead, request), {"provider": "template", "tokens": 0}


async def _generate_openai(prompt: str) -> Tuple[str, Dict[str, Any]]:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Jsi expert na Minecraft servery a B2B prodej. Piši přirozeně, lidsky a k věci."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=500,
        temperature=0.7
    )
    
    content = response.choices[0].message.content.strip()
    usage = {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "prompt_tokens": response.usage.prompt_tokens,
        "completion_tokens": response.usage.completion_tokens,
        "total_tokens": response.usage.total_tokens
    }
    return content, usage


async def _generate_anthropic(prompt: str) -> Tuple[str, Dict[str, Any]]:
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    
    response = await client.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=500,
        temperature=0.7,
        system="Jsi expert na Minecraft servery a B2B prodej. Piši přirozeně, lidsky a k věci.",
        messages=[{"role": "user", "content": prompt}]
    )
    
    content = response.content[0].text.strip()
    usage = {
        "provider": "anthropic",
        "model": "claude-3-haiku",
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens
    }
    return content, usage


def _generate_template(lead: Lead, request) -> str:
    """Fallback template when AI is not configured."""
    services = []
    if "web" in (lead.description or "").lower() or "web" in lead.title.lower():
        services.append("moderní web/eshop")
    if "plugin" in (lead.description or "").lower() or "plugin" in lead.title.lower():
        services.append("custom pluginy")
    if "server" in (lead.description or "").lower() or lead.server_name:
        services.append("správa a optimalizace serveru")
    if not services:
        services = ["vývoj pluginů", "webové stránky", "správa serveru"]
    
    services_str = ", ".join(services)
    
    if request.language == "cs":
        return f"""Ahoj {lead.contact_username or "tě"}!

Prošel jsem si {lead.server_name or "tvůj server/projekt"} a líbí se mi, jak jde vpřed. Vidím prostor na {services_str}, kde bychom ti mohli ušetřit čas a posunout věci dál.

Máme zkušenosti s desítkami serverů (od survival po minigames) a rádi bychom ti pomohli. Máš 15 min na rychlý call tady týden? Uvidíme, jestli to dává smysl.

Měj se fajn,
Tým LeadFlow"""
    else:
        return f"""Hi {lead.contact_username or "there"}!

I checked out {lead.server_name or "your server/project"} and love the direction it's heading. I see room for {services_str} where we could save you time and push things further.

We've worked with dozens of servers (survival to minigames) and would love to help. Got 15 mins for a quick call this week? Let's see if it's a fit.

Cheers,
LeadFlow Team"""


async def analyze_lead(lead: Lead) -> Dict[str, Any]:
    """Analyze lead quality and suggest next steps."""
    score = 0
    factors = []
    
    if lead.server_players and lead.server_max_players:
        ratio = lead.server_players / lead.server_max_players
        if ratio > 0.7:
            score += 30
            factors.append("Vysokáוכלוסnost serveru")
        elif ratio > 0.3:
            score += 15
            factors.append("Střední populace serveru")
    
    if lead.source in [LeadSource.REDDIT, LeadSource.DISCORD]:
        score += 20
        factors.append("Aktivně hledají pomoc")
    
    if lead.estimated_value and lead.estimated_value > 10000:
        score += 25
        factors.append("Vysoká odhadovaná hodnota")
    elif lead.estimated_value and lead.estimated_value > 5000:
        score += 15
        factors.append("Střední odhadovaná hodnota")
    
    if lead.contact_username:
        score += 10
        factors.append("Známý kontakt")
    
    priority = "low"
    if score >= 60:
        priority = "high"
    elif score >= 35:
        priority = "medium"
    
    return {
        "score": min(score, 100),
        "priority": priority,
        "factors": factors,
        "suggested_action": _get_suggested_action(priority, lead)
    }


def _get_suggested_action(priority: str, lead: Lead) -> str:
    actions = {
        "high": "Okamžitě kontaktovat, poslat personalizovanou nabídku do 24h",
        "medium": "Kontaktovat do 48h, připravit case study relevantní pro jejich server",
        "low": "Přidat do newsletteru, sledovat aktivitu, kontaktovat při změně situace"
    }
    return actions.get(priority, "Sledovat")