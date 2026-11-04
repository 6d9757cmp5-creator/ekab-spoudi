/**
 * Read-only educational ECG preview for the Clinical Cockpit.
 * Delegates entirely to the existing ECG Lab waveform engine.
 * Never models an actual rhythm, diagnosis, intervention or vital response.
 */
import {createSyntheticEcg,toSvgPoints} from '../../ecg-lab/core/ecg-synthetic.mjs';

export function buildCockpitEcgPoints(bpm){
  if(!Number.isInteger(bpm))return '';
  try{
    const signal=createSyntheticEcg({bpm,seconds:4,samples:240});
    return toSvgPoints(signal,{width:120,height:28});
  }catch{
    return ''; // Fail closed if the ECG Lab rejects the requested synthetic rate.
  }
}
