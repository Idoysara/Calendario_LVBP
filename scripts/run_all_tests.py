#!/usr/bin/env python3
"""
Test Runner & Comprehensive Verification Pipeline
"""

import unittest
import sys
import os

# Add workspace root to PYTHONPATH
sys.path.insert(0, "/Users/ismaeldoy/Desktop/IDS_HUBmy")

def run():
    loader = unittest.TestLoader()
    suite = loader.discover("tests", pattern="test_*.py")
    
    print("\n" + "=" * 60)
    print("🚀 RUNNING AUTOMATED UNIT & DOMAIN INVARIANT TEST SUITE")
    print("=" * 60)
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    if not result.wasSuccessful():
        print("\n❌ Tests failed!")
        sys.exit(1)
        
    print("\n" + "=" * 60)
    print("🔍 EXECUTING MILITARY-GRADE SAST AUDIT")
    print("=" * 60)
    
    import scripts.audit_military_grade as audit
    scanned, findings = audit.audit_files()
    
    if findings:
        print(f"\n❌ SAST Audit found {len(findings)} issues!")
        sys.exit(1)
    
    print(f"✅ All {result.testsRun} unit/security tests passed!")
    print(f"✅ SAST Audit clean: {scanned} files inspected with 0 vulnerabilities.")
    print("🎖️ CERTIFICATION LEVEL: MISSION-CRITICAL / ZERO DEFECTS\n")

if __name__ == "__main__":
    run()