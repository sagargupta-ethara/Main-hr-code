import requests
import sys
import json
from datetime import datetime

class VendorHiringAPITester:
    def __init__(self, base_url="https://hr-dashboard-preview-6.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "status": "PASSED" if success else "FAILED",
            "details": details
        })

    def test_auth_login(self):
        """Test admin login"""
        try:
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json={"email": "admin@vendorhiring.com", "password": "admin123"},
                headers={"Content-Type": "application/json"}
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if not success:
                details += f", Response: {response.text}"
            
            self.log_test("Admin Login", success, details)
            return success
            
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False

    def test_auth_me(self):
        """Test get current user"""
        try:
            response = self.session.get(f"{self.base_url}/auth/me")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                user_data = response.json()
                details += f", User: {user_data.get('email', 'N/A')}"
            else:
                details += f", Response: {response.text}"
            
            self.log_test("Get Current User", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Current User", False, f"Exception: {str(e)}")
            return False

    def test_get_candidates(self):
        """Test get candidates endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/candidates")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                candidates = response.json()
                details += f", Count: {len(candidates)}"
            else:
                details += f", Response: {response.text}"
            
            self.log_test("Get Candidates", success, details)
            return success, response.json() if success else []
            
        except Exception as e:
            self.log_test("Get Candidates", False, f"Exception: {str(e)}")
            return False, []

    def test_get_kpis(self):
        """Test analytics KPIs endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/analytics/kpis")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                kpis = response.json()
                details += f", Total Candidates: {kpis.get('total_candidates', 0)}"
            else:
                details += f", Response: {response.text}"
            
            self.log_test("Get KPIs", success, details)
            return success, response.json() if success else {}
            
        except Exception as e:
            self.log_test("Get KPIs", False, f"Exception: {str(e)}")
            return False, {}

    def test_get_pipeline_data(self):
        """Test pipeline analytics endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/analytics/pipeline")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                pipeline = response.json()
                details += f", Stages: {len(pipeline)}"
            else:
                details += f", Response: {response.text}"
            
            self.log_test("Get Pipeline Data", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Pipeline Data", False, f"Exception: {str(e)}")
            return False

    def test_get_vendor_analytics(self):
        """Test vendor analytics endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/analytics/vendors")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                vendors = response.json()
                details += f", Vendors: {len(vendors)}"
            else:
                details += f", Response: {response.text}"
            
            self.log_test("Get Vendor Analytics", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Vendor Analytics", False, f"Exception: {str(e)}")
            return False

    def test_get_interview_analytics(self):
        """Test interview analytics endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/analytics/interviews")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                interviews = response.json()
                details += f", Interviews: {len(interviews)}"
            else:
                details += f", Response: {response.text}"
            
            self.log_test("Get Interview Analytics", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Interview Analytics", False, f"Exception: {str(e)}")
            return False

    def test_export_candidates(self):
        """Test export candidates endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/export/candidates")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                details += f", Content-Type: {response.headers.get('content-type', 'N/A')}"
            else:
                details += f", Response: {response.text}"
            
            self.log_test("Export Candidates", success, details)
            return success
            
        except Exception as e:
            self.log_test("Export Candidates", False, f"Exception: {str(e)}")
            return False

    def test_candidate_filters(self):
        """Test candidate filtering"""
        try:
            # Test with vendor filter
            response = self.session.get(f"{self.base_url}/candidates?vendor=test")
            success = response.status_code == 200
            details = f"Vendor Filter - Status: {response.status_code}"
            
            if success:
                # Test with role filter
                response2 = self.session.get(f"{self.base_url}/candidates?role=developer")
                success = response2.status_code == 200
                details += f", Role Filter - Status: {response2.status_code}"
                
                if success:
                    # Test with stage filter
                    response3 = self.session.get(f"{self.base_url}/candidates?stage=New")
                    success = response3.status_code == 200
                    details += f", Stage Filter - Status: {response3.status_code}"
            
            self.log_test("Candidate Filters", success, details)
            return success
            
        except Exception as e:
            self.log_test("Candidate Filters", False, f"Exception: {str(e)}")
            return False

    def test_logout(self):
        """Test logout"""
        try:
            response = self.session.post(f"{self.base_url}/auth/logout")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if not success:
                details += f", Response: {response.text}"
            
            self.log_test("Logout", success, details)
            return success
            
        except Exception as e:
            self.log_test("Logout", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Vendor Hiring Dashboard API Tests")
        print("=" * 50)
        
        # Test authentication first
        if not self.test_auth_login():
            print("❌ Login failed - stopping tests")
            return False
        
        # Test authenticated endpoints
        self.test_auth_me()
        candidates_success, candidates_data = self.test_get_candidates()
        kpis_success, kpis_data = self.test_get_kpis()
        self.test_get_pipeline_data()
        self.test_get_vendor_analytics()
        self.test_get_interview_analytics()
        self.test_export_candidates()
        self.test_candidate_filters()
        self.test_logout()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if candidates_success and len(candidates_data) > 0:
            print(f"✅ Found {len(candidates_data)} candidates in database")
        else:
            print("⚠️  No candidates found - Excel file may not be uploaded")
            
        if kpis_success:
            print(f"✅ KPIs loaded - Total candidates: {kpis_data.get('total_candidates', 0)}")
        
        success_rate = (self.tests_passed / self.tests_run) * 100
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = VendorHiringAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())