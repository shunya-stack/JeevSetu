from app.schemas.case import TriageResult
from app.services.triage.rules import URGENT_RED_FLAGS, ROUTINE_REVIEW_FLAGS

def evaluate_triage(
    transcript: str | None,
    symptoms: list[str] | None = None,
    eating_change: str | None = None,
    duration: str | None = None
) -> TriageResult:
    """
    Deterministic rule-based triage evaluator.
    Strictly clinical safety bounded: no medication, no diagnostic certainty.
    """
    combined_text = (transcript or "").lower()
    if symptoms:
        combined_text += " " + " ".join(symptoms).lower()
    if eating_change:
        combined_text += " " + eating_change.lower()
    if duration:
        combined_text += " " + duration.lower()

    reasons: list[str] = []
    actions: list[str] = []
    is_urgent = False

    # 1. Check Urgent Red Flags
    for rule in URGENT_RED_FLAGS:
        for kw in rule["keywords"]:
            if kw.lower() in combined_text:
                is_urgent = True
                reasons.append(f"[RED FLAG] {rule['reason']}")
                if rule["action"] not in actions:
                    actions.append(rule["action"])
                break

    if is_urgent:
        return TriageResult(
            urgency_level="urgent",
            urgency_reasons=reasons,
            immediate_actions=actions,
            requires_vet_review=True,
            disclaimer="URGENT VETERINARY ATTENTION RECOMMENDED. This service does not replace a licensed veterinarian. Do not administer unprescribed medications."
        )

    # 2. Check Routine Review Flags
    for rule in ROUTINE_REVIEW_FLAGS:
        for kw in rule["keywords"]:
            if kw.lower() in combined_text:
                reasons.append(f"[REVIEW] {rule['reason']}")
                if rule["action"] not in actions:
                    actions.append(rule["action"])
                break

    if reasons:
        return TriageResult(
            urgency_level="review",
            urgency_reasons=reasons,
            immediate_actions=actions,
            requires_vet_review=True,
            disclaimer="Veterinary consultation recommended within 24 hours. Keep animal comfortable with access to clean water."
        )

    # 3. If very little or ambiguous text was provided
    if len(combined_text.strip()) < 10:
        return TriageResult(
            urgency_level="info_needed",
            urgency_reasons=["Description is very brief or unclear. Further physical observation is necessary."],
            immediate_actions=["Please provide more details on duration, feed intake, and symptoms or consult your local Livestock Inspector."],
            requires_vet_review=True,
            disclaimer="More information required. Connect with a local veterinarian for direct physical examination."
        )

    # Default to standard review
    return TriageResult(
        urgency_level="review",
        urgency_reasons=["Symptoms reported require physical clinical evaluation by a veterinary specialist."],
        immediate_actions=["Contact your nearest Block Veterinary Dispensary or Mobile Veterinary Unit."],
        requires_vet_review=True,
        disclaimer="Non-emergency veterinary review recommended."
    )

