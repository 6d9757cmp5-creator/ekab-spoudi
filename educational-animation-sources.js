/* Educational Animation ENGINE — anatomy source selection policy.
 * No downloads, credentials, rendering or publishing occur here.
 * BioDigital is preferred only when API access AND intended video rights are verified.
 */
(function(root){
'use strict';
const SOURCES=Object.freeze({
 biodigital:Object.freeze({id:'biodigital',priority:0,requiresApi:true,requiresVideoRights:true}),
 bodyparts3d:Object.freeze({id:'bodyparts3d',priority:1,licenseReview:true}),
 hubmap:Object.freeze({id:'hubmap',priority:2,licenseReview:true}),
 nih3d:Object.freeze({id:'nih3d',priority:3,licenseReview:true,perAssetLicense:true})
});
function usable(asset){
 return !!asset && asset.licenseVerified===true && asset.attribution &&
  asset.provenance && asset.anatomyReviewed===true &&
  asset.videoDerivativesAllowed===true && asset.formatSupported===true;
}
function selectAnatomySource(context){
 const c=context||{};
 if(c.biodigital && c.biodigital.apiEnabled===true &&
    c.biodigital.videoRightsVerified===true &&
    c.biodigital.modelAvailable===true){
  return Object.freeze({source:'biodigital',mode:'licensed-provider'});
 }
 const candidates=Array.isArray(c.assets)?c.assets.filter(a=>SOURCES[a&&a.source] &&
   a.source!=='biodigital' && usable(a) && a.matchesAnatomy===true):[];
 candidates.sort((a,b)=>SOURCES[a.source].priority-SOURCES[b.source].priority);
 if(!candidates.length)return null;
 const a=candidates[0];
 return Object.freeze({source:a.source,assetId:a.id,mode:'licensed-local-asset'});
}
root.EducationalAnimationSources=Object.freeze({SOURCES,usable,selectAnatomySource});
})(typeof window!=='undefined'?window:globalThis);
