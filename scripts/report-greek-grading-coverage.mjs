/**
 * Build an inspectable offline-only evidence report for the Greek answer-grader.
 * NO model requests; NO learner data. Provisional labels are not validation.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const dataset=read('../functions/answer-grader/greek-answer-fixtures.json');
const eoppep=read('../functions/answer-grader/eoppep-rubrics.json');
const saek=read('../functions/answer-grader/saek-exam-rubrics.json');
const items=dataset.cases;
const countBy=(array,key)=>Object.fromEntries([...new Set(array.map(x=>x[key]))].sort().map(v=>[v,array.filter(x=>x[key]===v).length]));
const eopSet=new Set(items.filter(x=>x.section==='eoppep').map(x=>x.questionId));
const saekSet=new Set(items.filter(x=>x.section==='saek').map(x=>x.questionId));
const tracks=new Set(items.filter(x=>x.section==='seminar').map(x=>x.courseId));
const mentorSet=new Set(items.filter(x=>x.section==='mentor_oral').map(x=>x.questionId));
const reviewed=items.filter(x=>x.reviewStatus==='reviewed_by_independent_educator');
const pending=items.filter(x=>x.reviewStatus==='pending_independent_educator_review');
const report={
 reportVersion:1,
 generatedAt:new Date().toISOString(),
 title:'EKAB Spoudi — Greek educational answer coverage (offline only)',
 totalSyntheticExamples:items.length,
 independentlyReviewedExamples:reviewed.length,
 pendingExpertReviewExamples:pending.length,
 bySection:countBy(items,'section'),
 provisionalOutcomes:countBy(items,'expected'),
 distinctQuestions:{
  eoppep:eopSet.size,
  saek:saekSet.size,
  mentor:mentorSet.size,
  seminar:items.filter(x=>x.section==='seminar').length
 },
 referenceBankSizes:{eoppep:eoppep.length,saek:saek.items.length},
 coveragePercentOfBanks:{
  eoppep:Math.round(1000*eopSet.size/eoppep.length)/10,
  saek:Math.round(1000*saekSet.size/saek.items.length)/10
 },
 uncoveredEoppepQuestions:eoppep.filter(x=>!eopSet.has(x.id)).map(x=>x.id),
 uncoveredSaekQuestions:saek.items.filter(x=>!saekSet.has(x.id)).map(x=>x.id),
 coveredSeminarTracks:[...tracks].sort(),
 targetedNextMilestone:items.length<100?100:items.length<300?300:1000,
 gradeReliability:'NOT_MEASURED',
 modelInferenceCalls:0,
 reportDoesNotMeasure:['clinical correctness','live AI grading performance','model fine-tuning','expert-rated learner responses'],
 warnings:[
  'All current example labels are provisional pending independent educator review.',
  'Synthetically written questions are not anonymized real student answers.',
  'CI tests verify corpus integrity and selected safeguards; they do not certify clinical decisions.'
 ]
};
if(report.totalSyntheticExamples!==report.pendingExpertReviewExamples+report.independentlyReviewedExamples)throw Error('Unknown review status in synthetic dataset');
if(reviewed.some(x=>!x.reviewEvidence?.source||!x.reviewEvidence?.date))throw Error('A reviewed case needs traceable independent educator evidence');
if(items.length<100)throw Error('Fewer than 100 synthetic cases in the active milestone');
mkdirSync('audit-results',{recursive:true});
writeFileSync('audit-results/greek-grading-coverage.json',JSON.stringify(report,null,2)+'\n');
console.log('Greek grading coverage (offline):',JSON.stringify({
 synthetic:report.totalSyntheticExamples,independentlyReviewed:report.independentlyReviewedExamples,
 bySection:report.bySection,byVerdict:report.provisionalOutcomes,
 distinctQuestions:report.distinctQuestions,coverage:report.coveragePercentOfBanks,
 nextMilestone:report.targetedNextMilestone
}));
