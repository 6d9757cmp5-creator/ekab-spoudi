/** Educational navigation only. No unreviewed clinical instructions. */
export const SKILLS=Object.freeze([
{id:'bls',name:'Βασική υποστήριξη ζωής',group:'Αναζωογόνηση',topics:['BLS','ΚΑΡΠΑ','AED']},
{id:'assessment',name:'Πρωτογενής εκτίμηση',group:'Εκτίμηση',topics:['ABCDE','SAMPLE','OPQRST']},
{id:'neuro',name:'Νευρολογική εκτίμηση',group:'Εκτίμηση',topics:['AVPU','GCS','Επικοινωνία']},
{id:'airway',name:'Αεραγωγός και αναπνοή',group:'Επείγοντα',topics:['Αεραγωγός','Αναπνοή','Οξυγόνωση']},
{id:'circulation',name:'Κυκλοφορία και αιμορραγία',group:'Επείγοντα',topics:['Κυκλοφορία','Αιμορραγία','Καταπληξία']},
{id:'trauma',name:'Τραύμα',group:'Τραύμα',topics:['Κατάγματα','Εγκαύματα','Ακινητοποίηση']},
{id:'cardiac',name:'Καρδιολογικά επείγοντα',group:'Επείγοντα',topics:['Θωρακικός πόνος','ΗΚΓ','Αναγνώριση ρυθμών']},
{id:'respiratory',name:'Αναπνευστικά επείγοντα',group:'Επείγοντα',topics:['Δύσπνοια','Παρακολούθηση']},
{id:'pediatric',name:'Παιδιατρικά περιστατικά',group:'Πληθυσμοί',topics:['Παιδιατρική εκτίμηση','Επικοινωνία']},
{id:'obstetric',name:'Μαιευτικά περιστατικά',group:'Πληθυσμοί',topics:['Μαιευτική εκτίμηση','Ασφάλεια']},
{id:'geriatric',name:'Γηριατρικά περιστατικά',group:'Πληθυσμοί',topics:['Εκτίμηση ηλικιωμένου','Επικοινωνία']},
{id:'mci',name:'Πολλαπλοί τραυματίες',group:'Συντονισμός',topics:['Καταμέτρηση','Διαλογή υπό έγκριση','Συντονισμός']},
{id:'equipment',name:'Εξοπλισμός ασθενοφόρου',group:'Εξοπλισμός',topics:['AED','BVM','Monitor','Φορείο']},
{id:'communication',name:'Επικοινωνία και παράδοση',group:'Συντονισμός',topics:['Ομαδική εργασία','Παράδοση περιστατικού']},
{id:'anatomy',name:'3D Ανατομία',group:'Ανατομία',topics:['Σκελετός','Όργανα','Ανατομική ορολογία']}
]);
export function filterSkills(query='',group='all'){const q=String(query).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return SKILLS.filter(s=>(group==='all'||s.group===group)&&[s.name,s.group,...s.topics].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q));}
export function skillsGroups(){return [...new Set(SKILLS.map(s=>s.group))];}
