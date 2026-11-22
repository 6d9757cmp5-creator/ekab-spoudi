(() => {
  "use strict";
  const script = document.currentScript;
  const base = new URL("./", script.src);
  fetch(new URL("radio-widget.html", base), { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error("radio widget unavailable");
      return response.text();
    })
    .then((markup) => {
      document.body.insertAdjacentHTML("beforeend", markup);
      return ["radio.js", "radio-channels.js"].reduce(
        (chain, file) => chain.then(() => new Promise((resolve, reject) => {
          const node = document.createElement("script");
          node.src = new URL(file, base).href;
          node.onload = resolve;
          node.onerror = () => reject(new Error("radio script unavailable"));
          document.body.append(node);
        })),
        Promise.resolve()
      );
    })
    .catch(() => {
      const status = document.createElement("p");
      status.className = "radio-load-error";
      status.textContent = "Ο ασύρματος δεν φόρτωσε. Κάνε ανανέωση της σελίδας.";
      status.setAttribute("role", "status");
      document.body.append(status);
    });
})();
