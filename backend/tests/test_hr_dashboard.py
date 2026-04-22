"""
HR Dashboard Backend API Tests
Tests all core API endpoints for the Vendor Hiring Dashboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vendor-hiring.preview.emergentagent.com')

class TestAuth:
    """Authentication endpoint tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a session for authenticated requests"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        return s
    
    @pytest.fixture(scope="class")
    def auth_session(self, session):
        """Login and return authenticated session"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vendorhiring.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return session
    
    def test_login_success(self, session):
        """Test successful login with valid credentials"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vendorhiring.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert data["email"] == "admin@vendorhiring.com"
        assert data["role"] == "admin"
    
    def test_login_invalid_credentials(self, session):
        """Test login with invalid credentials"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401


class TestKPIs:
    """KPI endpoint tests"""
    
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
    
    def test_kpis_filtered_no_params(self, auth_session):
        """Test KPIs endpoint without date filters"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/kpis-filtered")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected KPI fields exist
        assert "total_openings" in data
        assert "total_candidates" in data
        assert "active_candidates" in data
        assert "shortlisted" in data
        assert "interviews_scheduled" in data
        assert "rejected" in data
        assert "selected" in data
        
        # Verify expected values based on test data
        assert data["total_openings"] == 10
        assert data["total_candidates"] == 59
        assert data["interviews_scheduled"] == 12
        assert data["selected"] == 0
        assert data["active_candidates"] == 33
        assert data["shortlisted"] == 18
        assert data["rejected"] == 26
    
    def test_kpis_filtered_with_date_range(self, auth_session):
        """Test KPIs endpoint with date filters"""
        response = auth_session.get(
            f"{BASE_URL}/api/analytics/kpis-filtered",
            params={"from_date": "2025-01-01", "to_date": "2025-12-31"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # With date filter outside data range, should return 0
        assert data["total_candidates"] == 0


class TestContacts:
    """Contacts endpoint tests"""
    
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
    
    def test_contacts_list(self, auth_session):
        """Test contacts endpoint returns data"""
        response = auth_session.get(f"{BASE_URL}/api/contacts")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify contact structure
        contact = data[0]
        assert "name" in contact
        assert "type" in contact
        
        # Verify we have different contact types
        types = set(c["type"] for c in data)
        assert "Vendor" in types or "HR SPOC" in types or "Candidate" in types
    
    def test_contacts_search(self, auth_session):
        """Test contacts search functionality"""
        response = auth_session.get(f"{BASE_URL}/api/contacts", params={"search": "Bravia"})
        assert response.status_code == 200
        data = response.json()
        
        # All results should contain "Bravia" in name or vendor
        for contact in data:
            assert "bravia" in (contact.get("name", "") or "").lower() or \
                   "bravia" in (contact.get("vendor", "") or "").lower()


class TestAnalytics:
    """Analytics endpoint tests"""
    
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
    
    def test_vendors_analytics(self, auth_session):
        """Test vendor analytics endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/vendors")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify vendor data structure
        vendor = data[0]
        assert "_id" in vendor
        assert "total" in vendor
        assert "shortlisted" in vendor
        assert "rejected" in vendor
        assert "selected" in vendor
    
    def test_pipeline_analytics(self, auth_session):
        """Test pipeline analytics endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/pipeline")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify pipeline data structure
        stage = data[0]
        assert "_id" in stage
        assert "count" in stage
    
    def test_roles_analytics(self, auth_session):
        """Test roles analytics endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/roles")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify role data structure
        role = data[0]
        assert "_id" in role
        assert "total" in role
        assert "active" in role
        assert "selected" in role
    
    def test_interviews_analytics(self, auth_session):
        """Test interviews analytics endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/interviews")
        assert response.status_code == 200
        data = response.json()
        
        # Returns empty list if no interviews scheduled
        assert isinstance(data, list)


class TestCandidates:
    """Candidates endpoint tests"""
    
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
    
    def test_candidates_list(self, auth_session):
        """Test candidates list endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/candidates")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 59  # Expected candidate count
        
        # Verify candidate structure
        candidate = data[0]
        assert "candidate_name" in candidate
        assert "role" in candidate
        assert "vendor" in candidate
        assert "current_stage" in candidate
    
    def test_candidates_filter_by_stage(self, auth_session):
        """Test candidates filtering by stage"""
        response = auth_session.get(f"{BASE_URL}/api/candidates", params={"stage": "Rejected"})
        assert response.status_code == 200
        data = response.json()
        
        # All returned candidates should be rejected
        for candidate in data:
            assert candidate.get("current_stage") == "Rejected"


class TestExport:
    """Export endpoint tests"""
    
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
    
    def test_export_candidates(self, auth_session):
        """Test candidates export endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/export/candidates")
        assert response.status_code == 200
        
        # Verify it returns an Excel file
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers.get("content-type", "")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
