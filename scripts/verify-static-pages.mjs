// Validate that all HTML pages keep their local resources and navigation paths.
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../', import.meta.url));
const ignored=new Set(['.git','node_modules','dist','build','.cache']);
function visit(directory){
  const found=[];
  for(const entry of readdirSync(directory,{withFileTypes:true})){
    if(entry.isDirectory()&&!ignored.has(entry.name))found.push(...visit(join(directory,entry.name)));
    else if(entry.isFile()&&entry.name.endsWith('.html'))found.push(join(directory,entry.name));
  }
  return found;
}
let pageCount=0,buttonCount=0,resourceCount=0;
const errors=[];
for(const file of visit(root)){
  pageCount++;
  const html=readFileSync(file,'utf8');
  const name=relative(root,file);
  buttonCount+=(html.match(/<button\b/gi)||[]).length;
  const ids=new Set();
  for(const match of html.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gi)){
    if(ids.has(match[2]))errors.push(name+': duplicate id '+match[2]);
    ids.add(match[2]);
  }
  for(const match of html.matchAll(/\b(?:href|src|poster|action)\s*=\s*(["'])(.*?)\1/gi)){
    const value=match[2].trim();
    if(!value||/^(?:#|\?|https?:|mailto:|tel:|javascript:|data:|blob:|\/\/)/i.test(value))continue;
    const pathname=value.split(/[?#]/,1)[0];
    if(!pathname)continue;
    resourceCount++;
    const destination=resolve(dirname(file),pathname);
    const loc=relative(root,destination);
    if(loc==='..'||loc.startsWith('..'+sep)||loc.startsWith(sep)){
      errors.push(name+': resource escapes project root: '+value);
    }else if(!existsSync(destination)||!statSync(destination).isFile()){
      errors.push(name+': missing resource: '+value);
    }
  }
}
console.log('Checked '+pageCount+' HTML pages, '+resourceCount+' internal references, '+buttonCount+' static button elements');
if(errors.length){
  for(const issue of errors)console.error('ERROR '+issue);
  process.exitCode=1;
}else{
  console.log('PASS: all local HTML paths and duplicate-ID checks');
}
