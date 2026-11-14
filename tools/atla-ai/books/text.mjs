/**
 * Word handling shared by the textbook index builder and the ATLA Worker that searches it.
 * Pure functions only, so the Worker can import them.
 */
export const SHARDS=4096;
export const STOP=new Set(('the and for are but not you all any can had her was one our out has have from they this that with which their there been were when what will would your into more also than then them these some such only other about each should could after before while where most must may might very over under between through during both same just like used using use '+
 'its his she him how who whom why does did doing done being because until upon within without again further here once off own few nor too don now per via etc fig figure table chapter section page see').split(' '));
/** Lower-case English word stems: plural endings removed, so "fractures" finds "fracture". */
export function stem(word){
 const w=word.toLowerCase();
 if(w.length>5&&w.endsWith('ies'))return w.slice(0,-3)+'y';
 if(w.length>4&&/(ss|sh|ch|x|z)es$/.test(w))return w.slice(0,-2);
 if(w.length>3&&w.endsWith('s')&&!/(ss|us|is)$/.test(w))return w.slice(0,-1);
 return w;
}
export function tokens(text){
 return (String(text).toLowerCase().match(/[a-z][a-z0-9-]{2,30}/g)||[]).map(stem).filter(w=>!STOP.has(w));
}
/** FNV-1a hash: the index file a word lives in. */
export function shardOf(term){
 let h=0x811c9dc5;
 for(let i=0;i<term.length;i++){h^=term.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
 return (h%SHARDS).toString(16).padStart(3,'0');
}
/** Greek text without accents, lower case, final sigma unified: for matching glossary names. */
export const normGreek=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLocaleLowerCase('el').replace(/ς/g,'σ');
