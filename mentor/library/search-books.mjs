/* Review-only CLI; includes unapproved draft passages. Never use for clinical decisions. */
import {loadPassages} from './corpus.mjs';
import {normalizeGreek,tokens} from './retrieval.mjs';
const query=process.argv.slice(2).join(' ').trim();
if(!query){console.error('Usage: node mentor/library/search-books.mjs "heart failure"');process.exit(2);}
const words=tokens(query);
const corpus=await loadPassages({reviewMode:true});
const hits=corpus.map(p=>{
 const text=normalizeGreek(p.text+' '+p.title);
 const matched=words.filter(w=>text.includes(w));
 return {p,score:matched.length};
}).filter(h=>h.score>0).sort((a,b)=>b.score-a.score||a.p.id.localeCompare(b.p.id)).slice(0,8);
console.log('REVIEW ONLY — NOT CLINICALLY VERIFIED');
console.log('Query:',query,'; matches:',hits.length);
for(const {p,score} of hits){
 console.log('\n---',p.book_title,'/',p.section,'[unreviewed]',score);
 console.log('Source:',p.source_url);
 console.log(p.text.slice(0,450).replace(/\n/g,' '),'...');
}
