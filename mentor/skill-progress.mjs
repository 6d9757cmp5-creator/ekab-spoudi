export const STATUSES=Object.freeze(['not-started','practicing','review']);
export function initialSkillProgress(){return {version:1,skills:{}};}
export function updateSkillProgress(progress,id,status,date){if(!/^[a-z0-9-]+$/.test(id)||!STATUSES.includes(status))throw Error('Invalid skill progress');const previous=progress.skills[id]||{attempts:0};return {...progress,skills:{...progress.skills,[id]:{status,attempts:previous.attempts+1,updatedAt:date}}};}
export function skillProgressSummary(progress,ids){return ids.reduce((acc,id)=>{const status=progress.skills[id]?.status||'not-started';acc[status]++;return acc;},{'not-started':0,practicing:0,review:0});}
export function nextSkillForReview(progress,ids){return ids.find(id=>progress.skills[id]?.status==='review')||ids.find(id=>!progress.skills[id]||progress.skills[id].status==='not-started')||null;}
