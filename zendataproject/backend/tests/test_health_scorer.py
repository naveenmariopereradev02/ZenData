import unittest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pandas as pd
import numpy as np
from app.engine.health_scorer import calculate_health_score

class TestHealthScorer(unittest.TestCase):
    def test_empty_dataframe(self):
        df = pd.DataFrame()
        result = calculate_health_score(df)
        self.assertEqual(result["overall_score"], 0)
        self.assertEqual(result["grade"], "F")
        self.assertTrue(len(result["issues"]) > 0)

    def test_perfect_dataframe(self):
        df = pd.DataFrame({
            "id": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            "name": ["Alice", "Bob", "Charlie", "David", "Eve", "Frank", "Grace", "Heidi", "Ivan", "Judy", "Mallory", "Oscar"],
            "income": [50000, 52000, 51000, 49000, 53000, 50500, 49500, 51500, 50200, 52500, 51000, 50800],
        })
        result = calculate_health_score(df)
        self.assertGreaterEqual(result["overall_score"], 90)
        self.assertEqual(result["grade"], "A")
        self.assertEqual(result["pillars"]["completeness"], 100.0)
        self.assertEqual(result["pillars"]["uniqueness"], 100.0)

    def test_missing_values_detection(self):
        df = pd.DataFrame({
            "col_a": [1, np.nan, 3, np.nan, 5],
            "col_b": ["x", "y", np.nan, "w", "v"],
        })
        result = calculate_health_score(df)
        self.assertLess(result["pillars"]["completeness"], 100.0)
        self.assertEqual(result["summary"]["missing_cells"], 3)

    def test_duplicate_records_detection(self):
        df = pd.DataFrame({
            "a": [1, 2, 1, 2],
            "b": ["x", "y", "x", "y"],
        })
        result = calculate_health_score(df)
        self.assertLess(result["pillars"]["uniqueness"], 100.0)
        self.assertEqual(result["summary"]["duplicate_rows"], 2)

    def test_outlier_detection(self):
        normal_data = [100, 102, 98, 101, 99, 105, 97, 103, 100, 101, 99, 102, 98, 100, 104]
        outliers = [10000, 12000] # Extreme values
        df = pd.DataFrame({"amount": normal_data + outliers})
        result = calculate_health_score(df)
        self.assertLess(result["pillars"]["consistency"], 100.0)
        self.assertGreater(result["summary"]["outlier_cells"], 0)

if __name__ == "__main__":
    unittest.main()
