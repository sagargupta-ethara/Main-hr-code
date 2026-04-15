"""
Iteration 8 Backend Tests - 6 Specific Fixes
1. Shortlisted = resume_status=Shortlisted AND NOT final_status=Rejected (now 3, was 20)
2. Interview Scheduled = only future/today interview slots (currently 0)
3. Pipeline: 'Submitted' replaces 'New' for past submission dates
4. JD file clickable with PDF preview via /api/openings/jd/download
5. Interviews: L1 Feedback or Remark (already correct)
6. Stage Drop-off: click shows actual candidate list via /api/analytics/dropoff-detail
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIteration8Fixes:
    """Test the 6 specific fixes for iteration 8"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth cookies"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@vendorhiring.com", "password": "admin123"}
        )
        if login_response.status_code != 200:
            pytest.skip("Authentication failed - skipping tests")
        self.cookies = login_response.cookies
        yield
    
    # Fix 1: Shortlisted = resume_status=Shortlisted AND NOT final_status=Rejected
    def test_kpis_shortlisted_excludes_rejected(self):
        """Shortlisted count should be 3 (excludes final_status=Rejected from shortlisted)"""
        response = self.session.get(f"{BASE_URL}/api/analytics/kpis", cookies=self.cookies)
        assert response.status_code == 200, f"KPIs endpoint failed: {response.text}"
        
        data = response.json()
        assert "shortlisted" in data, "shortlisted field missing from KPIs"
        
        # Per problem statement: shortlisted should be 3 (was 20 before fix)
        shortlisted = data["shortlisted"]
        print(f"Shortlisted count: {shortlisted}")
        assert shortlisted == 3, f"Expected shortlisted=3, got {shortlisted}"
    
    def test_shortlisted_candidates_verify_logic(self):
        """Verify shortlisted candidates have resume_status=shortlist AND NOT final_status=reject"""
        response = self.session.get(f"{BASE_URL}/api/candidates", cookies=self.cookies)
        assert response.status_code == 200
        
        candidates = response.json()
        shortlisted = []
        for c in candidates:
            rs = (c.get("resume_status") or "").lower()
            fs = (c.get("final_status") or "").lower()
            if "shortlist" in rs and "reject" not in fs:
                shortlisted.append(c)
        
        print(f"Shortlisted candidates (resume_status~shortlist AND NOT final_status~reject): {len(shortlisted)}")
        for c in shortlisted:
            print(f"  - {c.get('candidate_name')}: resume_status={c.get('resume_status')}, final_status={c.get('final_status')}")
        
        assert len(shortlisted) == 3, f"Expected 3 shortlisted candidates, got {len(shortlisted)}"
    
    # Fix 2: Interview Scheduled = only future/today interview slots
    def test_kpis_interviews_scheduled_future_only(self):
        """Interviews scheduled should be 0 (no future interview slots)"""
        response = self.session.get(f"{BASE_URL}/api/analytics/kpis", cookies=self.cookies)
        assert response.status_code == 200
        
        data = response.json()
        assert "interviews_scheduled" in data, "interviews_scheduled field missing"
        
        # Per problem statement: interviews_scheduled should be 0
        interviews = data["interviews_scheduled"]
        print(f"Interviews scheduled: {interviews}")
        assert interviews == 0, f"Expected interviews_scheduled=0, got {interviews}"
    
    # Fix 3: Pipeline shows 'Submitted' instead of 'New' for past submission dates
    def test_pipeline_shows_submitted_stage(self):
        """Pipeline should show 'Submitted' stage (not 'New') with count=15"""
        response = self.session.get(f"{BASE_URL}/api/analytics/pipeline", cookies=self.cookies)
        assert response.status_code == 200
        
        data = response.json()
        stages = {item["_id"]: item["count"] for item in data}
        print(f"Pipeline stages: {stages}")
        
        # Should have 'Submitted' stage, not 'New'
        assert "Submitted" in stages, f"'Submitted' stage missing from pipeline. Stages: {list(stages.keys())}"
        assert "New" not in stages, f"'New' stage should not exist. Stages: {list(stages.keys())}"
        
        # Per problem statement: Submitted count should be 15
        submitted_count = stages.get("Submitted", 0)
        print(f"Submitted count: {submitted_count}")
        assert submitted_count == 15, f"Expected Submitted=15, got {submitted_count}"
    
    # Fix 4: JD file download endpoint
    def test_jd_download_endpoint_exists(self):
        """JD download endpoint should exist and return file for uploaded JD"""
        # First check if there's a JD for Python Fullstack role
        jd_info_response = self.session.get(
            f"{BASE_URL}/api/openings/jd?role_name=Python+Fullstack",
            cookies=self.cookies
        )
        assert jd_info_response.status_code == 200
        jd_info = jd_info_response.json()
        print(f"JD info for Python Fullstack: {jd_info}")
        
        # Test download endpoint
        download_response = self.session.get(
            f"{BASE_URL}/api/openings/jd/download?role_name=Python+Fullstack",
            cookies=self.cookies
        )
        
        # If JD was uploaded, should return file; otherwise 404
        if jd_info.get("filename"):
            assert download_response.status_code == 200, f"JD download failed: {download_response.text}"
            print(f"JD download successful, content-type: {download_response.headers.get('content-type')}")
        else:
            # No JD uploaded yet - endpoint should return 404
            assert download_response.status_code == 404, f"Expected 404 for missing JD, got {download_response.status_code}"
            print("No JD uploaded for Python Fullstack - 404 is expected")
    
    # Fix 5: Interviews feedback shows Remark when L1 Feedback is empty
    def test_interviews_include_remarks(self):
        """Interview data should include remarks field"""
        response = self.session.get(f"{BASE_URL}/api/analytics/interviews", cookies=self.cookies)
        assert response.status_code == 200
        
        interviews = response.json()
        print(f"Total interviews: {len(interviews)}")
        
        # Check that interviews have feedback/remarks fields
        for i in interviews[:5]:  # Check first 5
            print(f"  - {i.get('candidate_name')}: feedback={i.get('feedback')}, remarks={i.get('remarks')}")
        
        # Verify structure includes remarks
        if interviews:
            sample = interviews[0]
            assert "remarks" in sample, "remarks field missing from interview data"
            assert "feedback" in sample, "feedback field missing from interview data"
    
    # Fix 6: Drop-off detail endpoint returns candidate list
    def test_dropoff_detail_endpoint(self):
        """Drop-off detail endpoint should return candidate list with counts"""
        response = self.session.get(
            f"{BASE_URL}/api/analytics/dropoff-detail?stage_from=submission&stage_to=shortlist",
            cookies=self.cookies
        )
        assert response.status_code == 200, f"Drop-off detail failed: {response.text}"
        
        data = response.json()
        print(f"Drop-off detail response: {data.keys()}")
        
        # Verify response structure
        assert "stage_from" in data, "stage_from missing"
        assert "stage_to" in data, "stage_to missing"
        assert "from_count" in data, "from_count missing"
        assert "to_count" in data, "to_count missing"
        assert "dropped_count" in data, "dropped_count missing"
        assert "dropped_candidates" in data, "dropped_candidates missing"
        
        print(f"From count: {data['from_count']}, To count: {data['to_count']}, Dropped: {data['dropped_count']}")
        print(f"Dropped candidates: {len(data['dropped_candidates'])}")
        
        # Verify dropped_candidates is a list with expected fields
        if data["dropped_candidates"]:
            sample = data["dropped_candidates"][0]
            assert "candidate_name" in sample, "candidate_name missing from dropped candidate"
            assert "role" in sample, "role missing from dropped candidate"
            assert "vendor" in sample, "vendor missing from dropped candidate"
            assert "current_stage" in sample, "current_stage missing from dropped candidate"
    
    def test_dropoff_detail_shortlist_to_interview(self):
        """Test drop-off from shortlist to interview stage"""
        response = self.session.get(
            f"{BASE_URL}/api/analytics/dropoff-detail?stage_from=shortlist&stage_to=interview",
            cookies=self.cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        print(f"Shortlist->Interview: from={data['from_count']}, to={data['to_count']}, dropped={data['dropped_count']}")
    
    # Additional verification tests
    def test_kpis_other_values_correct(self):
        """Verify other KPI values are still correct"""
        response = self.session.get(f"{BASE_URL}/api/analytics/kpis", cookies=self.cookies)
        assert response.status_code == 200
        
        data = response.json()
        print(f"All KPIs: {data}")
        
        # Per problem statement: Active=19, Rejected=41, Selected=1
        assert data.get("active_candidates") == 19, f"Expected active=19, got {data.get('active_candidates')}"
        assert data.get("rejected") == 41, f"Expected rejected=41, got {data.get('rejected')}"
        assert data.get("selected") == 1, f"Expected selected=1, got {data.get('selected')}"
        assert data.get("total_candidates") == 60, f"Expected total=60, got {data.get('total_candidates')}"
    
    def test_pipeline_rejected_count(self):
        """Verify Rejected count in pipeline is 41"""
        response = self.session.get(f"{BASE_URL}/api/analytics/pipeline", cookies=self.cookies)
        assert response.status_code == 200
        
        data = response.json()
        stages = {item["_id"]: item["count"] for item in data}
        
        rejected_count = stages.get("Rejected", 0)
        print(f"Rejected count in pipeline: {rejected_count}")
        assert rejected_count == 41, f"Expected Rejected=41, got {rejected_count}"
    
    def test_pipeline_shortlisted_count(self):
        """Verify Shortlisted count in pipeline is 3"""
        response = self.session.get(f"{BASE_URL}/api/analytics/pipeline", cookies=self.cookies)
        assert response.status_code == 200
        
        data = response.json()
        stages = {item["_id"]: item["count"] for item in data}
        
        shortlisted_count = stages.get("Shortlisted", 0)
        print(f"Shortlisted count in pipeline: {shortlisted_count}")
        assert shortlisted_count == 3, f"Expected Shortlisted=3, got {shortlisted_count}"
    
    def test_pipeline_selected_count(self):
        """Verify Selected count in pipeline is 1"""
        response = self.session.get(f"{BASE_URL}/api/analytics/pipeline", cookies=self.cookies)
        assert response.status_code == 200
        
        data = response.json()
        stages = {item["_id"]: item["count"] for item in data}
        
        selected_count = stages.get("Selected", 0)
        print(f"Selected count in pipeline: {selected_count}")
        assert selected_count == 1, f"Expected Selected=1, got {selected_count}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
