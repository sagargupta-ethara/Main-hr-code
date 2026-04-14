"""
Iteration 5 Bug Fixes Tests
Tests for:
1. JD upload extracts text from TXT files correctly
2. JD upload extracts text from PDF files (PyMuPDF installed)
3. Backend APIs still working correctly
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_cookies(self):
        """Get authentication cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@vendorhiring.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.cookies
    
    def test_login_success(self):
        """Test admin login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@vendorhiring.com", "password": "admin123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@vendorhiring.com"
        assert data["role"] == "admin"
        print("PASS: Admin login successful")


class TestJDUpload:
    """JD Upload endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_cookies(self):
        """Get authentication cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@vendorhiring.com", "password": "admin123"}
        )
        assert response.status_code == 200
        return response.cookies
    
    def test_jd_upload_txt_file(self, auth_cookies):
        """Test JD upload with TXT file extracts text correctly"""
        txt_content = b"Test Job Description\n\nRequirements:\n- Python\n- FastAPI\n- MongoDB"
        files = {'file': ('test_jd.txt', io.BytesIO(txt_content), 'text/plain')}
        
        response = requests.post(
            f"{BASE_URL}/api/openings/jd?role_name=TEST_TXT_Upload",
            files=files,
            cookies=auth_cookies
        )
        
        assert response.status_code == 200, f"TXT upload failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["filename"] == "test_jd.txt"
        assert "Python" in data["summary"]
        assert "FastAPI" in data["summary"]
        print(f"PASS: TXT file upload - summary extracted: {data['summary'][:100]}...")
    
    def test_jd_upload_pdf_file(self, auth_cookies):
        """Test JD upload with PDF file extracts text correctly (PyMuPDF)"""
        # Read the test PDF file
        pdf_path = "/tmp/test_jd.pdf"
        if os.path.exists(pdf_path):
            with open(pdf_path, 'rb') as f:
                pdf_content = f.read()
            
            files = {'file': ('test_jd.pdf', io.BytesIO(pdf_content), 'application/pdf')}
            
            response = requests.post(
                f"{BASE_URL}/api/openings/jd?role_name=TEST_PDF_Upload",
                files=files,
                cookies=auth_cookies
            )
            
            assert response.status_code == 200, f"PDF upload failed: {response.text}"
            data = response.json()
            assert data["success"] == True
            assert data["filename"] == "test_jd.pdf"
            # PDF should have extracted text (not just "File uploaded: test_jd.pdf")
            assert "File uploaded" not in data["summary"], "PDF text extraction failed - got fallback message"
            print(f"PASS: PDF file upload - summary extracted: {data['summary'][:100]}...")
        else:
            pytest.skip("Test PDF file not found at /tmp/test_jd.pdf")
    
    def test_jd_get_after_upload(self, auth_cookies):
        """Test GET JD returns uploaded data"""
        response = requests.get(
            f"{BASE_URL}/api/openings/jd?role_name=TEST_TXT_Upload",
            cookies=auth_cookies
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["role_name"] == "TEST_TXT_Upload"
        assert data["filename"] == "test_jd.txt"
        assert data["summary"] is not None
        print(f"PASS: GET JD returns correct data")


class TestCoreAPIs:
    """Core API endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_cookies(self):
        """Get authentication cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@vendorhiring.com", "password": "admin123"}
        )
        assert response.status_code == 200
        return response.cookies
    
    def test_candidates_endpoint(self, auth_cookies):
        """Test /api/candidates returns data"""
        response = requests.get(f"{BASE_URL}/api/candidates", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: /api/candidates returns {len(data)} candidates")
    
    def test_analytics_kpis(self, auth_cookies):
        """Test /api/analytics/kpis returns data"""
        response = requests.get(f"{BASE_URL}/api/analytics/kpis", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        assert "total_candidates" in data
        assert "total_openings" in data
        print(f"PASS: /api/analytics/kpis - {data['total_candidates']} candidates, {data['total_openings']} openings")
    
    def test_analytics_roles(self, auth_cookies):
        """Test /api/analytics/roles returns division data"""
        response = requests.get(f"{BASE_URL}/api/analytics/roles", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Check for division data
        if len(data) > 0:
            assert "_id" in data[0]  # Role name
            print(f"PASS: /api/analytics/roles returns {len(data)} roles")
    
    def test_analytics_vendors(self, auth_cookies):
        """Test /api/analytics/vendors returns data"""
        response = requests.get(f"{BASE_URL}/api/analytics/vendors", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: /api/analytics/vendors returns {len(data)} vendors")
    
    def test_analytics_interviews(self, auth_cookies):
        """Test /api/analytics/interviews returns data"""
        response = requests.get(f"{BASE_URL}/api/analytics/interviews", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: /api/analytics/interviews returns {len(data)} interviews")
    
    def test_contacts_endpoint(self, auth_cookies):
        """Test /api/contacts returns data"""
        response = requests.get(f"{BASE_URL}/api/contacts", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: /api/contacts returns {len(data)} contacts")
    
    def test_openings_endpoint(self, auth_cookies):
        """Test /api/openings returns data"""
        response = requests.get(f"{BASE_URL}/api/openings", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: /api/openings returns {len(data)} openings")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
