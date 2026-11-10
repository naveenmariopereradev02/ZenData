import unittest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pandas as pd
import numpy as np
from app.engine.cleaning_rules import auto_clean_dataframe

class TestCleaningRules(unittest.TestCase):
    def test_canonical_category_mapping(self):
        df = pd.DataFrame({
            "category": ["diary", "Bakary", "groceries", "drinks", "Dairy"],
        })
        cleaned_df, audit_log, new_health, comparison = auto_clean_dataframe(df, {"deduplicate": False})
        expected = ["Dairy", "Bakery", "Groceries", "Beverages", "Dairy"]
        self.assertEqual(cleaned_df["category"].tolist(), expected)

    def test_canonical_branch_mapping(self):
        df = pd.DataFrame({
            "branch": ["colombo 07", "Colombo-07", "colombo7", "KANDY"],
        })
        cleaned_df, audit_log, new_health, comparison = auto_clean_dataframe(df, {"deduplicate": False})
        expected = ["Colombo 07", "Colombo 07", "Colombo 07", "Kandy"]
        self.assertEqual(cleaned_df["branch"].tolist(), expected)

    def test_anti_poisoning_preserves_pii_nulls(self):
        df = pd.DataFrame({
            "customer_name": ["Kasun", "not given", np.nan, "Amara"],
            "email": ["valid@test.com", "invalid-email", "none", np.nan],
            "phone": ["0771234567", "0000000000", "not given", np.nan],
        })
        cleaned_df, audit_log, new_health, comparison = auto_clean_dataframe(df, {"deduplicate": False})
        # Sentinel placeholders must be converted to NaN, NOT imputed with fake names or mode
        self.assertTrue(pd.isna(cleaned_df.loc[1, "customer_name"]))
        self.assertTrue(pd.isna(cleaned_df.loc[2, "customer_name"]))
        self.assertTrue(pd.isna(cleaned_df.loc[2, "email"]))
        self.assertTrue(pd.isna(cleaned_df.loc[1, "phone"]))

    def test_math_reconciliation_total_formula(self):
        # Total = Qty * Unit Price * (1 - Discount)
        df = pd.DataFrame({
            "qty": [2, 3, 5],
            "unit_price": [100.0, 200.0, 50.0],
            "discount": [0.10, 0.0, 0.20],
            "total": [99999.0, np.nan, 200.0], # Row 0 has corrupted total, Row 1 is null, Row 2 is exact
        })
        cleaned_df, audit_log, new_health, comparison = auto_clean_dataframe(df, {"deduplicate": False})
        # Row 0: 2 * 100 * 0.9 = 180.0
        self.assertAlmostEqual(cleaned_df.loc[0, "total"], 180.0, places=1)
        # Row 1: 3 * 200 * 1.0 = 600.0
        self.assertAlmostEqual(cleaned_df.loc[1, "total"], 600.0, places=1)
        # Row 2: 5 * 50 * 0.8 = 200.0
        self.assertAlmostEqual(cleaned_df.loc[2, "total"], 200.0, places=1)

    def test_outlier_qty_recovery(self):
        # Qty = 999, Total = 300, Price = 100, Disc = 0 => True Qty = 3
        df = pd.DataFrame({
            "qty": [999],
            "unit_price": [100.0],
            "discount": [0.0],
            "total": [300.0],
        })
        cleaned_df, audit_log, new_health, comparison = auto_clean_dataframe(df, {"deduplicate": False})
        self.assertEqual(cleaned_df.loc[0, "qty"], 3.0)

if __name__ == "__main__":
    unittest.main()
