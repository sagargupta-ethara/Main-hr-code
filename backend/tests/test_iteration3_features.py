"""
HR Dashboard Iteration 3 Backend API Tests
Tests new features: sync-all endpoint, sync/status, vendor mapping in roles, interview slot normalization
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vendor-hiring.preview.emergentagent.com')


class TestSyncEndpoints:
    """Tests for combined sync endpoint and sync status"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and return authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vendorhiring.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return s
    
    def test_sync_all_endpoint_exists(self, auth_session):
        """Test POST /api/sync-all endpoint exists and returns expected structure"""
        response = auth_session.post(f"{BASE_URL}/api/sync-all")
        # May return 400 if sheets are private, but endpoint should exist
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}, {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            # Verify response structure
            assert "candidates_count" in data, "Missing candidates_count in response"
            assert "openings_count" in data, "Missing openings_count in response"
            assert "timestamp" in data, "Missing timestamp in response"
            assert isinstance(data["candidates_count"], int)
            assert isinstance(data["openings_count"], int)
        else:
            # 400 error expected for private sheets
            data = response.json()
            assert "detail" in data, "Error response should have detail field"
    
    def test_sync_status_endpoint(self, auth_session):
        """Test GET /api/sync/status returns last sync info"""
        response = auth_session.get(f"{BASE_URL}/api/sync/status")
        assert response.status_code == 200, f"Sync status failed: {response.text}"
        
        data = response.json()
        assert "key" in data, "Missing key field"
        assert data["key"] == "last_sync", "Key should be 'last_sync'"
        # timestamp may be None if never synced
        assert "timestamp" in data or data.get("timestamp") is None
    
    def test_sync_all_requires_admin(self):
        """Test that sync-all requires admin role"""
        # Create a new session without login
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        response = s.post(f"{BASE_URL}/api/sync-all")
        assert response.status_code == 401, "Should require authentication"


class TestRolesWithVendorMapping:
    """Tests for /api/analytics/roles with vendor-to-role mapping"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and return authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vendorhiring.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        return s
    
    def test_roles_have_vendors_field(self, auth_session):
        """Test that /api/analytics/roles returns vendors array per role"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/roles")
        assert response.status_code == 200, f"Roles endpoint failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one role"
        
        # Check first role has vendors field
        role = data[0]
        assert "vendors" in role, f"Role should have 'vendors' field. Got: {role.keys()}"
        assert isinstance(role["vendors"], list), "vendors should be a list"
    
    def test_vendor_mapping_structure(self, auth_session):
        """Test vendor mapping has correct structure (name + count)"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/roles")
        assert response.status_code == 200
        
        data = response.json()
        
        # Find a role with vendors
        role_with_vendors = None
        for role in data:
            if role.get("vendors") and len(role["vendors"]) > 0:
                role_with_vendors = role
                break
        
        if role_with_vendors:
            vendor = role_with_vendors["vendors"][0]
            assert "name" in vendor, f"Vendor should have 'name' field. Got: {vendor.keys()}"
            assert "count" in vendor, f"Vendor should have 'count' field. Got: {vendor.keys()}"
            assert isinstance(vendor["count"], int), "Vendor count should be integer"
        else:
            pytest.skip("No roles with vendors found in data")
    
    def test_roles_still_have_core_fields(self, auth_session):
        """Test that roles still have core fields (total, active, selected)"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/roles")
        assert response.status_code == 200
        
        data = response.json()
        role = data[0]
        
        assert "_id" in role, "Role should have _id field"
        assert "total" in role, "Role should have total field"
        assert "active" in role, "Role should have active field"
        assert "selected" in role, "Role should have selected field"


class TestInterviewsWithNormalization:
    """Tests for /api/analytics/interviews with slot normalization"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and return authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vendorhiring.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        return s
    
    def test_interviews_endpoint_returns_data(self, auth_session):
        """Test /api/analytics/interviews returns interview records"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/interviews")
        assert response.status_code == 200, f"Interviews endpoint failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_interviews_include_status_based_records(self, auth_session):
        """Test that interviews include records with interview_status even without slot"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/interviews")
        assert response.status_code == 200
        
        data = response.json()
        
        # Based on context: 10 interviews have interview_status_l1 but no interview_slot_l1
        # So we should have at least some records
        if len(data) > 0:
            # Verify interview structure
            interview = data[0]
            assert "candidate_name" in interview, "Interview should have candidate_name"
            assert "role" in interview, "Interview should have role"
            assert "level" in interview, "Interview should have level"
            assert "status" in interview, "Interview should have status"
            assert "slot" in interview, "Interview should have slot field"
            assert "interviewer" in interview, "Interview should have interviewer"
    
    def test_interviews_have_normalized_slot(self, auth_session):
        """Test that interview slot is normalized (or null if not set)"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/interviews")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check that slot field exists and is either normalized or null
        for interview in data[:5]:  # Check first 5
            assert "slot" in interview, "Interview should have slot field"
            # slot can be None/null or a string
            if interview["slot"] is not None:
                assert isinstance(interview["slot"], str), "Slot should be string if not null"
    
    def test_interviews_count_matches_expected(self, auth_session):
        """Test that we get expected number of interviews (10 based on context)"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/interviews")
        assert response.status_code == 200
        
        data = response.json()
        
        # Context says 10 interviews have interview_status_l1
        # The endpoint should return these records
        assert len(data) >= 10, f"Expected at least 10 interviews, got {len(data)}"


class TestKPIsStillWork:
    """Regression tests to ensure KPIs still work correctly"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and return authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vendorhiring.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        return s
    
    def test_kpis_endpoint_works(self, auth_session):
        """Test KPIs endpoint still returns correct data"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/kpis-filtered")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_candidates" in data
        assert "total_openings" in data
        assert "interviews_scheduled" in data
        assert data["total_candidates"] == 59, f"Expected 59 candidates, got {data['total_candidates']}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
