// "Show floating MENTOR" button for the MENTOR page: undoes a hide without needing the keyboard shortcut.
import {STORAGE_KEY,parsePrefs,serializePrefs} from "./presence-state.mjs";

const button=document.getElementById("mentor-show-floating");
const note=document.getElementById("mentor-show-floating-note");

function say(text){if(note)note.textContent=text;}

button?.addEventListener("click",()=>{
 try{
  const prefs=parsePrefs(localStorage.getItem(STORAGE_KEY)||"");
  if(prefs.visibility==="hidden")prefs.visibility="minimized";
  localStorage.setItem(STORAGE_KEY,serializePrefs(prefs));
  say("Ο πλωτός MENTOR θα εμφανιστεί ως κουμπί «MENTOR» στις υπόλοιπες σελίδες.");
 }catch{
  say("Δεν ήταν δυνατή η αποθήκευση ρύθμισης σε αυτόν τον browser.");
 }
});
