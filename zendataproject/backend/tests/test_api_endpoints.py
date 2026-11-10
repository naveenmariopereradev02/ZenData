import unittest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import io
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app

class TestAPIEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "healthy"})

    def test_root_endpoint(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "online")

    def test_upload_and_clean_workflow(self):
        csv_content = (
            "customer_id,name,category,qty,unit_price,total\n"
            "CUST-1,Kasun,diary,2,100,200\n"
            "CUST-2,Amara,Bakary,1,50,50\n"
            "CUST-1,Kasun,diary,2,100,200\n" # Duplicate row
        )
        file_obj = io.BytesIO(csv_content.encode("utf-8"))
        res = self.client.post("/api/v1/upload", files={"file": ("test.csv", file_obj, "text/csv")})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("session_id", data)
        self.assertIn("health_score", data)

        session_id = data["session_id"]

        # Test Clean
        clean_res = self.client.post("/api/v1/clean", json={
            "session_id": session_id,
            "options": {"deduplicate": True, "normalize_headers": False}
        })
        self.assertEqual(clean_res.status_code, 200)
        clean_data = clean_res.json()
        self.assertEqual(clean_data["comparison"]["duplicates_removed"], 1)

        # Test Exports
        for fmt in ["csv", "json", "excel", "pdf"]:
            export_res = self.client.get(f"/api/v1/export/{session_id}/{fmt}")
            self.assertEqual(export_res.status_code, 200, f"Export format {fmt} failed")
            self.assertGreater(len(export_res.content), 0)

if __name__ == "__main__":
    unittest.main()
