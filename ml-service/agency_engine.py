from typing import Dict, Any, List

def recommend_agency_assignment(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Adaptive agency assignment architecture.
    Inputs:
    - riskLevel, riskScore, isEmergency
    - labourCategories
    - vulnerability indicators
    - location / district
    """
    risk_level = data.get("riskLevel", "LOW")
    is_emergency = bool(data.get("isEmergency", False))
    cats = set(data.get("labourCategories") or [])
    child_info = data.get("childInformation") or {}
    vulns = set(child_info.get("vulnerabilityIndicators") or [])

    # Default values
    recommended_agency = "LABOUR"
    backup_agency = "CWC"
    priority = risk_level
    expected_response_hours = 24
    reasons: List[str] = []

    # 1. Police Priority: Emergencies, immediate danger, violence, trafficking, forced labour
    if is_emergency or "TRAFFICKING_EXPLOITATION" in cats or "FORCED_LABOUR" in cats or risk_level == "CRITICAL":
        recommended_agency = "POLICE"
        backup_agency = "CWC"
        priority = "CRITICAL"
        expected_response_hours = 2  # Immediate response within 2 hours
        reasons.append("Immediate physical threat or criminal child trafficking/forced labour requires law enforcement first response.")

    # 2. CWC Priority: Begging, street children, no guardian, extreme neglect, child protection
    elif "BEGGING" in cats or "NO_GUARDIAN_VISIBLE" in vulns or "LIVING_ON_STREET" in vulns or child_info.get("numberOfChildren", 1) > 3:
        recommended_agency = "CWC"
        backup_agency = "POLICE"
        priority = "HIGH" if risk_level in ["HIGH", "CRITICAL"] else "MEDIUM"
        expected_response_hours = 6
        reasons.append("Child welfare, custody protection, and shelter admission require Child Welfare Committee mandate under JJ Act.")

    # 3. Labour Department Priority: Hazardous workplace, factories, construction, hotels, commercial shops
    elif any(c in cats for c in ["HAZARDOUS", "FACTORY", "CONSTRUCTION", "HOTEL_RESTAURANT", "SHOP_GARAGE", "AGRICULTURAL"]):
        recommended_agency = "LABOUR"
        backup_agency = "POLICE"
        priority = "HIGH" if risk_level in ["HIGH", "CRITICAL"] else "MEDIUM"
        expected_response_hours = 12 if risk_level == "HIGH" else 24
        reasons.append("Workplace inspection, employer liability, and CLPRA enforcement fall within Labour Department jurisdiction.")

    else:
        recommended_agency = "LABOUR"
        backup_agency = "NGO"
        priority = "LOW" if risk_level == "LOW" else "MEDIUM"
        expected_response_hours = 48
        reasons.append("Standard workplace verification and social enquiry.")

    return {
        "recommendedAgency": recommended_agency,
        "backupAgency": backup_agency,
        "priority": priority,
        "expectedResponseHours": expected_response_hours,
        "reasons": reasons,
        "recommendedOfficerRole": f"{recommended_agency}_OFFICER"
    }
