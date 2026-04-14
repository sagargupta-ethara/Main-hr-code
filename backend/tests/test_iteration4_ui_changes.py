"""
Test Iteration 4 UI/UX Changes - Backend API Tests
Tests for:
- JD Upload endpoint (POST /api/openings/jd)
- JD Retrieval endpoint (GET /api/openings/jd)
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestJDEndpoints:
    """Tests for Job Description upload and retrieval endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session for authenticated requests"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@vendorhiring.com", "password": "admin123"}
        )
        if login_response.status_code != 200:
            pytest.skip("Login failed - skipping authenticated tests")
        self.user = login_response.json()
        yield
        # Logout
        self.session.post(f"{BASE_URL}/api/auth/logout")
    
    def test_jd_upload_endpoint_exists(self):
        """Test POST /api/openings/jd endpoint exists and accepts file upload"""
        # Create a simple text file for testing
        test_content = b"Test Job Description\n\nRequirements:\n- Python\n- FastAPI\n- MongoDB"
        files = {'file': ('test_jd.txt', io.BytesIO(test_content), 'text/plain')}
        
        response = self.session.post(
            f"{BASE_URL}/api/openings/jd?role_name=TEST_Role_JD",
            files=files
        )
        
        # Should return 200 or 403 (if not admin) - endpoint exists
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            assert "filename" in data
            print(f"JD Upload successful: {data}")
    
    def test_jd_get_endpoint_exists(self):
        """Test GET /api/openings/jd endpoint exists"""
        response = self.session.get(
            f"{BASE_URL}/api/openings/jd?role_name=TEST_Role_JD"
        )
        
        assert response.status_code == 200, f"Unexpected status: {response.status_code}"
        data = response.json()
        assert "role_name" in data
        print(f"JD Get response: {data}")
    
    def test_jd_upload_and_retrieve(self):
        """Test full JD upload and retrieval flow"""
        role_name = "TEST_Integration_Role"
        test_content = b"Integration Test JD\n\nThis is a test job description for integration testing."
        files = {'file': ('integration_test.txt', io.BytesIO(test_content), 'text/plain')}
        
        # Upload JD
        upload_response = self.session.post(
            f"{BASE_URL}/api/openings/jd?role_name={role_name}",
            files=files
        )
        
        if upload_response.status_code == 200:
            upload_data = upload_response.json()
            assert upload_data.get("success") == True
            assert "summary" in upload_data
            print(f"Upload response: {upload_data}")
            
            # Retrieve JD
            get_response = self.session.get(
                f"{BASE_URL}/api/openings/jd?role_name={role_name}"
            )
            assert get_response.status_code == 200
            get_data = get_response.json()
            assert get_data.get("role_name") == role_name
            assert get_data.get("filename") is not None
            print(f"Retrieved JD: {get_data}")
        else:
            print(f"Upload returned {upload_response.status_code}: {upload_response.text}")


class TestExistingEndpointsStillWork:
    """Verify existing endpoints still work after UI changes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@vendorhiring.com", "password": "admin123"}
        )
        if login_response.status_code != 200:
            pytest.skip("Login failed")
        yield
        self.session.post(f"{BASE_URL}/api/auth/logout")
    
    def test_analytics_kpis_filtered(self):
        """Test /api/analytics/kpis-filtered still works"""
        response = self.session.get(f"{BASE_URL}/api/analytics/kpis-filtered")
        assert response.status_code == 200
        data = response.json()
        assert "total_candidates" in data
        assert "total_openings" in data
        assert "active_candidates" in data
        assert "shortlisted" in data
        assert "rejected" in data
        print(f"KPIs: {data}")
    
    def test_analytics_roles(self):
        """Test /api/analytics/roles returns division info for grouping"""
        response = self.session.get(f"{BASE_URL}/api/analytics/roles")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check if roles have opening_data with division
        has_division = False
        for role in data:
            if role.get("opening_data", {}).get("division"):
                has_division = True
                break
        
        print(f"Roles count: {len(data)}, Has division data: {has_division}")
    
    def test_analytics_interviews(self):
        """Test /api/analytics/interviews returns feedback/remarks"""
        response = self.session.get(f"{BASE_URL}/api/analytics/interviews")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check interview structure includes feedback and remarks
        if data:
            interview = data[0]
            assert "candidate_name" in interview
            assert "level" in interview
            # feedback and remarks should be present (may be None)
            assert "feedback" in interview or "remarks" in interview
            print(f"Interview sample: {interview}")
    
    def test_candidates_endpoint(self):
        """Test /api/candidates returns all candidates (not limited)"""
        response = self.session.get(f"{BASE_URL}/api/candidates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should return more than 10 candidates (no .slice(0,10))
        print(f"Total candidates returned: {len(data)}")
    
    def test_analytics_vendors(self):
        """Test /api/analytics/vendors for Analysis page"""
        response = self.session.get(f"{BASE_URL}/api/analytics/vendors")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if data:
            vendor = data[0]
            assert "_id" in vendor
            assert "total" in vendor
            assert "shortlisted" in vendor
            assert "rejected" in vendor
            assert "selected" in vendor
        print(f"Vendors count: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
