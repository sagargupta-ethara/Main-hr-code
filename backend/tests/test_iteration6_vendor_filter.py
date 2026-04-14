"""
Iteration 6 Tests: Vendor Filter & Drilldown Features
- Home page vendor filter (updates KPIs, pipeline, candidates)
- Analysis vendor drilldown (detailed member list)
- Job Openings nominees per role
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_cookies():
    """Login and get auth cookies"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@vendorhiring.com", "password": "admin123"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.cookies

class TestVendorListEndpoint:
    """Test /api/analytics/vendor-list endpoint"""
    
    def test_vendor_list_returns_all_vendors(self, auth_cookies):
        """Should return list of all unique vendor names"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/vendor-list",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        vendors = response.json()
        assert isinstance(vendors, list)
        assert len(vendors) == 5, f"Expected 5 vendors, got {len(vendors)}"
        assert "Antino" in vendors
        assert "Bravia Services" in vendors
        assert "Nsight" in vendors
        assert "Quesscorp" in vendors
        assert "Scrabble/Jigsaw" in vendors

class TestKPIsFilteredEndpoint:
    """Test /api/analytics/kpis-filtered with vendor parameter"""
    
    def test_kpis_filtered_without_vendor(self, auth_cookies):
        """Should return all KPIs when no vendor specified"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/kpis-filtered",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_candidates" in data
        assert "active_candidates" in data
        assert "shortlisted" in data
        assert "rejected" in data
        assert data["total_candidates"] > 0
    
    def test_kpis_filtered_with_antino_vendor(self, auth_cookies):
        """Should return filtered KPIs for Antino vendor"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/kpis-filtered?vendor=Antino",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        data = response.json()
        # Verify Antino-specific data
        assert data["total_candidates"] == 16, f"Expected 16 Antino candidates, got {data['total_candidates']}"
        assert data["active_candidates"] == 6, f"Expected 6 active Antino candidates, got {data['active_candidates']}"
        assert data["shortlisted"] == 4, f"Expected 4 shortlisted, got {data['shortlisted']}"
        assert data["rejected"] == 10, f"Expected 10 rejected, got {data['rejected']}"
    
    def test_kpis_filtered_with_date_and_vendor(self, auth_cookies):
        """Should support both date and vendor filters"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/kpis-filtered?vendor=Antino&from_date=2026-01-01&to_date=2026-12-31",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_candidates" in data

class TestPipelineFilteredEndpoint:
    """Test /api/analytics/pipeline with vendor parameter"""
    
    def test_pipeline_without_vendor(self, auth_cookies):
        """Should return all pipeline stages when no vendor specified"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/pipeline",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_pipeline_with_antino_vendor(self, auth_cookies):
        """Should return filtered pipeline for Antino vendor"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/pipeline?vendor=Antino",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify Antino pipeline stages
        stages = {item["_id"]: item["count"] for item in data}
        assert "Rejected" in stages
        assert stages["Rejected"] == 10, f"Expected 10 rejected, got {stages.get('Rejected')}"

class TestVendorDetailEndpoint:
    """Test /api/analytics/vendor-detail endpoint"""
    
    def test_vendor_detail_returns_complete_data(self, auth_cookies):
        """Should return detailed vendor info with members list"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/vendor-detail?vendor_name=Antino",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert data["vendor"] == "Antino"
        assert data["total"] == 16
        assert data["shortlisted"] == 4
        assert data["rejected"] == 10
        assert "shortlist_rate" in data
        assert "selection_rate" in data
        
        # Verify stages breakdown
        assert "stages" in data
        assert isinstance(data["stages"], list)
        assert len(data["stages"]) > 0
        
        # Verify roles contributed
        assert "roles" in data
        assert isinstance(data["roles"], list)
        
        # Verify members list
        assert "members" in data
        assert isinstance(data["members"], list)
        assert len(data["members"]) == 16
        
        # Verify member structure
        member = data["members"][0]
        assert "candidate_name" in member
        assert "role" in member
        assert "current_stage" in member
        assert "work_experience" in member

class TestCandidatesVendorFilter:
    """Test /api/candidates with vendor parameter"""
    
    def test_candidates_filtered_by_vendor(self, auth_cookies):
        """Should return only candidates from specified vendor"""
        response = requests.get(
            f"{BASE_URL}/api/candidates?vendor=Antino",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        candidates = response.json()
        assert len(candidates) == 16
        # Verify all candidates are from Antino
        for c in candidates:
            assert c["vendor"].lower() == "antino", f"Found non-Antino candidate: {c['vendor']}"

class TestNomineesEndpoint:
    """Test /api/openings/nominees endpoint"""
    
    def test_nominees_for_python_fullstack(self, auth_cookies):
        """Should return all nominees for Python Fullstack role"""
        response = requests.get(
            f"{BASE_URL}/api/openings/nominees?role_name=Python+Fullstack",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        nominees = response.json()
        assert isinstance(nominees, list)
        assert len(nominees) == 25, f"Expected 25 Python Fullstack nominees, got {len(nominees)}"
        
        # Verify nominee structure
        nominee = nominees[0]
        assert "candidate_name" in nominee
        assert "vendor" in nominee
        assert "current_stage" in nominee
        assert "work_experience" in nominee
    
    def test_nominees_for_devops(self, auth_cookies):
        """Should return nominees for DevOps role"""
        response = requests.get(
            f"{BASE_URL}/api/openings/nominees?role_name=DevOps",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        nominees = response.json()
        assert isinstance(nominees, list)
        assert len(nominees) > 0
    
    def test_nominees_for_nonexistent_role(self, auth_cookies):
        """Should return empty list for non-existent role"""
        response = requests.get(
            f"{BASE_URL}/api/openings/nominees?role_name=NonExistentRole12345",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        nominees = response.json()
        assert nominees == []

class TestExistingEndpointsRegression:
    """Verify existing endpoints still work (no regressions)"""
    
    def test_kpis_endpoint(self, auth_cookies):
        """Original KPIs endpoint should still work"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/kpis",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_candidates" in data
        assert "total_openings" in data
    
    def test_vendors_endpoint(self, auth_cookies):
        """Original vendors analytics endpoint should still work"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/vendors",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 5
    
    def test_roles_endpoint(self, auth_cookies):
        """Original roles analytics endpoint should still work"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/roles",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_candidates_endpoint(self, auth_cookies):
        """Original candidates endpoint should still work"""
        response = requests.get(
            f"{BASE_URL}/api/candidates",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        candidates = response.json()
        assert isinstance(candidates, list)
        assert len(candidates) > 0
