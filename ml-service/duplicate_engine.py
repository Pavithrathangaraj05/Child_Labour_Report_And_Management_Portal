import math
from typing import Dict, Any, List, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes distance in meters between two lat/lng coordinates."""
    r = 6371000  # meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c

class DuplicateAndRepeatDetector:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english', max_features=500)

    def analyze(self, current_case: Dict[str, Any], candidate_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyzes a new case against existing cases in the database.
        Detects:
        1. Potential Duplicates (same incident reported multiple times in short window)
        2. Potential Repeat Offences (same employer / establishment / location with prior history)
        """
        if not candidate_cases:
            return {
                "isPotentialDuplicate": False,
                "duplicateMatches": [],
                "isPotentialRepeat": False,
                "repeatMatches": []
            }

        curr_loc = current_case.get("location") or {}
        curr_dist = (curr_loc.get("district") or "").strip().lower()
        curr_city = (curr_loc.get("villageOrCity") or "").strip().lower()
        curr_est = (current_case.get("establishmentName") or curr_loc.get("landmark") or "").strip().lower()
        curr_emp = (current_case.get("employerName") or "").strip().lower()
        curr_coords = curr_loc.get("coordinates")
        curr_cats = set(current_case.get("labourCategories") or [])
        curr_text = f"{current_case.get('situationDetails', {}).get('childActivity', '')} {current_case.get('situationDetails', {}).get('additionalDescription', '')} {curr_est}".strip()

        duplicate_matches = []
        repeat_matches = []

        texts = [curr_text if curr_text else "child labour"]
        candidate_ids = []
        for c in candidate_cases:
            c_est = (c.get("establishmentName") or c.get("location", {}).get("landmark") or "").strip().lower()
            c_text = f"{c.get('situationDetails', {}).get('childActivity', '')} {c.get('situationDetails', {}).get('additionalDescription', '')} {c_est}".strip()
            texts.append(c_text if c_text else "child labour")
            candidate_ids.append(c.get("caseId") or str(c.get("_id")))

        # Text similarity matrix using TF-IDF + Cosine Similarity
        try:
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
        except Exception:
            similarities = [0.0] * len(candidate_cases)

        for idx, cand in enumerate(candidate_cases):
            sim_score = float(similarities[idx]) if idx < len(similarities) else 0.0
            cand_loc = cand.get("location") or {}
            cand_dist = (cand_loc.get("district") or "").strip().lower()
            cand_city = (cand_loc.get("villageOrCity") or "").strip().lower()
            cand_est = (cand.get("establishmentName") or cand_loc.get("landmark") or "").strip().lower()
            cand_emp = (cand.get("employerName") or "").strip().lower()
            cand_coords = cand_loc.get("coordinates")
            cand_cats = set(cand.get("labourCategories") or [])

            # Check geographic proximity
            geo_distance_meters = None
            is_close_geo = False
            if curr_coords and cand_coords and curr_coords.get("lat") and cand_coords.get("lat"):
                geo_distance_meters = haversine_distance(
                    float(curr_coords["lat"]), float(curr_coords["lng"]),
                    float(cand_coords["lat"]), float(cand_coords["lng"])
                )
                if geo_distance_meters <= 350:
                    is_close_geo = True

            same_district = (curr_dist == cand_dist and curr_dist != "")
            same_city = (curr_city == cand_city and curr_city != "")
            same_establishment = (len(curr_est) > 3 and curr_est in cand_est) or (len(cand_est) > 3 and cand_est in curr_est)
            same_employer = (len(curr_emp) > 2 and curr_emp in cand_emp) or (len(cand_emp) > 2 and cand_emp in curr_emp)
            category_overlap = len(curr_cats.intersection(cand_cats)) > 0

            # 1. DUPLICATE CHECK (Near-identical report of the exact same event)
            dup_reasons = []
            if same_district and (is_close_geo or (same_city and same_establishment)):
                if sim_score > 0.45 or category_overlap:
                    dup_reasons.append("Same location and establishment matching active open report")
            if is_close_geo and sim_score > 0.50:
                dup_reasons.append(f"Near identical description within {int(geo_distance_meters or 0)} meters")

            if dup_reasons:
                confidence_score = int(min(max((sim_score * 50) + (40 if is_close_geo else 20) + (30 if same_establishment else 0), 50), 98))
                duplicate_matches.append({
                    "caseId": cand.get("caseId"),
                    "status": cand.get("status"),
                    "similarityScore": confidence_score,
                    "reasons": dup_reasons,
                    "distanceMeters": int(geo_distance_meters) if geo_distance_meters is not None else None
                })

            # 2. REPEAT OFFENCE CHECK (Same location/establishment/employer with history)
            repeat_reasons = []
            if same_employer:
                repeat_reasons.append(f"Matching employer name: '{cand.get('employerName')}'")
            if same_establishment and same_district:
                repeat_reasons.append(f"Matching commercial establishment: '{cand_est}'")
            if is_close_geo and category_overlap:
                repeat_reasons.append(f"Same recurring labour category at this location ({', '.join(curr_cats)})")
            elif same_district and same_city and category_overlap and sim_score > 0.35:
                repeat_reasons.append("Repeated incident patterns reported in the same vicinity")

            if repeat_reasons and not dup_reasons:
                repeat_matches.append({
                    "caseId": cand.get("caseId"),
                    "status": cand.get("status"),
                    "reasons": repeat_reasons,
                    "createdAt": cand.get("createdAt")
                })

        return {
            "isPotentialDuplicate": len(duplicate_matches) > 0,
            "duplicateMatches": duplicate_matches,
            "isPotentialRepeat": len(repeat_matches) > 0,
            "repeatMatches": repeat_matches
        }
