from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import uvicorn

from risk_engine import RiskAssessmentEngine
from duplicate_engine import DuplicateAndRepeatDetector
from agency_engine import recommend_agency_assignment
from rehab_engine import RehabilitationRecommendationEngine

app = FastAPI(
    title="ChildSafe ML Intelligence Service",
    description="Explainable Risk Scoring, Emergency Detection, Duplicate Analysis, and Agency Routing API",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

risk_engine = RiskAssessmentEngine()
duplicate_detector = DuplicateAndRepeatDetector()
rehab_engine = RehabilitationRecommendationEngine()

class CaseData(BaseModel):
    childInformation: Optional[Dict[str, Any]] = None
    labourCategories: Optional[List[str]] = []
    location: Optional[Dict[str, Any]] = None
    situationDetails: Optional[Dict[str, Any]] = None
    emergencyIndicator: Optional[bool] = False
    repeatReportsCount: Optional[int] = 0
    historicalVerifiedCases: Optional[int] = 0
    establishmentName: Optional[str] = None
    employerName: Optional[str] = None

class DuplicateRequest(BaseModel):
    currentCase: Dict[str, Any]
    candidateCases: List[Dict[str, Any]] = []

class AgencyRequest(BaseModel):
    riskLevel: str
    riskScore: int
    isEmergency: bool
    labourCategories: List[str] = []
    childInformation: Optional[Dict[str, Any]] = None
    location: Optional[Dict[str, Any]] = None

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "child-safe-ml",
        "version": "2.0.0",
        "models": ["explainable_risk_v2", "tfidf_duplicate_v1", "agency_router_v2"]
    }

@app.post("/score-risk")
def score_risk(data: CaseData):
    result = risk_engine.evaluate(data.model_dump())
    return result

@app.post("/detect-duplicates")
def detect_duplicates(req: DuplicateRequest):
    result = duplicate_detector.analyze(req.currentCase, req.candidateCases)
    return result

@app.post("/recommend-agency")
def recommend_agency(req: AgencyRequest):
    result = recommend_agency_assignment(req.model_dump())
    return result

@app.post("/recommend-rehabilitation")
def recommend_rehabilitation(req: Dict[str, Any]):
    case_data = req.get("case") if "case" in req else req
    return rehab_engine.recommend(case_data)

@app.post("/process-case")
def process_case(payload: Dict[str, Any]):
    """
    All-in-one AI Intake pipeline endpoint:
    1. Evaluates Risk Score and Emergency Triggers
    2. Runs Duplicate & Repeat Offence checks against candidates
    3. Recommends Assigned Agency, Officer Role & Priority
    """
    case_data = payload.get("case", {})
    candidates = payload.get("candidates", [])

    risk_result = risk_engine.evaluate(case_data)
    dup_result = duplicate_detector.analyze(case_data, candidates)
    agency_input = {
        "riskLevel": risk_result["riskLevel"],
        "riskScore": risk_result["riskScore"],
        "isEmergency": risk_result["isEmergency"],
        "labourCategories": case_data.get("labourCategories", []),
        "childInformation": case_data.get("childInformation", {}),
        "location": case_data.get("location", {})
    }
    agency_result = recommend_agency_assignment(agency_input)

    return {
        "riskAssessment": risk_result,
        "duplicateCheck": dup_result,
        "agencyRecommendation": agency_result
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=5001, reload=False)
