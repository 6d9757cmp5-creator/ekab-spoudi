(function(){try{var x=localStorage.getItem('ekab.theme.v1');document.documentElement.dataset.theme=x==='dark'?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();

/* Every page shares the home-brand link; the quick guide only runs on the home page. */
(function(){
 const script=document.createElement('script');
 script.src='ui-guide.js';
 script.async=true;
 document.head.appendChild(script);
})();

/* Shared on desktop, phone and tablet: chapter suggestions and starter medical book. */
(function(){
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='global-tools.css?v=27.1.81';document.head.appendChild(sheet);
 const script=document.createElement('script');script.src='global-tools.js?v=27.1.81';script.async=true;document.head.appendChild(script);
})();

/* One tiny read-only resume tracker shared by Home, SAEK and EOPPEP. */
(function(){
 const script=document.createElement('script');
 script.src='study-resume.js?v=27.1.109';
 script.async=true;
 document.head.appendChild(script);
})();
