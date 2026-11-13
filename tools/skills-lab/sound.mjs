/**
 * Ανάλυση ήχου για το Εργαστήριο Ακρόασης: ανάγνωση WAV, φασματογράφημα και σχεδίαση με δείκτη
 * αναπαραγωγής. Οι συναρτήσεις υπολογισμού είναι καθαρές (χωρίς DOM) και ελέγχονται στο core.test.mjs·
 * η εικόνα που βλέπει ο χρήστης βγαίνει από το ίδιο το αρχείο που ακούει, όχι από προσχεδιασμένο σχήμα.
 */

/** 16-bit PCM WAV (μονοφωνικό) → {rate, samples: Float32Array στο [-1,1]}. */
export function parseWav(buffer){
 const view=new DataView(buffer instanceof ArrayBuffer?buffer:buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));
 const tag=i=>String.fromCharCode(view.getUint8(i),view.getUint8(i+1),view.getUint8(i+2),view.getUint8(i+3));
 if(tag(0)!=='RIFF'||tag(8)!=='WAVE')throw Error('not-wav');
 let i=12,rate=0,bits=0,channels=0;
 while(i+8<=view.byteLength){
  const id=tag(i),len=view.getUint32(i+4,true);
  if(id==='fmt '){channels=view.getUint16(i+10,true);rate=view.getUint32(i+12,true);bits=view.getUint16(i+22,true);}
  if(id==='data'){
   if(bits!==16||channels!==1)throw Error('unsupported-wav');
   const n=Math.floor(len/2),samples=new Float32Array(n);
   for(let k=0;k<n;k++)samples[k]=view.getInt16(i+8+k*2,true)/32768;
   return {rate,samples};
  }
  i+=8+len+(len%2);
 }
 throw Error('no-data');
}

/** Επιτόπιος μετασχηματισμός Fourier (radix-2). re, im: Float64Array μήκους δύναμης του 2. */
function fft(re,im){
 const n=re.length;
 for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
 for(let len=2;len<=n;len<<=1){
  const ang=-2*Math.PI/len,wr=Math.cos(ang),wi=Math.sin(ang);
  for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){
   const a=i+k,b=a+len/2,tr=re[b]*cr-im[b]*ci,ti=re[b]*ci+im[b]*cr;
   re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;[cr,ci]=[cr*wr-ci*wi,cr*wi+ci*wr];
  }}
 }
}

/**
 * Φασματογράφημα: παράθυρο Hann, ένταση σε dB. Επιστρέφει {cols, rows, hzPerRow, secPerCol, db}
 * όπου db[c*rows+r] είναι η ένταση της στήλης c (χρόνος) στη συχνότητα r·hzPerRow.
 */
export function spectrogram(samples,rate,{size=512,hop=128,maxHz=2000}={}){
 const win=Float64Array.from({length:size},(_,k)=>0.5-0.5*Math.cos(2*Math.PI*k/(size-1)));
 const rows=Math.min(size/2,Math.floor(maxHz/(rate/size)));
 const cols=Math.max(1,Math.floor((samples.length-size)/hop)+1);
 const db=new Float32Array(cols*rows),re=new Float64Array(size),im=new Float64Array(size);
 for(let c=0;c<cols;c++){
  for(let k=0;k<size;k++){re[k]=(samples[c*hop+k]||0)*win[k];im[k]=0;}
  fft(re,im);
  for(let r=0;r<rows;r++)db[c*rows+r]=10*Math.log10(re[r]*re[r]+im[r]*im[r]+1e-12);
 }
 return {cols,rows,hzPerRow:rate/size,secPerCol:hop/rate,db};
}

/** Ποσοστό δειγμάτων στο όριο της κλίμακας: αντικειμενική ένδειξη ψαλιδισμένης (κορεσμένης) ηχογράφησης. */
export function clippedFraction(samples,limit=0.97){
 let n=0;for(const v of samples)if(Math.abs(v)>=limit)n++;
 return samples.length?n/samples.length:0;
}

/** Σχεδιάζει κυματομορφή (πάνω) και φασματογράφημα (κάτω) σε canvas· position: δευτερόλεπτα για τον δείκτη. */
export function drawSound(canvas,sound,spec,position=-1){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,wave=Math.round(h*0.3),sh=h-wave;
 const dark=document.documentElement.dataset.theme==='dark';
 ctx.fillStyle=dark?'#0d1f2a':'#ffffff';ctx.fillRect(0,0,w,h);
 // Κυματομορφή: μέγιστο |πλάτος| ανά pixel.
 const per=Math.max(1,Math.floor(sound.samples.length/w));ctx.fillStyle=dark?'#7dd3c0':'#0f4c5c';
 for(let x=0;x<w;x++){let m=0;for(let k=x*per;k<(x+1)*per&&k<sound.samples.length;k++)m=Math.max(m,Math.abs(sound.samples[k]));const y=m*wave/2;ctx.fillRect(x,wave/2-y,1,Math.max(1,2*y));}
 // Φασματογράφημα με δυναμικό εύρος 50 dB κάτω από το 99ο εκατοστημόριο της ίδιας ηχογράφησης.
 if(!spec._img||spec._img.width!==w||spec._img.height!==sh){
  const sorted=Float32Array.from(spec.db).sort(),top=sorted[Math.floor(sorted.length*0.99)],floor=top-50;
  const img=ctx.createImageData(w,sh);
  for(let x=0;x<w;x++){const c=Math.min(spec.cols-1,Math.floor(x*spec.cols/w));
   for(let y=0;y<sh;y++){const r=Math.min(spec.rows-1,Math.floor((sh-1-y)*spec.rows/sh));
    const v=Math.max(0,Math.min(1,(spec.db[c*spec.rows+r]-floor)/(top-floor)));const o=(y*w+x)*4;
    // Κλίμακα από σκούρο μπλε σε κίτρινο: ευδιάκριτη και σε ασπρόμαυρη εκτύπωση.
    img.data[o]=Math.round(20+235*v**1.2);img.data[o+1]=Math.round(30+200*v);img.data[o+2]=Math.round(90+40*(1-v));img.data[o+3]=255;}}
  spec._img=img;
 }
 ctx.putImageData(spec._img,0,wave);
 ctx.fillStyle=dark?'#cbd5e1':'#334155';ctx.font='11px system-ui,sans-serif';
 ctx.fillText(`${Math.round(spec.rows*spec.hzPerRow)} Hz`,4,wave+12);ctx.fillText('0 Hz',4,h-4);
 if(position>=0){const x=Math.round(position/(sound.samples.length/sound.rate)*w);ctx.fillStyle='#e11d48';ctx.fillRect(x-1,0,3,h);}
}
