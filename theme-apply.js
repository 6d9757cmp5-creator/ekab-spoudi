/* Applies the theme chosen on the site (key ekab.theme.v1) on pages that do not load theme-init.js, before they paint. */
(function(){try{document.documentElement.dataset.theme=localStorage.getItem('ekab.theme.v1')==='dark'?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();
