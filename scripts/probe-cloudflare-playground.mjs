import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const report={url:'https://playground.ai.cloudflare.com/',status:'unknown',at:new Date().toISOString()};
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message.slice(0,140)));
 const resp=await page.goto(report.url,{waitUntil:'domcontentloaded',timeout:35000});
 await page.waitForTimeout(8000);
 report.status='loaded';
 report.statusCode=resp?.status();
 report.finalUrl=page.url();
 report.title=await page.title();
 report.bodyText=(await page.locator('body').innerText().catch(()=>'')).slice(0,5000);
 report.buttons=await page.locator('button').evaluateAll(els=>els.slice(0,60).map(x=>({text:x.innerText?.trim().slice(0,90),aria:x.getAttribute('aria-label'),title:x.getAttribute('title')})));
 report.inputs=await page.locator('input, textarea, [role="textbox"], [contenteditable="true"], select').evaluateAll(els=>els.slice(0,35).map(x=>({tag:x.tagName,role:x.getAttribute('role'),placeholder:x.getAttribute('placeholder'),aria:x.getAttribute('aria-label'),outer:x.outerHTML.slice(0,220)})));
 report.pageErrors=errors.slice(0,10);
 report.links=await page.locator('a').evaluateAll(els=>els.slice(0,30).map(x=>({text:x.innerText?.trim().slice(0,90),href:x.getAttribute('href')})));
 try{
  console.log('PLAYGROUND_LINKS',JSON.stringify(report.links).slice(0,5000));
  const candidates=page.locator('a').filter({hasText:'Model mode'});
  const count=await candidates.count();
  if(count)await candidates.last().click({timeout:7000});
  else await page.getByText('Model mode',{exact:true}).last().click({timeout:7000});
  await page.waitForTimeout(5000);
  report.modelMode={url:page.url(),body:(await page.locator('body').innerText()).slice(0,6000),
   buttons:await page.locator('button').evaluateAll(els=>els.slice(0,80).map(x=>({text:x.innerText?.trim().slice(0,100),aria:x.getAttribute('aria-label'),title:x.getAttribute('title')}))),
   inputs:await page.locator('input,textarea,[role="textbox"],[contenteditable="true"],select').evaluateAll(els=>els.slice(0,45).map(x=>({tag:x.tagName,placeholder:x.getAttribute('placeholder'),aria:x.getAttribute('aria-label'),outer:x.outerHTML.slice(0,250)})))};
  console.log('PLAYGROUND_MODEL_MODE',JSON.stringify(report.modelMode).slice(0,10500));
  // Live, unauthenticated model evaluation through the official public UI.
  await page.goto('https://playground.ai.cloudflare.com/models?model='+encodeURIComponent('@cf/google/gemma-4-26b-a4b-it'),{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForTimeout(4500);
  report.gemmaPageUrl=page.url();
  const hiddenValues=await page.locator('input[aria-hidden="true"]').evaluateAll(els=>els.map(e=>e.value));
  report.gemmaSelected=hiddenValues.some(v=>/gemma-4-26b-a4b-it/.test(v));
  console.log('PLAYGROUND_GEMMA_SELECTED',report.gemmaSelected,JSON.stringify(hiddenValues));
  if(report.gemmaSelected){
   const prompt='Εκπαιδευτική αξιολόγηση στα ελληνικά. Σύγκρινε ΟΛΑ τα ζητούμενα και όχι μόνο κοινές λέξεις. Μην αξιολογείς ορθογραφία ή σύνταξη.\\nΕρώτηση: Ποιες είναι οι λειτουργίες των ρινικών κοιλοτήτων κατά τη δίοδο του αέρα από τη μύτη;\\nΕκπαιδευτική αναφορά: Ο εισπνεόμενος αέρας καθαρίζεται από σωματίδια με βλέννη και κροσσούς, θερμαίνεται, υγραίνεται και η ρινική περιοχή συμμετέχει στην όσφρηση.\\nΑπάντηση μαθητή: η μυτη ζεστενει το αερα κ τον καθαριζει και τον υγραινει\\nΑπάντησε αποκλειστικά με σύντομο JSON { "verdict": "correct|partial|incorrect|uncertain", "reason": "ελληνική αιτιολόγηση", "missing": ["ελλείψεις"] }.';
   await page.locator('textarea[data-testid="chat-input"]').fill(prompt);
   await page.getByRole('button',{name:'Send message'}).click({timeout:8000});
   await page.waitForTimeout(18000);
   report.liveSample={model:'@cf/google/gemma-4-26b-a4b-it',question:'EOP-A-001',expected:'partial',body:(await page.locator('body').innerText()).slice(-9000),url:page.url()};
   console.log('PLAYGROUND_GEMMA_LIVE_SAMPLE',JSON.stringify(report.liveSample).slice(0,10500));
   const questions=[
    {id:'nasal-complete-informal',qid:'EOP-A-001',expected:['correct'],
     question:'Ποιες είναι οι λειτουργίες των ρινικών κοιλοτήτων κατά τη δίοδο του αέρα από τη μύτη;',
     reference:'Ο εισπνεόμενος αέρας καθαρίζεται από σωματίδια με τη βλέννη και τους κροσσούς, θερμαίνεται και υγραίνεται. Η ρινική περιοχή συμμετέχει στην όσφρηση.',
     answer:'Ο αερας απτη μυτη καθαριζετε με βλεννα κ κροσσους που κρατανε σκονη, ζεσταινεται κ υγραινετε. Επίσης απτη μυτη μυριζουμε.'},
    {id:'nasal-false-negation',qid:'EOP-A-001',expected:['partial','incorrect','uncertain'],
     question:'Ποιες είναι οι λειτουργίες των ρινικών κοιλοτήτων κατά τη δίοδο του αέρα από τη μύτη;',
     reference:'Ο εισπνεόμενος αέρας καθαρίζεται με βλέννη και κροσσούς, θερμαίνεται, υγραίνεται και υπάρχει συμμετοχή στην όσφρηση.',
     answer:'Η μυτη καθαριζει με βλεννα και κροσσους και ζεσταινει τον αερα αλλα ΔΕΝ τον υγραινει. Και μυριζουμε.'},
    {id:'alveoli-natural-correct',qid:'EOP-A-003',expected:['correct'],
     question:'Περιγράψτε τη διαδικασία ανταλλαγής των αερίων σε κυψελιδικό επίπεδο.',
     reference:'Το οξυγόνο διαχέεται από τον αέρα των κυψελίδων προς το αίμα των πνευμονικών τριχοειδών και το διοξείδιο του άνθρακα προς την αντίθετη κατεύθυνση, μέσω της αναπνευστικής μεμβράνης, εξαιτίας διαφορών μερικών πιέσεων.',
     answer:'Το οξυγονο παει απο τις κυψελιδες στο αιμα περνωντας τη μεμβρανη, το διοξιδιο παει αναποδα απο αιμα σε κυψελιδες, γιατι εχουν διαφορετικη μερικη πιεση.'},
    {id:'alveoli-vague',qid:'EOP-A-003',expected:['partial','incorrect','uncertain'],
     question:'Περιγράψτε τη διαδικασία ανταλλαγής των αερίων σε κυψελιδικό επίπεδο.',
     reference:'Το οξυγόνο διαχέεται από κυψελίδες προς αίμα και το διοξείδιο του άνθρακα προς την αντίθετη κατεύθυνση μέσω της αναπνευστικής μεμβράνης εξαιτίας διαφορών μερικών πιέσεων.',
     answer:'το οξυγόνο πάει στο αίμα.'}
   ];
   report.liveCases=[];
   for(const item of questions){
    const p= 'Είσαι εκπαιδευτικός αξιολογητής διασωστών. Δέξου σωστές διατυπώσεις με ορθογραφικά ή συντακτικά λάθη, αλλά απαιτείται ΟΛΟ το ουσιώδες περιεχόμενο της απάντησης. Λάθος ιατρικές αρνήσεις/γεγονότα δεν διορθώνονται. Για σωστό δώσε correct, για μερικώς σωστό partial, λάθος incorrect, ασαφές uncertain.\\nΕρώτηση: '+item.question+'\\nΕκπαιδευτική αναφορά: '+item.reference+'\\nΑπάντηση μαθητή: '+item.answer+'\\nΑπάντησε μόνο JSON με πεδία verdict (correct/partial/incorrect/uncertain), reason (ελληνικά), missing (λίστα απαραίτητων στοιχείων που δεν αναφέρθηκαν).';
    try{
     await page.goto('https://playground.ai.cloudflare.com/models?model='+encodeURIComponent('@cf/google/gemma-4-26b-a4b-it'),{waitUntil:'domcontentloaded',timeout:32000});
     await page.waitForTimeout(2600);
     const names=await page.locator('input[aria-hidden="true"]').evaluateAll(els=>els.map(e=>e.value));
     if(!names.includes('gemma-4-26b-a4b-it'))throw Error('Gemma model not selected');
     await page.locator('textarea[data-testid="chat-input"]').fill(p);
     await page.getByRole('button',{name:'Send message'}).click({timeout:8000});
     await page.waitForTimeout(20000);
     const body=await page.locator('body').innerText();
     const ai=body.split('\\nAssistant\\n').pop().split('\\nModel\\n')[0].trim();
     let parsed;try{parsed=JSON.parse(ai.replace(/^\`\`\`(?:json)?\\s*/i,'').replace(/\`\`\`$/,'').trim());}catch{}
     const row={id:item.id,questionId:item.qid,expected:item.expected,actual:parsed?.verdict||null,
      answer:item.answer,modelText:ai.slice(0,2200),pass:item.expected.includes(parsed?.verdict)};
     report.liveCases.push(row);
     console.log('PLAYGROUND_GEMMA_CASE',JSON.stringify(row).slice(0,3500));
    }catch(e){
     const row={id:item.id,error:String(e?.message||e).slice(0,280),pass:false};
     report.liveCases.push(row);console.log('PLAYGROUND_GEMMA_CASE_ERROR',JSON.stringify(row));
    }
   }

  }

 }catch(e){report.modelModeError=String(e?.message||e).slice(0,250);console.log('PLAYGROUND_MODEL_MODE_ERROR',report.modelModeError);}

 console.log('PLAYGROUND_PROBE',JSON.stringify({status:report.status,statusCode:report.statusCode,finalUrl:report.finalUrl,title:report.title,body:report.bodyText.slice(0,2100),buttons:report.buttons,inputs:report.inputs,errors:report.pageErrors}).slice(0,9000));
}catch(e){report.status='error';report.error=String(e?.message||e).slice(0,600);console.log('PLAYGROUND_PROBE_ERROR',report.error);}
finally{
 mkdirSync('audit-results',{recursive:true});
 writeFileSync('audit-results/cloudflare-playground-probe.json',JSON.stringify(report,null,2)+'\n');
 await browser?.close();
}
