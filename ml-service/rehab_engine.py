"""
ChildSafe Module 3 - Rehabilitation Recommendation Engine
Generates explainable, decision-support rehabilitation recommendations for CWC and child protection officers.
"""
from typing import Dict, Any, List

class RehabilitationRecommendationEngine:
    def recommend(self, case_data: Dict[str, Any]) -> Dict[str, Any]:
        child_info = case_data.get("childInformation") or {}
        situation = case_data.get("situationDetails") or {}
        categories = case_data.get("labourCategories") or []
        vulnerabilities = child_info.get("vulnerabilityIndicators") or []
        
        age = child_info.get("approximateAge")
        age_range = child_info.get("ageRange", "UNKNOWN")
        gender = child_info.get("gender", "UNKNOWN")
        
        is_trafficked = situation.get("suspectedTrafficking") == "YES" or "TRAFFICKING_EXPLOITATION" in categories
        is_forced = situation.get("forcedToWork") == "YES" or "FORCED_LABOUR" in categories
        is_begging = situation.get("usedForBegging") == "YES" or "BEGGING" in categories
        is_out_of_school = situation.get("preventedFromSchool") == "YES" or "OUT_OF_SCHOOL" in vulnerabilities
        no_guardian = "NO_GUARDIAN_VISIBLE" in vulnerabilities or situation.get("accompaniedByAdult") == "NO"
        has_injury = "VISIBLE_INJURY" in vulnerabilities or "MALNOURISHED" in vulnerabilities

        rationale: List[str] = []

        # 1. Shelter Recommendation
        if is_trafficked or is_forced:
            shelter_type = "SAFE_HOUSE_PROTECTIVE_CUSTODY"
            rationale.append("Child in high-risk trafficking/forced labour situation requires protective custody and confidential safe-house placement.")
        elif no_guardian or "LIVING_ON_STREET" in vulnerabilities:
            shelter_type = "CHILD_CARE_INSTITUTION"
            rationale.append("Child lacks immediate verified guardian; institutional child care placement recommended under Juvenile Justice Act.")
        elif is_begging:
            shelter_type = "OPEN_SHELTER"
            rationale.append("Open shelter placement recommended for community-based transitional care and nourishment.")
        else:
            shelter_type = "FIT_FACILITY_OR_TEMPORARY_SHELTER"
            rationale.append("Temporary fit-facility shelter recommended pending CWC social investigation.")

        # 2. Education Intervention
        numeric_age = age if isinstance(age, (int, float)) else (14 if age_range == "AGE_14_17" else 9)
        if numeric_age >= 14:
            education_plan = "VOCATIONAL_SKILL_TRAINING_AND_OPEN_SCHOOL"
            rationale.append("Child is 14+ years; vocational skill development combined with National Institute of Open Schooling (NIOS) recommended.")
        elif is_out_of_school:
            education_plan = "BRIDGE_COURSE_AND_SPECIAL_TRAINING_CENTRE"
            rationale.append("Child has gap in formal education; bridge course enrollment at Special Training Centre needed prior to mainstreaming.")
        else:
            education_plan = "AGE_APPROPRIATE_MAINSTREAM_SCHOOL_ENROLLMENT"
            rationale.append("Direct enrolment into government age-appropriate formal schooling with RTE support.")

        # 3. Counselling Requirement
        if is_trafficked or is_forced or has_injury:
            counselling_type = "TRAUMA_INFORMED_PSYCHOSOCIAL_THERAPY"
            rationale.append("Severe trauma/exploitation indicators present; intensive clinical psychosocial therapy required.")
        elif is_begging or "LIVING_ON_STREET" in vulnerabilities:
            counselling_type = "BEHAVIOURAL_AND_DEVELOPMENTAL_COUNSELLING"
            rationale.append("Street situation warrants developmental counselling and de-addiction screening.")
        else:
            counselling_type = "SUPPORTIVE_CHILD_AND_FAMILY_COUNSELLING"
            rationale.append("Standard supportive child-centric counselling for emotional well-being.")

        # 4. Family Assessment Plan
        if no_guardian or is_trafficked:
            family_plan = "TRACING_INQUIRY_AND_FIT_PERSON_ASSESSMENT"
            rationale.append("Guardian untraceable or potential parental complicity; thorough background inquiry and fit-person screening needed.")
        else:
            family_plan = "HOME_STUDY_REPORT_AND_ECONOMIC_SPONSORSHIP"
            rationale.append("Social Worker Home Study Report (Form 22) and Mission Vatsalya monthly sponsorship assessment.")

        # 5. Follow-Up Frequency
        if is_trafficked or is_forced or case_data.get("riskAssessment", {}).get("riskLevel") == "CRITICAL":
            follow_up_freq = "WEEKLY"
            rationale.append("Critical risk case requires weekly in-person monitoring by Assigned Child Welfare Officer.")
        elif case_data.get("riskAssessment", {}).get("riskLevel") == "HIGH":
            follow_up_freq = "FORTNIGHTLY"
            rationale.append("High risk case requires fortnightly progress reviews.")
        else:
            follow_up_freq = "MONTHLY"
            rationale.append("Standard monthly rehabilitation monitoring for 6 months post-reintegration.")

        # 6. Reintegration Pathway
        if no_guardian and numeric_age < 6:
            pathway = "LEGAL_DECLARATION_FREE_FOR_ADOPTION"
            rationale.append("Young orphan/abandoned child under 6: initiate CARA adoption eligibility pathway if kin untraceable.")
        elif is_trafficked and no_guardian:
            pathway = "LONG_TERM_INSTITUTIONAL_CARE_AND_FOSTER"
            rationale.append("Trafficked child with compromised home environment: long-term foster care or institutional care.")
        else:
            pathway = "SUPERVISED_FAMILY_REUNIFICATION"
            rationale.append("Supervised family reunification under CWC supervision with periodic monitoring.")

        return {
            "shelterType": shelter_type,
            "educationIntervention": education_plan,
            "counsellingRequirement": counselling_type,
            "familyAssessment": family_plan,
            "followUpFrequency": follow_up_freq,
            "reintegrationPathway": pathway,
            "decisionSupportOnly": True,
            "rationale": rationale
        }
