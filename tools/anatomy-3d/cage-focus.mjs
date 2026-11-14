/* Semantic focus groups for SAEK-linked 3D anatomy; not anatomical certification. */
export const ANATOMY_GROUPS=Object.freeze({
 thorax:{name:'Θωρακικός κλωβός',description:'Ομαδική επισήμανση των πλευρών, του στέρνου, των θωρακικών σπονδύλων και των πλευρικών χόνδρων που υπάρχουν στον άτλαντα.'},
 ribs:{name:'Πλευρές',description:'Ομαδική επισήμανση όλων των διαθέσιμων πλευρών, όχι μίας τυχαίας πλευράς.'}
});
const RIB=/\bribs?\b|\bcostae?\b/i;
const CAGE_OTHER=/\bcostal cartilage\b|\bsternum\b|\bmanubrium\b|\bxiphoid\b|\bthoracic vertebr(?:a|ae)\b|\bvertebr(?:a|ae) thoracic(?:a|ae)\b|\bvertebra t(?:[1-9]|1[0-2])\b/i;
/** 0 outside thorax, 1 rib, 2 remaining cage. */
export function cageKind(p){
 if(p?.system!=='skeletal')return 0;
 const name=String(p.name||'');
 return RIB.test(name)?1:CAGE_OTHER.test(name)?2:0;
}
export function matchesCageGroup(p,focus){
 const kind=cageKind(p);
 return focus==='thorax'?kind>0:focus==='ribs'&&kind===1;
}
