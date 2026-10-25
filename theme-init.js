(function(){try{var x=localStorage.getItem('ekab.theme.v1');document.documentElement.dataset.theme=x==='dark'?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();

/* Every page shares the home-brand link; the quick guide only runs on the home page. */
(function(){
 const script=document.createElement('script');
 script.src='ui-guide.js';
 script.async=true;
 document.head.appendChild(script);
})();
