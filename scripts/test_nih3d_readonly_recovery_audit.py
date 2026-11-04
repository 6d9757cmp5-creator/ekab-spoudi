import unittest
from datetime import datetime, timezone
import nih3d_readonly_recovery_audit as audit
import nih3d_stream_restore as restore

NOW=datetime(2026,11,4,17,0,tzinfo=timezone.utc)
def artifact(start,ident=1,expires='2026-11-09T10:00:00Z',expired=False,size=100):
    return {'name':f'nih3d-originals-{start}','id':ident,'expires_at':expires,
            'expired':expired,'size_in_bytes':size}

class ReadOnlyRescueAuditTests(unittest.TestCase):
    def test_recoverable_and_release_markers_are_distinct(self):
        records=[artifact(1301),artifact(1401),artifact(1501),artifact(1601)]
        out=audit.audit(records,{restore.prefix(1601)+'-RESULT.json'}, {1501},NOW)
        self.assertEqual(out['recoverable_artifact_starts'],2)
        self.assertEqual(out['durable_result_marker_starts'],2)
        self.assertEqual(out['recoverable_bytes'],200)
        self.assertEqual([a['start'] for a in out['recoverable']],[1301,1401])
        self.assertEqual(out['status'],'INCOMPLETE')
    def test_expired_and_time_elapsed_not_recoverable(self):
        records=[artifact(1301,expires='2026-11-03T10:00:00Z'),
                 artifact(1401,expired=True),
                 artifact(1501,expires='2026-11-05T10:00:00Z')]
        out=audit.audit(records,set(),set(),NOW)
        self.assertEqual(out['expired_without_result_marker_starts'],[1301,1401])
        self.assertEqual(out['recoverable_artifact_starts'],1)
        self.assertEqual(out['recoverable'][0]['start'],1501)
    def test_duplicate_start_is_deduplicated_and_prefers_latest_id(self):
        x=[artifact(1301,ident=4),artifact(1301,ident=7)]
        out=audit.audit(x,set(),set(),NOW)
        self.assertEqual(out['unique_canonical_artifact_starts_seen'],1)
        self.assertEqual(out['recoverable_artifact_starts'],1)
        self.assertEqual(out['recoverable'][0]['artifact_id'],7)
    def test_absent_artifact_is_not_misreported_as_missing_nih_model(self):
        out=audit.audit([],set(),set(),NOW)
        self.assertEqual(out['status'],'NO_OUTSTANDING_LISTED_ARTIFACTS')
        self.assertEqual(out['unique_canonical_artifact_starts_seen'],0)
        self.assertTrue(any('cannot be inferred' in x for x in out['limitations']))
    def test_orphan_release_marker_counted_without_artifact(self):
        out=audit.audit([],set(),{2101},NOW)
        self.assertEqual(out['durable_result_marker_starts'],1)
        self.assertEqual(out['already_saved_artifact_starts_seen'],0)
    def test_workflow_status_distinguishes_active_scheduler_and_last_result(self):
        workflow={'state':'active'}
        runs=[
            {'id':1,'head_branch':'feature','event':'pull_request','status':'completed',
             'conclusion':'success','created_at':'2026-11-04T17:00:00Z'},
            {'id':2,'head_branch':'main','event':'schedule','status':'completed',
             'conclusion':'success','created_at':'2026-11-04T16:00:00Z',
             'html_url':'https://github.com/example/run/2'},
            {'id':3,'head_branch':'main','event':'schedule','status':'in_progress',
             'conclusion':None,'created_at':'2026-11-04T17:00:00Z'},
        ]
        out=audit.workflow_health(workflow,runs)
        self.assertEqual(out['workflow_state'],'active')
        self.assertEqual(out['latest_main_run']['id'],3)
        self.assertEqual(out['recent_main_runs_seen'],2)

    def test_workflow_disabled_does_not_claim_rescue_running(self):
        out=audit.workflow_health({'state':'disabled_manually'},[])
        self.assertEqual(out['workflow_state'],'disabled_manually')
        self.assertIsNone(out['latest_main_run'])

    def test_invalid_start_and_unrelated_archives_ignored(self):
        out=audit.audit([artifact(1302),{'name':'some-other-model','id':7},
                        artifact(24901)],set(),set(),NOW)
        self.assertEqual(out['unique_canonical_artifact_starts_seen'],1)
        self.assertEqual(out['recoverable'][0]['start'],24901)

if __name__=='__main__':
    unittest.main()
