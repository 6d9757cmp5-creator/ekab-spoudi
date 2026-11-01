import {chromium} from 'playwright';
const base='http://127.0.0.1:8765/';
const browser=await chromium.launch({headless:true});
try{
 for(const [name,viewport] of [['iPhone',{width:390,height:844}],['Desktop',{width:1280,height:800}]]){
  const page=await browser.newPage({viewport});
  const a=await page.goto(base+'index.html',{waitUntil:'domcontentloaded',timeout:30000});
  if(a.status()!==200)throw Error(name+': home not 200');
  const link=page.locator('a[href="tools.html"]');
  if(await link.count()!==1)throw Error(name+': wrong number of home tools links');
  await link.click();
  await page.waitForURL('**/tools.html',{timeout:15000});
  await page.getByRole('heading',{name:'Εργαλεία & Βιβλιοθήκη'}).waitFor({timeout:10000});
  if(await page.locator('h1').count()!==1)throw Error(name+': expected one page title');
  for(const label of ['Εκπαιδευτικές ασκήσεις πρωτοκόλλων','Εργαστήριο ΗΚΓ','Προσομοιωτής Ασθενών','MENTOR OS']){
   if(!(await page.getByRole('link',{name:new RegExp(label)}).count()))throw Error(name+': missing '+label);
  }
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+3))throw Error(name+': horizontal overflow on tools page');
  const links=await page.locator('.tooltile').evaluateAll(els=>els.map(a=>a.getAttribute('href')));
  for(const href of links){
   const response=await page.request.get(new URL(href,base).href,{timeout:30000});
   if(response.status()!==200)throw Error(name+': broken '+href+' HTTP '+response.status());
  }
  console.log('PASS '+name+': home-to-tools navigation, responsive layout, labels and '+links.length+' live links');
  await page.close();
 }
}finally{await browser.close()}
