/* Startar rapportmodulen: tema (ljust/mörkt) och själva rapporten. */
(function () {
  const KEY = "programmering-rapport-tema";
  const root = document.documentElement;
  let theme = null;
  try { theme = localStorage.getItem(KEY); } catch (e) { /* ignorera */ }
  const apply = () => {
    const dark = theme ? theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", dark ? "dark" : "light");
  };
  apply();
  document.getElementById("themeBtn").addEventListener("click", () => {
    theme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    try { localStorage.setItem(KEY, theme); } catch (e) { /* ignorera */ }
    apply();
  });
  const main = document.getElementById("innehall");
  window.RAPPORT.render(main).then(() => {
    const id = location.hash.replace(/^#/, "");
    const el = id && document.getElementById(id);
    if (el) el.scrollIntoView();
  });
})();
