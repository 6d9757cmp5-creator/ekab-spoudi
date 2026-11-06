#!/usr/bin/env python3
"""Adversarial tests: educational evidence must not forge clinical certification."""
import unittest
from clinical_review_gate import validate

DIGEST="a"*64
def good_item():
    return {
        "status":"source-checked-educational",
        "lesson":"SAEK-16-07",
        "source_url":"https://www.resus.org.uk/guidelines",
        "source_section":"Adult BLS - AED",
        "source_date":"2025-10-27",
        "reviewed_at":"2026-11-04",
        "evidence":"Full direct comparison of AED shock/no shock branches; text and source match.",
        "content_sha256":DIGEST,
        "source_capture_sha256":"b"*64,
        "second_ai_review":"passed",
        "second_review_evidence_url":"https://agent.tinyfish.ai/research/test",
        "educational_scope":"educational-only",
        "greek_scope_status":"not-operational",
        "scope_notice":"Educational information, not a Greek EKAB operational protocol.",
        "clinical_use_approved":False,
        "current_sop_verified":False
    }
def record(item):return {"schemaVersion":1,"items":{"SAEK-16-07":item}}

class EvidenceReviewTests(unittest.TestCase):
    def test_empty_registry_valid_but_no_approvals(self):
        self.assertEqual(validate({"schemaVersion":1,"items":{}}),[])
    def test_source_checked_valid_record(self):
        self.assertEqual(validate(record(good_item())),[])
    def test_old_human_signoff_cannot_fake_medical_certification(self):
        x=good_item();x["status"]="approved-for-publication";x["human_reviewer"]="Dr Fiction"
        self.assertIn("unsupported status",str(validate(record(x))))
    def test_second_review_and_source_capture_required(self):
        x=good_item();x["second_ai_review"]="pending";x["source_capture_sha256"]="no-hash"
        err=validate(record(x))
        self.assertTrue(any("second source review" in v for v in err))
        self.assertTrue(any("source_capture_sha256" in v for v in err))
    def test_absent_sop_must_stay_non_operational(self):
        x=good_item();x["greek_scope_status"]="not-operational";x.pop("scope_notice")
        self.assertIn("visible non-operational",str(validate(record(x))))
    def test_wrong_urls_and_clinical_authority_denied(self):
        x=good_item();x["source_url"]="http://localhost/a";x["clinical_use_approved"]=True
        err=validate(record(x))
        self.assertTrue(any("HTTPS" in v for v in err))
        self.assertTrue(any("clinical-use authority" in v for v in err))
    def test_invented_sop_url_not_accepted(self):
        x=good_item();x["current_sop_verified"]=True;x["sop_original_url"]="no-evidence"
        self.assertIn("SOP cannot be marked",str(validate(record(x))))
    def test_non_educational_scope_rejected(self):
        x=good_item();x["educational_scope"]="clinical-protocol"
        self.assertIn("may not be declared operational",str(validate(record(x))))

if __name__=="__main__":unittest.main()
