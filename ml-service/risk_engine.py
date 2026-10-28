import math
from typing import Dict, Any, List, Tuple

HAZARDOUS_CATEGORIES = {
    "HAZARDOUS", "TRAFFICKING_EXPLOITATION", "FORCED_LABOUR",
    "FACTORY", "CONSTRUCTION", "BEGGING"
}

EMERGENCY_KEYWORDS = [
    "danger", "beaten", "trapped", "locked", "confined", "severe", "bleeding",
    "injury", "violence", "abused", "machinery", "fire", "explosion", "chemical",
    "starving", "threat", "weapon", "chained", "trafficking", "torture"
]

class RiskAssessmentEngine:
    def __init__(self):
        # Configurable thresholds
        self.thresholds = {
            "LOW": (0, 24),
            "MEDIUM": (25, 49),
            "HIGH": (50, 74),
            "CRITICAL": (75, 100)
        }

    def evaluate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Computes explainable risk score (0-100) and detects emergency conditions.
        Signals:
        - approximate age / age range
        - labour categories
        - immediate danger
        - forced labour & trafficking flags
        - number of children
        - school prevention
        - vulnerability indicators
        - repeat/historical reports
        - situation description & keywords
        """
        score = 0
        factors: List[str] = []
        emergency_reasons: List[str] = []

        child_info = data.get("childInformation") or {}
        situation = data.get("situationDetails") or {}
        labour_cats = data.get("labourCategories") or []
        repeat_count = int(data.get("repeatReportsCount", 0))
        historical_verified = int(data.get("historicalVerifiedCases", 0))
        emergency_flag = bool(data.get("emergencyIndicator", False))

        # 1. Age Signal
        age = child_info.get("approximateAge")
        age_range = child_info.get("ageRange", "UNKNOWN")

        if age is not None:
            if age <= 6:
                score += 26
                factors.append(f"Very young child involved (Age {age} years)")
            elif age <= 10:
                score += 18
                factors.append(f"Young child under 11 years (Age {age} years)")
            elif age <= 13:
                score += 12
                factors.append(f"Adolescent child under 14 years (Age {age} years)")
            else:
                score += 5
                factors.append(f"Adolescent child (Age {age} years)")
        else:
            if age_range == "UNDER_6":
                score += 26
                factors.append("Very young child involved (Estimated age under 6)")
            elif age_range == "AGE_6_10":
                score += 18
                factors.append("Young child involved (Estimated age 6-10)")
            elif age_range == "AGE_11_13":
                score += 12
                factors.append("Child involved (Estimated age 11-13)")
            elif age_range == "AGE_14_17":
                score += 5
                factors.append("Adolescent involved (Estimated age 14-17)")

        # 2. Labour Categories & Hazard Severity
        cat_score = 0
        matched_hazards = [c for c in labour_cats if c in HAZARDOUS_CATEGORIES]
        if "TRAFFICKING_EXPLOITATION" in labour_cats:
            cat_score = max(cat_score, 35)
            factors.append("Severe child trafficking / exploitation category detected")
            emergency_reasons.append("Suspected child trafficking syndicate")
        elif "FORCED_LABOUR" in labour_cats:
            cat_score = max(cat_score, 32)
            factors.append("Forced / bonded labour condition reported")
            emergency_reasons.append("Unlawful child confinement or bonded labour")
        elif "HAZARDOUS" in labour_cats:
            cat_score = max(cat_score, 28)
            factors.append("Hazardous occupation prohibited under Child Labour Amendment Act")
        elif "FACTORY" in labour_cats or "CONSTRUCTION" in labour_cats:
            cat_score = max(cat_score, 22)
            factors.append(f"Industrial / construction workplace ({', '.join(matched_hazards)})")
        elif "BEGGING" in labour_cats:
            cat_score = max(cat_score, 20)
            factors.append("Child begging / street exploitation")
        elif len(labour_cats) > 0:
            cat_score = max(cat_score, 12)
            factors.append(f"Commercial labour activity: {', '.join(labour_cats)}")

        score += cat_score

        # 3. Immediate Danger & Physical Safety
        immediate_danger = (
            child_info.get("immediateDangerObserved") == "YES" or
            situation.get("currentlyInDanger") == "YES"
        )
        if immediate_danger:
            score += 30
            factors.append("Immediate physical danger directly observed")
            emergency_reasons.append("Child is in immediate physical danger")

        if situation.get("threatened") == "YES":
            score += 18
            factors.append("Threats, intimidation, or violence reported")
            emergency_reasons.append("Active threats or physical violence against child")

        if situation.get("forcedToWork") == "YES":
            score += 18
            factors.append("Child is physically forced or coerced into work")

        if situation.get("suspectedTrafficking") == "YES":
            score += 25
            factors.append("Trafficking transit or forced migration suspected")
            emergency_reasons.append("Active trafficking or illegal custody detected")

        # 4. Number of Children
        num_children = int(child_info.get("numberOfChildren", 1))
        if num_children >= 5:
            score += 18
            factors.append(f"Large group of children exploited ({num_children} children)")
            emergency_reasons.append(f"Mass child exploitation detected ({num_children} children)")
        elif num_children > 1:
            score += 10
            factors.append(f"Multiple children exploited ({num_children} children)")

        # 5. Vulnerability Indicators
        vulns = child_info.get("vulnerabilityIndicators") or []
        if "VISIBLE_INJURY" in vulns:
            score += 22
            factors.append("Visible injuries, physical trauma, or burns observed")
            emergency_reasons.append("Child has visible physical injuries requiring immediate rescue")
        if "NO_GUARDIAN_VISIBLE" in vulns:
            score += 12
            factors.append("Child is unaccompanied with no guardian or parent visible")
        if "LIVING_ON_STREET" in vulns:
            score += 12
            factors.append("Child is homeless or living on streets")
        if "MALNOURISHED" in vulns:
            score += 8
            factors.append("Child appears severely malnourished or neglected")
        if "OUT_OF_SCHOOL" in vulns or situation.get("preventedFromSchool") == "YES":
            score += 6
            factors.append("Child is actively deprived of schooling / education rights")

        # 6. Repeat Offence / Historical Location Risk
        if repeat_count > 0:
            boost = min(repeat_count * 8, 20)
            score += boost
            factors.append(f"Repeat violations recorded at this location/establishment ({repeat_count} previous reports)")

        if historical_verified > 0:
            score += 12
            factors.append(f"Employer or location has {historical_verified} historically verified child labour citations")

        # 7. Text Analysis of Activity and Descriptions
        full_text = f"{situation.get('childActivity', '')} {situation.get('additionalDescription', '')}".lower()
        matched_keywords = [kw for kw in EMERGENCY_KEYWORDS if kw in full_text]
        if matched_keywords:
            score += 10
            factors.append(f"High-risk indicators identified in narrative: {', '.join(matched_keywords[:4])}")
            if any(k in ["fire", "explosion", "confined", "chained", "beaten", "bleeding", "torture"] for k in matched_keywords):
                emergency_reasons.append(f"Extreme hazard keywords identified ({', '.join(matched_keywords[:2])})")

        # Explicit user emergency flag
        if emergency_flag:
            score += 20
            factors.append("Report flagged as Emergency by complainer")
            if not emergency_reasons:
                emergency_reasons.append("Complainer indicated immediate emergency distress")

        # Age + Hazardous combo rule: Very young child in hazardous work
        if (age is not None and age < 12 or age_range in ["UNDER_6", "AGE_6_10"]) and (len(matched_hazards) > 0 or cat_score >= 25):
            score += 15
            factors.append("CRITICAL COMPOUND RISK: Child under 12 subjected to hazardous employment")
            emergency_reasons.append("Child under 12 years found in hazardous workplace")

        # Clamp score between 0 and 100
        score = min(max(int(score), 0), 100)

        # Emergency Detection Evaluation
        is_emergency = bool(emergency_flag or len(emergency_reasons) > 0 or score >= 75 and immediate_danger)

        if is_emergency and score < 75:
            # If critical emergency conditions are met, lift risk score to CRITICAL bracket
            score = max(score, 78)
            factors.insert(0, "EMERGENCY OVERRIDE: Critical child safety conditions triggered")

        # Determine Risk Level
        risk_level = "LOW"
        if score >= 75:
            risk_level = "CRITICAL"
        elif score >= 50:
            risk_level = "HIGH"
        elif score >= 25:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        confidence = round(0.85 + (len(factors) * 0.015), 2)
        confidence = min(confidence, 0.98)

        return {
            "riskScore": score,
            "riskLevel": risk_level,
            "factors": factors,
            "isEmergency": is_emergency,
            "emergencyReasons": emergency_reasons,
            "confidence": confidence,
            "thresholds": self.thresholds
        }
