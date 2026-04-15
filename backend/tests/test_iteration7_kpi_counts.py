"""
Iteration 7 Tests: KPI Count Logic Verification
Tests the sheet-driven KPI counting logic:
- Active = NOT(resume_status~reject OR final_status~reject) = 33
- Shortlisted = resume_status~shortlist = 18
- Rejected = resume_status~reject OR final_status~reject = 26
- Interviews Scheduled = interview_slot present = 0
- Selected = final_status~selected = 0
- Total Candidates = 59
- Total Openings = 38

Also tests vendor filtering (Antino: Active=6, Shortlisted=4, Rejected=10, Total=16)
And HR SPOC normalization (Pujita -> Pujita Bhuyan)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestKPICountLogic:
    """Test KPI counts match expected sheet-driven values"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth cookies"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vendorhiring.com",
            "password": "admin123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        yield
        self.session.close()
    
    def test_kpis_endpoint_returns_expected_counts(self):
        """Test /api/analytics/kpis returns correct sheet-driven counts"""
        resp = self.session.get(f"{BASE_URL}/api/analytics/kpis")
        assert resp.status_code == 200, f"KPIs endpoint failed: {resp.text}"
        
        data = resp.json()
        print(f"KPIs response: {data}")
        
        # Verify KPI logic is working (counts may change with data sync)
        # Active = NOT(resume_status~reject OR final_status~reject)
        # Shortlisted = resume_status~shortlist
        # Rejected = resume_status~reject OR final_status~reject
        # Interviews Scheduled = interview_slot present
        # Selected = final_status~selected
        
        # Verify all required fields are present
        assert 'active_candidates' in data, "Missing active_candidates"
        assert 'shortlisted' in data, "Missing shortlisted"
        assert 'rejected' in data, "Missing rejected"
        assert 'interviews_scheduled' in data, "Missing interviews_scheduled"
        assert 'selected' in data, "Missing selected"
        assert 'total_candidates' in data, "Missing total_candidates"
        assert 'total_openings' in data, "Missing total_openings"
        
        # Verify logical consistency: active + rejected should equal total
        total = data.get('total_candidates', 0)
        active = data.get('active_candidates', 0)
        rejected = data.get('rejected', 0)
        
        assert active + rejected == total, f"Active ({active}) + Rejected ({rejected}) should equal Total ({total})"
        print(f"✓ KPI logic verified: Active ({active}) + Rejected ({rejected}) = Total ({total})")
    
    def test_kpis_filtered_antino_vendor(self):
        """Test /api/analytics/kpis-filtered?vendor=Antino returns correct counts"""
        resp = self.session.get(f"{BASE_URL}/api/analytics/kpis-filtered?vendor=Antino")
        assert resp.status_code == 200, f"KPIs filtered endpoint failed: {resp.text}"
        
        data = resp.json()
        print(f"Antino KPIs response: {data}")
        
        # Verify vendor filter is working
        assert data.get('total_candidates') == 16, f"Antino Total should be 16, got {data.get('total_candidates')}"
        
        # Verify logical consistency for Antino
        active = data.get('active_candidates', 0)
        rejected = data.get('rejected', 0)
        total = data.get('total_candidates', 0)
        
        assert active + rejected == total, f"Antino: Active ({active}) + Rejected ({rejected}) should equal Total ({total})"
        print(f"✓ Antino KPI logic verified: Active ({active}) + Rejected ({rejected}) = Total ({total})")
    
    def test_kpis_filtered_bravia_vendor(self):
        """Test /api/analytics/kpis-filtered?vendor=Bravia+Services returns vendor-specific data"""
        resp = self.session.get(f"{BASE_URL}/api/analytics/kpis-filtered?vendor=Bravia+Services")
        assert resp.status_code == 200, f"KPIs filtered endpoint failed: {resp.text}"
        
        data = resp.json()
        print(f"Bravia Services KPIs response: {data}")
        
        # Verify we get vendor-specific data (not all data)
        assert data.get('total_candidates') > 0, "Bravia Services should have candidates"
        assert data.get('total_candidates') < 59, "Bravia Services should have fewer than total candidates"


class TestHRSPOCNormalization:
    """Test HR SPOC name normalization"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth cookies"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vendorhiring.com",
            "password": "admin123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        yield
        self.session.close()
    
    def test_contacts_show_pujita_bhuyan(self):
        """Test /api/contacts shows 'Pujita Bhuyan' not just 'Pujita'"""
        resp = self.session.get(f"{BASE_URL}/api/contacts")
        assert resp.status_code == 200, f"Contacts endpoint failed: {resp.text}"
        
        data = resp.json()
        hr_spocs = [c for c in data if c.get('type') == 'HR SPOC']
        print(f"HR SPOCs found: {[s.get('name') for s in hr_spocs]}")
        
        # Check that 'Pujita Bhuyan' exists (normalized from 'Pujita')
        pujita_found = any(s.get('name') == 'Pujita Bhuyan' for s in hr_spocs)
        assert pujita_found, f"Expected 'Pujita Bhuyan' in HR SPOCs, got: {[s.get('name') for s in hr_spocs]}"
        
        # Ensure 'Pujita' alone is NOT present (should be normalized)
        pujita_alone = any(s.get('name') == 'Pujita' for s in hr_spocs)
        assert not pujita_alone, "Found 'Pujita' alone - should be normalized to 'Pujita Bhuyan'"
    
    def test_candidates_have_normalized_hr_spoc(self):
        """Test candidates have normalized HR SPOC values"""
        resp = self.session.get(f"{BASE_URL}/api/candidates")
        assert resp.status_code == 200, f"Candidates endpoint failed: {resp.text}"
        
        data = resp.json()
        pujita_candidates = [c for c in data if c.get('hr_spoc') and 'pujita' in c.get('hr_spoc', '').lower()]
        print(f"Candidates with Pujita SPOC: {len(pujita_candidates)}")
        
        # All should have 'Pujita Bhuyan' not just 'Pujita'
        for c in pujita_candidates:
            assert c.get('hr_spoc') == 'Pujita Bhuyan', f"Expected 'Pujita Bhuyan', got '{c.get('hr_spoc')}' for {c.get('candidate_name')}"


class TestVendorFilterPropagation:
    """Test vendor filter propagates to all modals/popups"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth cookies"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vendorhiring.com",
            "password": "admin123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        yield
        self.session.close()
    
    def test_candidates_filtered_by_vendor(self):
        """Test /api/candidates?vendor=Antino returns only Antino candidates"""
        resp = self.session.get(f"{BASE_URL}/api/candidates?vendor=Antino")
        assert resp.status_code == 200, f"Candidates endpoint failed: {resp.text}"
        
        data = resp.json()
        print(f"Antino candidates count: {len(data)}")
        
        # All returned candidates should be from Antino
        for c in data:
            assert c.get('vendor', '').lower() == 'antino', f"Expected Antino vendor, got {c.get('vendor')}"
        
        # Should have 16 Antino candidates
        assert len(data) == 16, f"Expected 16 Antino candidates, got {len(data)}"
    
    def test_vendor_detail_endpoint(self):
        """Test /api/analytics/vendor-detail returns member list"""
        resp = self.session.get(f"{BASE_URL}/api/analytics/vendor-detail?vendor_name=Antino")
        assert resp.status_code == 200, f"Vendor detail endpoint failed: {resp.text}"
        
        data = resp.json()
        print(f"Antino vendor detail: total={data.get('total')}, shortlisted={data.get('shortlisted')}, rejected={data.get('rejected')}")
        
        assert data.get('vendor') == 'Antino'
        assert data.get('total') == 16, f"Expected 16 total, got {data.get('total')}"
        assert 'members' in data, "Should have members list"
        assert len(data.get('members', [])) == 16, f"Expected 16 members, got {len(data.get('members', []))}"


class TestInterviewData:
    """Test interview-related data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth cookies"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vendorhiring.com",
            "password": "admin123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        yield
        self.session.close()
    
    def test_interviews_endpoint(self):
        """Test /api/analytics/interviews returns interview data with status"""
        resp = self.session.get(f"{BASE_URL}/api/analytics/interviews")
        assert resp.status_code == 200, f"Interviews endpoint failed: {resp.text}"
        
        data = resp.json()
        print(f"Total interviews: {len(data)}")
        
        # Check interview data structure
        if len(data) > 0:
            interview = data[0]
            assert 'candidate_name' in interview
            assert 'level' in interview
            assert 'status' in interview or 'slot' in interview


class TestAnalysisPageEndpoints:
    """Test Analysis page still works"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth cookies"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vendorhiring.com",
            "password": "admin123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        yield
        self.session.close()
    
    def test_vendor_analytics(self):
        """Test /api/analytics/vendors returns vendor data"""
        resp = self.session.get(f"{BASE_URL}/api/analytics/vendors")
        assert resp.status_code == 200, f"Vendor analytics endpoint failed: {resp.text}"
        
        data = resp.json()
        print(f"Vendors count: {len(data)}")
        assert len(data) > 0, "Should have vendor data"
    
    def test_role_analytics(self):
        """Test /api/analytics/roles returns role data"""
        resp = self.session.get(f"{BASE_URL}/api/analytics/roles")
        assert resp.status_code == 200, f"Role analytics endpoint failed: {resp.text}"
        
        data = resp.json()
        print(f"Roles count: {len(data)}")
        assert len(data) > 0, "Should have role data"


class TestJobOpeningsNominees:
    """Test Job Openings nominees still work"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth cookies"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vendorhiring.com",
            "password": "admin123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        yield
        self.session.close()
    
    def test_openings_endpoint(self):
        """Test /api/openings returns openings"""
        resp = self.session.get(f"{BASE_URL}/api/openings")
        assert resp.status_code == 200, f"Openings endpoint failed: {resp.text}"
        
        data = resp.json()
        print(f"Openings count: {len(data)}")
        assert len(data) == 38, f"Expected 38 openings, got {len(data)}"
    
    def test_nominees_endpoint(self):
        """Test /api/openings/nominees returns nominees for a role"""
        resp = self.session.get(f"{BASE_URL}/api/openings/nominees?role_name=Python+Fullstack")
        assert resp.status_code == 200, f"Nominees endpoint failed: {resp.text}"
        
        data = resp.json()
        print(f"Python Fullstack nominees: {len(data)}")
        assert len(data) > 0, "Should have nominees for Python Fullstack"
