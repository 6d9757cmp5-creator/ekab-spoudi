/**
 * Text-driven Greek mouth shapes for the MENTOR face.
 * Each letter (or digraph) of a word becomes one of the avatar's five mouth shapes, spread over the word.
 * This is derived from the TEXT and word-boundary timing only: it is NOT audio-aligned and NOT phoneme-accurate lip-sync.
 */
const strip=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();

const DIGRAPH=[["ου","round"],["μπ","closed"],["ντ","wide"],["γκ","wide"],["αι","wide"],["ει","wide"],["οι","wide"],["υι","wide"],["αυ","open"],["ευ","wide"],["τσ","wide"],["τζ","wide"]];
const LETTER={
 α:"open",ε:"wide",η:"wide",ι:"wide",υ:"wide",ο:"round",ω:"round",
 π:"closed",β:"closed",μ:"closed",φ:"closed",
 γ:"wide",δ:"wide",ζ:"wide",θ:"wide",κ:"wide",λ:"wide",ν:"wide",ξ:"wide",ρ:"wide",σ:"wide",ς:"wide",τ:"wide",χ:"wide"
};

/** Ordered mouth shapes for one word; unknown characters are skipped. */
export function shapesForWord(word){
 const w=strip(word).replace(/[^α-ως]/g,"");
 const out=[];
 for(let i=0;i<w.length;){
  const pair=w.slice(i,i+2);
  const d=DIGRAPH.find(([k])=>k===pair);
  if(d){out.push(d[1]);i+=2;}
  else{out.push(LETTER[w[i]]||"wide");i+=1;}
 }
 return out;
}

/** Word that starts at (or contains) charIndex. */
export function wordAt(text,charIndex){
 const s=String(text||""),i=Math.max(0,Math.min(s.length,charIndex|0));
 let a=i;while(a>0&&!/\s/.test(s[a-1]))a--;
 let b=i;while(b<s.length&&!/\s/.test(s[b]))b++;
 return s.slice(a,b);
}

/** [{at:ms,shape}] for a word spoken in about durationMs; ends with a short closing "rest". */
export function scheduleWord(word,durationMs){
 const shapes=shapesForWord(word);
 if(!shapes.length)return [];
 const step=Math.max(45,Math.min(140,durationMs/shapes.length));
 return [...shapes.map((shape,i)=>({at:Math.round(i*step),shape})),{at:Math.round(shapes.length*step),shape:"rest"}];
}
