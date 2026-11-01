/* Regression test for the single feedback UI shared by EOPPEP, SAEK and seminars.
 * Run with: node scripts/verify-ai-feedback.mjs
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

class Node {
 constructor(tag){this.tagName=tag;this.className='';this.textContent='';this.hidden=true;this.children=[];}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];}
}
const doc={createElement:tag=>new Node(tag)};
const browser={EkabAIConfig:{functionId:'grading-function'}};
const script=readFileSync(new URL('../ai-grading-client.js',import.meta.url),'utf8');
runInNewContext(script,{document:doc,window:browser,navigator:{onLine:true},URL});
const grade=browser.EkabAIGrade;
assert.equal(typeof grade.render,'function');

function collect(element){
 return [element.textContent,...element.children.flatMap(collect)].filter(Boolean).join(' | ');
}
const base={
 studentAnswer:'Αγενής',
 explanation:'Η λέξη αυτή είναι κρίση, όχι περιγραφή συμπεριφοράς.',
 modelAnswer:'Γράφουμε τη συγκεκριμένη, παρατηρήσιμη συμπεριφορά.',
 referenceAnswer:'Αντικειμενική συμπεριφορά.',
 example:'Αντί για «αγενής», γράψε τι ακριβώς έκανε.',
 takeaway:'Καταγράφουμε γεγονότα, όχι χαρακτηρισμούς.',
 correctPoints:['Ψευδώς θετικό'],
 missingPoints:['Χρειάζεται συγκεκριμένη περιγραφή.'],
 safetyNote:'',
 criticalError:false
};
const result=new Node('div');
grade.render(result,{...base,verdict:'incorrect'});
let text=collect(result);
assert.ok(text.includes('Η απάντησή σου'));
assert.ok(text.includes('Σωστή απάντηση'));
assert.ok(text.includes('Γιατί'));
assert.ok(text.includes('Τι να θυμάσαι'));
assert.ok(text.indexOf('Η απάντησή σου')<text.indexOf('Σωστή απάντηση'));
assert.ok(text.indexOf('Σωστή απάντηση')<text.indexOf('Γιατί'));
grade.render(result,{...base,verdict:'uncertain'});
assert.ok(collect(result).includes('Δεν καταχωρίστηκε βαθμολογία'))
console.log('AI teaching-feedback UI checks passed');
