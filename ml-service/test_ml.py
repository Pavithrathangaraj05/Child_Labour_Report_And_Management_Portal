import unittest
from risk_engine import RiskAssessmentEngine
from duplicate_engine import DuplicateAndRepeatDetector
from agency_engine import recommend_agency_assignment

class TestMLService(unittest.TestCase):
    def setUp(self):
        self.risk_engine = RiskAssessmentEngine()
        self.dup_detector = DuplicateAndRepeatDetector()

    def test_normal_case(self):
        case = {
            "childInformation": {"approximateAge": 14, "ageRange": "AGE_14_17", "immediateDangerObserved": "NO"},
            "labourCategories": ["SHOP_GARAGE"],
            "situationDetails": {"childActivity": "helping clean tools in bicycle shop", "currentlyInDanger": "NO"},
            "emergencyIndicator": False
        }
        res = self.risk_engine.evaluate(case)
        self.assertIn(res["riskLevel"], ["LOW", "MEDIUM"])
        self.assertFalse(res["isEmergency"])
        self.assertTrue(len(res["factors"]) > 0)
        print("Normal case passed: Score=", res["riskScore"], "Level=", res["riskLevel"])

    def test_emergency_case(self):
        case = {
            "childInformation": {"approximateAge": 8, "ageRange": "AGE_6_10", "immediateDangerObserved": "YES", "numberOfChildren": 3},
            "labourCategories": ["HAZARDOUS", "FACTORY"],
            "situationDetails": {"childActivity": "trapped near chemical machinery, beaten with severe injury", "currentlyInDanger": "YES"},
            "emergencyIndicator": True
        }
        res = self.risk_engine.evaluate(case)
        self.assertEqual(res["riskLevel"], "CRITICAL")
        self.assertTrue(res["isEmergency"])
        self.assertGreaterEqual(res["riskScore"], 75)
        print("Emergency case passed: Score=", res["riskScore"], "Level=", res["riskLevel"])

    def test_agency_routing(self):
        res = recommend_agency_assignment({"riskLevel": "CRITICAL", "isEmergency": True, "labourCategories": ["TRAFFICKING_EXPLOITATION"]})
        self.assertEqual(res["recommendedAgency"], "POLICE")

        res_lab = recommend_agency_assignment({"riskLevel": "MEDIUM", "isEmergency": False, "labourCategories": ["HOTEL_RESTAURANT"]})
        self.assertEqual(res_lab["recommendedAgency"], "LABOUR")

        res_cwc = recommend_agency_assignment({"riskLevel": "HIGH", "isEmergency": False, "labourCategories": ["BEGGING"]})
        self.assertEqual(res_cwc["recommendedAgency"], "CWC")
        print("Agency routing passed.")

    def test_duplicate_and_repeat(self):
        curr = {
            "location": {"district": "Central District", "villageOrCity": "Metro", "coordinates": {"lat": 12.9716, "lng": 77.5946}},
            "establishmentName": "Sri Lakshmi Brick Kiln",
            "employerName": "Ramesh Kumar",
            "labourCategories": ["CONSTRUCTION"],
            "situationDetails": {"childActivity": "carrying bricks under sun"}
        }
        cand = [{
            "caseId": "CL-2026-000001",
            "location": {"district": "Central District", "villageOrCity": "Metro", "coordinates": {"lat": 12.9718, "lng": 77.5948}},
            "establishmentName": "Sri Lakshmi Brick Kiln",
            "employerName": "Ramesh Kumar",
            "labourCategories": ["CONSTRUCTION"],
            "situationDetails": {"childActivity": "carrying bricks at brick kiln"}
        }]
        res = self.dup_detector.analyze(curr, cand)
        self.assertTrue(res["isPotentialDuplicate"])
        print("Duplicate detection passed:", res)

if __name__ == "__main__":
    unittest.main()
