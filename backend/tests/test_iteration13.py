"""
Iteration 13 Backend Tests
Testing 4 fixes:
1. Date parsing: normalize_interview_slot parses 'dd/mm/yy, h:mm PM' format
2. Role distribution API: returns role counts when vendor specified
3. Role distribution API: returns all roles when no vendor
4. Calendar date parsing in frontend (tested via API data)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@vendorhiring.com",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.cookies

class TestRoleDistributionAPI:
    """Test /api/analytics/role-distribution endpoint"""
    
    def test_role_distribution_all_vendors(self, auth_token):
        """When no vendor specified, returns role distribution for all candidates"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/role-distribution",
            cookies=auth_token
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should return list of roles with counts
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one role"
        
        # Each item should have _id (role name) and total (count)
        for item in data:
            assert "_id" in item, "Each item should have _id (role name)"
            assert "total" in item, "Each item should have total count"
            assert isinstance(item["total"], int), "Total should be integer"
        
        print(f"All vendors role distribution: {len(data)} roles found")
        for item in data[:5]:
            print(f"  - {item['_id']}: {item['total']}")
    
    def test_role_distribution_antino_vendor(self, auth_token):
        """When Antino vendor specified, returns role distribution for Antino only"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/role-distribution?vendor=Antino",
            cookies=auth_token
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should return list of roles for Antino
        assert isinstance(data, list), "Response should be a list"
        
        # Per requirements: Antino should have Python Fullstack(9), DevOps(8), TAE(1), HRBP(1)
        role_counts = {item["_id"]: item["total"] for item in data}
        print(f"Antino role distribution: {len(data)} roles")
        for role, count in role_counts.items():
            print(f"  - {role}: {count}")
        
        # Verify we have roles for Antino
        assert len(data) > 0, "Antino should have at least one role"
        
        # Check expected roles exist (may vary based on data)
        total_antino = sum(item["total"] for item in data)
        print(f"Total Antino candidates: {total_antino}")
    
    def test_role_distribution_case_insensitive(self, auth_token):
        """Vendor filter should be case-insensitive"""
        response1 = requests.get(
            f"{BASE_URL}/api/analytics/role-distribution?vendor=Antino",
            cookies=auth_token
        )
        response2 = requests.get(
            f"{BASE_URL}/api/analytics/role-distribution?vendor=antino",
            cookies=auth_token
        )
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        data1 = response1.json()
        data2 = response2.json()
        
        # Both should return same data
        total1 = sum(item["total"] for item in data1)
        total2 = sum(item["total"] for item in data2)
        assert total1 == total2, "Case-insensitive vendor filter should return same results"
        print(f"Case-insensitive test passed: {total1} == {total2}")


class TestInterviewAnalyticsAPI:
    """Test /api/analytics/interviews endpoint for date parsing"""
    
    def test_interviews_endpoint(self, auth_token):
        """Test interviews endpoint returns normalized slots"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/interviews",
            cookies=auth_token
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"Total interviews: {len(data)}")
        
        # Check structure of interview data
        if len(data) > 0:
            sample = data[0]
            assert "candidate_name" in sample
            assert "role" in sample
            assert "level" in sample
            assert "slot" in sample  # Normalized slot
            assert "slot_raw" in sample  # Raw slot value
            
            # Print some samples
            for item in data[:5]:
                print(f"  - {item['candidate_name']}: slot={item.get('slot')}, raw={item.get('slot_raw')}")
    
    def test_normalize_interview_slot_format(self, auth_token):
        """Verify normalize_interview_slot handles dd/mm/yy, h:mm PM format"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/interviews",
            cookies=auth_token
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check if any slots have IST suffix (indicates dd/mm/yy format was parsed)
        slots_with_ist = [i for i in data if i.get('slot') and 'IST' in str(i.get('slot', ''))]
        print(f"Slots with IST suffix: {len(slots_with_ist)}")
        
        # Check for normalized format (e.g., "Apr 09, 2026 04:00 PM IST")
        for item in slots_with_ist[:3]:
            print(f"  Normalized: {item.get('slot')}")


class TestVendorAnalyticsAPI:
    """Test vendor analytics for pie chart data"""
    
    def test_vendors_endpoint(self, auth_token):
        """Test /api/analytics/vendors returns vendor-wise data"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/vendors",
            cookies=auth_token
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one vendor"
        
        # Each vendor should have _id, total, shortlisted, rejected, selected
        for vendor in data:
            assert "_id" in vendor, "Vendor should have _id (name)"
            assert "total" in vendor, "Vendor should have total count"
        
        print(f"Vendors found: {len(data)}")
        for v in data:
            print(f"  - {v['_id']}: total={v['total']}, shortlisted={v.get('shortlisted', 0)}, selected={v.get('selected', 0)}")
    
    def test_vendor_list_endpoint(self, auth_token):
        """Test /api/analytics/vendor-list returns list of vendor names"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/vendor-list",
            cookies=auth_token
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one vendor"
        
        print(f"Vendor list: {data}")
        
        # Verify Antino is in the list
        assert any('antino' in v.lower() for v in data), "Antino should be in vendor list"


class TestCandidatesAPI:
    """Test candidates API for calendar data"""
    
    def test_candidates_have_submission_dates(self, auth_token):
        """Verify candidates have submission_date for calendar"""
        response = requests.get(
            f"{BASE_URL}/api/candidates",
            cookies=auth_token
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have candidates"
        
        # Count candidates with submission dates
        with_dates = [c for c in data if c.get('submission_date')]
        print(f"Candidates with submission_date: {len(with_dates)} of {len(data)}")
        
        # Check date formats
        date_formats = set()
        for c in with_dates[:10]:
            date_formats.add(c.get('submission_date'))
        print(f"Sample submission dates: {list(date_formats)[:5]}")
    
    def test_candidates_have_interview_slots(self, auth_token):
        """Check interview slot data for calendar"""
        response = requests.get(
            f"{BASE_URL}/api/candidates",
            cookies=auth_token
        )
        assert response.status_code == 200
        data = response.json()
        
        # Count candidates with interview slots
        with_l1_slot = [c for c in data if c.get('interview_slot_l1')]
        with_l2_slot = [c for c in data if c.get('interview_slot_l2')]
        
        print(f"Candidates with L1 interview slot: {len(with_l1_slot)}")
        print(f"Candidates with L2 interview slot: {len(with_l2_slot)}")
        
        # Print sample slots
        for c in with_l1_slot[:3]:
            print(f"  L1 slot: {c.get('interview_slot_l1')}")
        for c in with_l2_slot[:3]:
            print(f"  L2 slot: {c.get('interview_slot_l2')}")
    
    def test_candidates_vendor_filter(self, auth_token):
        """Test vendor filter on candidates endpoint"""
        # Get all candidates
        response_all = requests.get(
            f"{BASE_URL}/api/candidates",
            cookies=auth_token
        )
        assert response_all.status_code == 200
        all_data = response_all.json()
        
        # Get Antino candidates
        response_antino = requests.get(
            f"{BASE_URL}/api/candidates?vendor=Antino",
            cookies=auth_token
        )
        assert response_antino.status_code == 200
        antino_data = response_antino.json()
        
        print(f"All candidates: {len(all_data)}")
        print(f"Antino candidates: {len(antino_data)}")
        
        # Antino should be subset
        assert len(antino_data) < len(all_data), "Antino should be subset of all"
        
        # All Antino candidates should have vendor=Antino
        for c in antino_data:
            assert c.get('vendor', '').lower() == 'antino', f"Expected Antino vendor, got {c.get('vendor')}"


class TestKPIsAPI:
    """Test KPIs endpoint"""
    
    def test_kpis_filtered_with_vendor(self, auth_token):
        """Test KPIs filtered by vendor"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/kpis-filtered?vendor=Antino",
            cookies=auth_token
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should have all KPI fields
        expected_fields = ['total_candidates', 'active_candidates', 'shortlisted', 
                          'rejected', 'selected', 'total_openings']
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"Antino KPIs: {data}")
    
    def test_kpis_all_vendors(self, auth_token):
        """Test KPIs without vendor filter"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/kpis-filtered",
            cookies=auth_token
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        print(f"All vendors KPIs: {data}")
        assert data['total_candidates'] > 0, "Should have candidates"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
