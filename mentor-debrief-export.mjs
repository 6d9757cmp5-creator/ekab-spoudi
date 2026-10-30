/**
 * MENTOR OS — portable study debrief (not patient data).
 * wrap() and download() adapted from Virtual Standardized Patient Simulator,
 * app/index.html, copyright (c) 2026 Igor Gembitsky, MIT License.
 * Original: https://github.com/igembitsky/virtual-standardized-patient
 * Full original license: third_party/virtual-standardized-patient/LICENSE
 *
 * The Greek study report composition below is original EKAB Spoudi code.
 * This is for synthetic educational choices ONLY, never a patient record.
 */
function wrap(text, width, indent) {
  const words = String(text).split(/\s+/);
  const out = []; let cur = "";
  words.forEach(w => {
    if ((cur + " " + w).trim().length > width) { out.push(cur.trim()); cur = w; }
    else cur += " " + w;
  });
  if (cur.trim()) out.push(cur.trim());
  return out.join("\n" + indent);
}
function download(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const status = "ΑΠΟΚΛΕΙΣΤΙΚΑ ΕΚΠΑΙΔΕΥΤΙΚΟ — Συνθετικό σενάριο, όχι πραγματικός ασθενής, ούτε ιατρικό αρχείο ή πιστοποίηση.";
export function buildDebriefReport({topic, role, session, stages, interviewTurns=[]}) {
  if (!topic || !role || !Array.isArray(stages) || !Array.isArray(session?.answers)) throw Error("invalid-study-report");
  const entries = session.answers.slice(0, stages.length).map(answer => {
    if (!Number.isInteger(answer?.stage) || answer.stage < 0 || answer.stage >= stages.length) return null;
    const stage = stages[answer.stage];
    const choice = stage?.choices?.find(entry => entry[0] === answer.choice);
    if (!choice) return null;
    return {stage:answer.stage+1, dimension:stage.dimension, choice:choice[1],feedback:choice[3],pass:choice[2]};
  }).filter(Boolean);
  const interview = Array.isArray(interviewTurns) ? interviewTurns.slice(0,40).filter(turn =>
    turn && Number.isInteger(turn.stage) && turn.stage>=0 && turn.stage<4 &&
    typeof turn.reply==='string' && typeof turn.feedback==='string' &&
    turn.reply.length<=1500 && turn.feedback.length<=1500 && typeof turn.ok==='boolean'
  ) : [];
  if (!entries.length && !interview.length) throw Error("empty-study-report");
  const lines = [
    "ΕΚΑΒ ΣΠΟΥΔΗ — MENTOR DEBRIEF",
    status,
    "",
    "Εκπαιδευτικό θέμα: " + String(topic.name).slice(0,160),
    "Επίπεδο μελέτης: " + String(role.label).slice(0,160),
    "Προσπάθεια: " + (session.completed ? "Ολοκληρωμένη" : "Σε εξέλιξη"),
    "Συνολικά βήματα: " + entries.length + " / " + stages.length,
    "Επιλογές που καλύπτουν τον εκπαιδευτικό στόχο: " + entries.filter(e => e.pass).length,
    "Σημεία για επανάληψη: " + entries.filter(e => !e.pass).length,
    "",
    "ΑΝΑΣΚΟΠΗΣΗ ΑΠΟΦΑΣΕΩΝ"
  ];
  for (const entry of entries) {
    lines.push(
      "",
      entry.stage + ". " + entry.dimension + " — " + (entry.pass ? "Εκπαιδευτικός στόχος" : "Για επανάληψη"),
      "Επιλογή: " + wrap(entry.choice, 78, "  "),
      "Επεξήγηση: " + wrap(entry.feedback, 78, "  ")
    );
  }
  lines.push("", "ΣΥΝΘΕΤΙΚΗ ΕΚΠΑΙΔΕΥΤΙΚΗ ΣΥΝΟΜΙΛΙΑ");
  if (interview.length) {
    for (const turn of interview) {
      lines.push("", (turn.stage+1)+". "+(turn.ok?"Στόχος επικοινωνίας":"Για επανάληψη"),
        "Απάντηση: "+wrap(turn.reply,78,"  "),
        "MENTOR: "+wrap(turn.feedback,78,"  "));
    }
  } else lines.push("Δεν υπάρχει αποθηκευμένη συνομιλία για το θέμα και τον ρόλο.");
  lines.push(
    "",
    "ΕΠΟΜΕΝΗ ΜΕΛΕΤΗ",
    entries.some(e => !e.pass)
      ? "Επανέλαβε τα σημειωμένα βήματα και αντιπαράβαλε τις εξηγήσεις με επαληθευμένες εκπαιδευτικές πηγές."
      : "Επανάλαβε το θέμα σε διαφορετική εκπαιδευτική συνθήκη, χωρίς να θεωρήσεις το αποτέλεσμα πιστοποίηση.",
    "",
    "Η εξαγωγή προέρχεται αποκλειστικά από τις συνθετικές επιλογές που αποθηκεύτηκαν στη συσκευή.",
    "Δεν περιέχει πληροφορίες πραγματικών ασθενών και δεν είναι επίσημο πρωτόκολλο ΕΚΑΒ.",
    status,
    ""
  );
  return lines.join("\n");
}
export function downloadDebriefReport(input) {
  const text = buildDebriefReport(input);
  const safeTopic = String(input.topic.id || "study").replace(/[^a-z0-9_-]/gi,"").slice(0,40)||"study";
  const safeRole = String(input.role.id || "study").replace(/[^a-z0-9_-]/gi,"").slice(0,20)||"study";
  const filename = "mentor-debrief-" + safeTopic + "-" + safeRole + ".txt";
  download(filename, text);
  return filename;
}
