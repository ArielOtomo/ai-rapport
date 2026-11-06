/* ==========================================================================
   RAPPORTEN – skriv direkt i sidan och spara som PDF
   --------------------------------------------------------------------------
   – Allt sparas automatiskt i webbläsaren (IndexedDB), även bilderna.
     Det finns bara på den här datorn och i den här webbläsaren.
   – "Spara som PDF" bygger en utskriftsversion och öppnar webbläsarens
     utskriftsruta. Välj "Spara som PDF" där.
   – Sidräknaren mäter utskriftsversionen i A4-format.
   Används från app.js: window.RAPPORT.render(mainElement)
   ========================================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const para = (s) => esc(s).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");

  /* ---------------- Lagring i IndexedDB ---------------- */
  const DB = "programmering-ai-vecka", STORE = "kv", KEY = "rapport-v1";
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function dbGet() {
    try { const db = await idb(); return await new Promise((res) => { const q = db.transaction(STORE).objectStore(STORE).get(KEY); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); }
    catch (e) { return null; }
  }
  async function dbSet(val) {
    const db = await idb();
    return new Promise((res, rej) => { const t = db.transaction(STORE, "readwrite"); t.objectStore(STORE).put(val, KEY); t.oncomplete = res; t.onerror = () => rej(t.error); });
  }

  /* ---------------- Rapportens innehåll ---------------- */
  const rows = (n, obj) => Array.from({ length: n }, () => ({ ...obj }));
  const EMPTY = () => ({
    namn: "", klass: "", verktyg: "", modell: "",
    d1: { brief: "", figma: "", app: "", fel: rows(3, { vad: "", varfor: "", forklaring: "" }) },
    d2: { rader: rows(3, { brist: "", design: "", kod: "", borde: "" }), typer: "" },
    d3: {
      bilder: rows(3, { fil: "", storlek: "", format: "" }),
      beroenden: "", beroendenLista: "",
      kontrast: [{ element: "Brödtext", text: "#333333", bg: "#ffffff", stor: false }, { element: "Knapp", text: "#ffffff", bg: "#e54670", stor: true }],
      aiBild: "", aiFel: "",
      brister: rows(3, { kontroll: "", brist: "", hur: "", atgard: "", forhindra: "" })
    },
    d4: { delade: "", aga: "", marka: "" },
    d5: { brief: "", process: "", steg: rows(4, { steg: "", jag: "", ai: "", kontroll: "" }), motivera: "" },
    kallor: { valda: [], egna: "" },
    blockerade: 0
  });
  const ORSAKER = ["Hallucination", "Kontextfönstret", "Otydlig prompt", "Saknades i designen", "Saknades i briefen", "Annat"];
  const KONTROLLER = ["1. Bilder", "2. Beroenden", "3. Kontrast", "4. AI-granskning"];

  let data = EMPTY(), saveTimer = null, statusEl = null, rootEl = null;

  // Läs och skriv med en sökväg, t.ex. "d1.fel.0.vad"
  const getAt = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), data);
  function setAt(path, val) {
    const ks = path.split("."), last = ks.pop();
    const o = ks.reduce((o, k) => o[k], data);
    o[last] = val;
  }
  function queueSave() {
    if (statusEl) { statusEl.textContent = "Sparar…"; statusEl.className = "rp-status"; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try { await dbSet(data); if (statusEl) { statusEl.textContent = "✓ Sparat"; statusEl.className = "rp-status ok"; } }
      catch (e) { if (statusEl) { statusEl.textContent = "Kunde inte spara – är webbläsaren i privat läge?"; statusEl.className = "rp-status err"; } }
      countPages();
    }, 500);
  }

  /* ---------------- Kontrast enligt WCAG ---------------- */
  function lum(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return null;
    const n = parseInt(m[1], 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function ratio(a, b) {
    const la = lum(a), lb = lum(b);
    if (la == null || lb == null) return null;
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  const fmtRatio = (r) => (r == null ? "–" : r.toFixed(2).replace(".", ",") + ":1");
  const passes = (r, stor) => r != null && r >= (stor ? 3 : 4.5);

  /* ---------------- Bilder: förminska och spara som data ---------------- */
  function readImage(file) {
    return new Promise((res, rej) => {
      if (!file || !/^image\//.test(file.type)) return rej(new Error("Inte en bild"));
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 1600, s = Math.min(1, max / img.width);
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          const ctx = c.getContext("2d");
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL("image/jpeg", 0.9));
        };
        img.onerror = rej; img.src = fr.result;
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }

  /* ---------------- Små byggstenar ---------------- */
  const field = (path, label, opts = {}) => {
    const v = getAt(path) || "";
    const id = "f-" + path.replace(/\./g, "-");
    const input = opts.area
      ? `<textarea id="${id}" data-k="${path}" rows="${opts.rows || 4}" placeholder="${esc(opts.ph || "")}">${esc(v)}</textarea>`
      : `<input id="${id}" data-k="${path}" type="text" value="${esc(v)}" placeholder="${esc(opts.ph || "")}">`;
    return `<div class="rp-field ${opts.cls || ""}"><label for="${id}">${label}</label>${opts.hint ? `<small class="rp-hint">${opts.hint}</small>` : ""}${input}</div>`;
  };
  const imageSlot = (path, label) => {
    const v = getAt(path);
    return `<div class="rp-img" data-img="${path}" tabindex="0" aria-label="${esc(label)}: klicka för att välja en bild, eller klistra in med Ctrl+V">
      <span class="rp-img-label">${esc(label)}</span>
      ${v ? `<img src="${v}" alt="${esc(label)}">` : `<span class="rp-img-empty">Klicka för att välja en bild<br><small>eller markera rutan och klistra in en skärmdump</small></span>`}
      <span class="rp-img-actions">${v ? `<button type="button" class="btn small" data-img-act="remove">Ta bort</button>` : ""}</span>
      <input type="file" accept="image/*" hidden>
    </div>`;
  };
  // Tabell där varje cell är ett textfält. cols = [[nyckel, rubrik, typ?]]
  const table = (path, cols, opts = {}) => {
    const list = getAt(path);
    return `<div class="rp-table-wrap"><table class="rp-table">
      <thead><tr>${cols.map(([, h]) => `<th>${h}</th>`).join("")}<th aria-label="Ta bort"></th></tr></thead>
      <tbody>${list.map((row, i) => `<tr>${cols.map(([k, h, typ]) => {
        const p = `${path}.${i}.${k}`, v = row[k] || "";
        if (typ === "select" || typ === "kontroll") return `<td><select data-k="${p}" aria-label="${esc(h)}"><option value="">Välj…</option>${(typ === "kontroll" ? KONTROLLER : ORSAKER).map((o) => `<option ${o === v ? "selected" : ""}>${o}</option>`).join("")}</select></td>`;
        return `<td><textarea data-k="${p}" rows="2" aria-label="${esc(h)}, rad ${i + 1}">${esc(v)}</textarea></td>`;
      }).join("")}<td><button type="button" class="rp-x" data-del="${path}" data-i="${i}" aria-label="Ta bort rad ${i + 1}" title="Ta bort rad">×</button></td></tr>`).join("")}</tbody>
    </table></div>
    <button type="button" class="btn small" data-add="${path}">+ Lägg till rad</button>`;
  };
  const section = (n, title, hint, body) => `
    <section class="rp-sec" id="del-${n}">
      <div class="rp-sec-head"><span class="rp-num">${n}</span><h2>${title}</h2></div>
      ${hint ? `<details class="rp-help"><summary>Vad ska med?</summary><div>${hint}</div></details>` : ""}
      ${body}
    </section>`;

  /* ---------------- Formuläret ---------------- */
  function formHtml() {
    const refs = window.KURS.refs || {};
    return `
      <section class="rp-sec rp-meta">
        <div class="rp-grid">
          ${field("namn", "Ditt namn")}
          ${field("klass", "Klass")}
          ${field("verktyg", "AI-verktyg", { ph: "t.ex. Lovable, Claude Code" })}
          ${field("modell", "Modell", { ph: "t.ex. Claude Fable 5.1" })}
        </div>
      </section>

      ${section(1, "Kedjan och vad som blev fel",
        "Visa briefen, Figma-designen och den färdiga appen sida vid sida. Peka ut minst tre ställen där appen inte blev som designen, och förklara varför med måndagens begrepp.",
        `<div class="rp-imgs">${imageSlot("d1.brief", "Briefen")}${imageSlot("d1.figma", "Designen i Figma")}${imageSlot("d1.app", "Appen")}</div>
         <h3>Minst tre ställen där appen inte blev som designen</h3>
         ${table("d1.fel", [["vad", "Vad blev fel?"], ["varfor", "Varför?", "select"], ["forklaring", "Förklara med dina ord"]])}`)}

      ${section(2, "Briefens brister",
        "Hitta minst tre brister i briefen och följ var och en genom kedjan. Det kan vara saknat syfte eller målgrupp, oklara flöden, saknade states som tomt läge och felmeddelanden, eller inga krav på tillgänglighet.",
        `${table("d2.rader", [["brist", "Brist i briefen"], ["design", "Vad den ledde till i designen"], ["kod", "Vad den ledde till i koden"], ["borde", "Så hade briefen behövt säga"]])}
         ${field("d2.typer", "Vilka fel fanns i briefen, vilka lade du själv till i designen, och vilka lade AI till?", { area: true, rows: 5 })}`)}

      ${section(3, "Hållbarhet och tillgänglighet – fyra kontroller",
        "Inget behöver installeras och appen behöver inte startas. Det räcker med repot på GitHub, Figma-filen och AI-verktyget du redan använt.",
        `<h3>Kontroll 1: Bilder</h3>
         <p class="rp-hint">Öppna mappen med bilder i repot på GitHub. Anteckna de tre största filerna och deras format.</p>
         ${table("d3.bilder", [["fil", "Fil"], ["storlek", "Storlek"], ["format", "Format"]])}
         <h3>Kontroll 2: Beroenden</h3>
         <div class="rp-grid">${field("d3.beroenden", "Antal paket under \"dependencies\" i package.json", { ph: "t.ex. 12, eller: ingen package.json – ren HTML och CSS" })}</div>
         ${field("d3.beroendenLista", "Vilka paket är det? (valfritt)", { area: true, rows: 2 })}
         <h3>Kontroll 3: Kontrast</h3>
         <p class="rp-hint">Hämta färgerna från Figma. AA kräver 4,5:1 för vanlig text och 3:1 för stor text och knappar.</p>
         <div class="rp-contrast">${data.d3.kontrast.map((c, i) => contrastRow(c, i)).join("")}</div>
         <button type="button" class="btn small" data-add="d3.kontrast">+ Lägg till färgpar</button>
         <h3>Kontroll 4: AI-granskning</h3>
         <div class="rp-prompt"><p>Granska koden i det här projektet mot WCAG 2.2 nivå AA. Lista bilder utan alt-text, knappar och länkar som inte är riktiga knapp- eller länkelement, saknad fokusmarkering och formulärfält utan etikett. Ange fil för varje fynd.</p><button type="button" class="btn small" data-copy-prompt>Kopiera prompten</button></div>
         <p class="rp-hint">Lägg in en skärmdump av AI:ns svar. Du behöver inte skriva av det.</p>
         <div class="rp-imgs one">${imageSlot("d3.aiBild", "AI:ns svar")}</div>
         <div class="rp-summary">
           <h3>Tre brister – kontrollerade och åtgärdade</h3>
           <p class="rp-hint">Välj tre brister från dina fyra kontroller. <strong>Minst två ska vara fynd från AI-granskningen</strong> som du har kontrollerat själv i koden eller i Figma. Skriv hur du kontrollerade, vad du skulle åtgärda och om briefen eller designen kunde ha förhindrat bristen.</p>
           ${table("d3.brister", [["kontroll", "Från kontroll", "kontroll"], ["brist", "Brist"], ["hur", "Så kontrollerade jag"], ["atgard", "Åtgärd"], ["forhindra", "Kunde briefen eller designen ha förhindrat den?"]])}
           ${field("d3.aiFel", "Stämde allt AI-granskningen sa? Skriv vad som inte stämde, och vad den missade.", { area: true, rows: 4 })}
         </div>`)}

      ${section(4, "Säkerhet och rättigheter", "",
        `${field("d4.delade", "Vad delade du med AI-verktyget? Fanns det något du inte borde ha delat? Får företaget använda det du skickade, enligt villkoren för ditt verktyg?", { area: true, rows: 5 })}
         ${field("d4.aga", "Vem äger koden och bilderna i appen? Kan någon annan använda dem fritt?", { area: true, rows: 4 })}
         ${field("d4.marka", "Behöver något i appen märkas som AI-genererat om den skulle publiceras på riktigt?", { area: true, rows: 3 })}`)}

      ${section(5, "Din strategi – kärnan i rapporten", "",
        `<h3>1. Skriv om briefen</h3>
         ${field("d5.brief", "Den förbättrade briefen – max en sida, där bristerna från del 2 är åtgärdade", { area: true, rows: 14, hint: "<span data-words=\"d5.brief\"></span>" })}
         <h3>2. Din process från brief till kod</h3>
         <p class="rp-hint">Ladda upp en bild eller ett flödesschema – eller fyll i tabellen. Ange i varje steg vad du gör själv, vad AI gör och var du kontrollerar resultatet.</p>
         <div class="rp-imgs one">${imageSlot("d5.process", "Processbild")}</div>
         ${table("d5.steg", [["steg", "Steg"], ["jag", "Det gör jag"], ["ai", "Det gör AI"], ["kontroll", "Här kontrollerar jag"]])}
         <h3>3. Motivera</h3>
         ${field("d5.motivera", "Varför gör du som designer de steg du behåller själv? Vad händer om man hoppar över dem för att gå snabbare?", { area: true, rows: 7 })}`)}

      ${section("K", "Källor", "Ange källor när du använder siffror eller regler från måndagen.",
        `<div class="rp-refs">${Object.keys(refs).map((k) => `<label class="rp-ref"><input type="checkbox" data-ref="${k}" ${data.kallor.valda.includes(String(k)) ? "checked" : ""}> <span>${esc(refs[k][0])}</span></label>`).join("")}</div>
         ${field("kallor.egna", "Andra källor (en per rad)", { area: true, rows: 3 })}`)}
    `;
  }
  function contrastRow(c, i) {
    const r = ratio(c.text, c.bg), ok = passes(r, c.stor);
    return `<div class="rp-crow" data-crow="${i}">
      <input type="text" data-k="d3.kontrast.${i}.element" value="${esc(c.element)}" aria-label="Element" placeholder="Element">
      <label class="rp-color"><span>Text</span><input type="color" data-k="d3.kontrast.${i}.text" value="${esc(c.text)}"><input type="text" data-k="d3.kontrast.${i}.text" value="${esc(c.text)}" aria-label="Textfärg som hex" class="rp-hex"></label>
      <label class="rp-color"><span>Bakgrund</span><input type="color" data-k="d3.kontrast.${i}.bg" value="${esc(c.bg)}"><input type="text" data-k="d3.kontrast.${i}.bg" value="${esc(c.bg)}" aria-label="Bakgrund som hex" class="rp-hex"></label>
      <label class="rp-check"><input type="checkbox" data-k="d3.kontrast.${i}.stor" ${c.stor ? "checked" : ""}> Stor text / knapp</label>
      <span class="rp-sample" style="color:${esc(c.text)};background:${esc(c.bg)}">Aa</span>
      <span class="rp-ratio ${r == null ? "" : ok ? "ok" : "bad"}">${fmtRatio(r)} ${r == null ? "" : ok ? "✓ Klarar AA" : "✗ Klarar inte AA"}</span>
      <button type="button" class="rp-x" data-del="d3.kontrast" data-i="${i}" aria-label="Ta bort färgpar" title="Ta bort">×</button>
    </div>`;
  }

  /* ---------------- Utskriftsversionen ---------------- */
  const has = (v) => v != null && String(v).trim() !== "";
  const rowsFilled = (list) => list.filter((r) => Object.values(r).some((v) => typeof v === "string" && has(v)));
  function printTable(list, cols) {
    const f = rowsFilled(list);
    if (!f.length) return "";
    return `<table><thead><tr>${cols.map(([, h]) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${f.map((r) => `<tr>${cols.map(([k]) => `<td>${esc(r[k] || "").replace(/\n/g, "<br>")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
  const qa = (q, a) => has(a) ? `<h3>${esc(q)}</h3>${para(a)}` : "";
  function printHtml(d) {
    d = d || data;
    const refs = window.KURS.refs || {};
    // Kommentarer finns bara i exempelrapporten
    const note = (k) => d.kommentarer && d.kommentarer[k] ? `<aside class="pr-note"><strong>Därför är det här bra:</strong> ${esc(d.kommentarer[k])}</aside>` : "";
    const today = new Date().toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
    const img = (src, cap) => src ? `<figure><img src="${src}" alt="${esc(cap)}"><figcaption>${esc(cap)}</figcaption></figure>` : "";
    const contrast = d.d3.kontrast.filter((c) => has(c.element) || ratio(c.text, c.bg) != null);
    const valda = d.kallor.valda.filter((k) => refs[k]).map((k) => `${refs[k][0]}. ${refs[k][1]}`);
    const egna = d.kallor.egna.split("\n").filter(has);
    return `
      <header class="pr-head">
        <p class="pr-kicker">AI-vecka · Rapport</p>
        <h1>Från brief till kod: AI-rapport</h1>
        <p class="pr-meta">${[d.namn, d.klass, today].filter(has).map(esc).join(" · ")}</p>
        ${has(d.verktyg) || has(d.modell) ? `<p class="pr-meta">AI-verktyg: <strong>${esc(d.verktyg || "–")}</strong> · Modell: <strong>${esc(d.modell || "–")}</strong></p>` : ""}
      </header>

      ${d.kommentarer && d.kommentarer.head ? `<aside class="pr-note pr-note-head">${esc(d.kommentarer.head)}</aside>` : ""}
      <h2>1. Kedjan och vad som blev fel</h2>${note("d1")}
      ${d.d1.brief || d.d1.figma || d.d1.app ? `<div class="pr-imgs">${img(d.d1.brief, "Briefen")}${img(d.d1.figma, "Designen i Figma")}${img(d.d1.app, "Appen")}</div>` : ""}
      ${printTable(d.d1.fel, [["vad", "Vad blev fel"], ["varfor", "Varför"], ["forklaring", "Förklaring"]])}

      <h2>2. Briefens brister</h2>${note("d2")}
      ${printTable(d.d2.rader, [["brist", "Brist i briefen"], ["design", "Ledde till i designen"], ["kod", "Ledde till i koden"], ["borde", "Så hade briefen behövt säga"]])}
      ${qa("Briefen, designen eller AI?", d.d2.typer)}

      <h2>3. Hållbarhet och tillgänglighet</h2>${note("d3")}
      ${rowsFilled(d.d3.bilder).length ? `<h3>Kontroll 1: Bilder</h3>${printTable(d.d3.bilder, [["fil", "Fil"], ["storlek", "Storlek"], ["format", "Format"]])}` : ""}
      ${has(d.d3.beroenden) || has(d.d3.beroendenLista) ? `<h3>Kontroll 2: Beroenden</h3>${has(d.d3.beroenden) ? `<p>Antal paket under dependencies: <strong>${esc(d.d3.beroenden)}</strong></p>` : ""}${has(d.d3.beroendenLista) ? para(d.d3.beroendenLista) : ""}` : ""}
      ${contrast.length ? `<h3>Kontroll 3: Kontrast</h3><table><thead><tr><th>Element</th><th>Text</th><th>Bakgrund</th><th>Kontrast</th><th>WCAG AA</th></tr></thead><tbody>${contrast.map((c) => { const r = ratio(c.text, c.bg); return `<tr><td>${esc(c.element)}${c.stor ? " (stor)" : ""}</td><td><span class="pr-sw" style="background:${esc(c.text)}"></span>${esc(c.text)}</td><td><span class="pr-sw" style="background:${esc(c.bg)}"></span>${esc(c.bg)}</td><td>${fmtRatio(r)}</td><td>${passes(r, c.stor) ? "Klarar" : "Klarar inte"} (krav ${c.stor ? "3" : "4,5"}:1)</td></tr>`; }).join("")}</tbody></table>` : ""}
      ${d.d3.aiBild || has(d.d3.aiFynd) || has(d.d3.kontrollerat) ? `<h3>Kontroll 4: AI-granskning</h3>${img(d.d3.aiBild, "AI:ns svar på granskningsprompten")}${para(d.d3.aiFynd || "")}${qa("Det här kontrollerade jag själv", d.d3.kontrollerat)}${qa("Hittade AI-granskningen något som inte stämde?", d.d3.stamde)}` : ""}
      ${rowsFilled(d.d3.brister).length ? `<h3>Tre brister – kontrollerade och åtgärdade</h3>${printTable(d.d3.brister, [["kontroll", "Kontroll"], ["brist", "Brist"], ["hur", "Så kontrollerade jag"], ["atgard", "Åtgärd"], ["forhindra", "Kunde briefen eller designen ha förhindrat den?"]])}` : ""}
      ${qa("Stämde allt AI-granskningen sa?", d.d3.aiFel)}

      <h2>4. Säkerhet och rättigheter</h2>${note("d4")}
      ${qa("Vad jag delade med AI-verktyget", d.d4.delade)}
      ${qa("Vem äger koden och bilderna?", d.d4.aga)}
      ${qa("Behöver något märkas som AI-genererat?", d.d4.marka)}

      <h2>5. Min strategi</h2>${note("d5")}
      ${has(d.d5.brief) ? `<h3>Den förbättrade briefen</h3><div class="pr-brief">${para(d.d5.brief)}</div>` : ""}
      ${d.d5.process || rowsFilled(d.d5.steg).length ? `<h3>Min process från brief till kod</h3>${img(d.d5.process, "Processen")}${printTable(d.d5.steg, [["steg", "Steg"], ["jag", "Det gör jag"], ["ai", "Det gör AI"], ["kontroll", "Här kontrollerar jag"]])}` : ""}
      ${qa("Därför gör jag de här stegen själv", d.d5.motivera)}

      ${valda.length || egna.length ? `<h2>Källor</h2><ol class="pr-refs">${[...valda, ...egna].map((r) => `<li>${esc(r)}</li>`).join("")}</ol>` : ""}
    `;
  }

  /* ---------------- Sidräknare ---------------- */
  let measureEl = null;
  function countPages() {
    const out = $("#rpPages");
    if (!out) return;
    if (!measureEl) { measureEl = document.createElement("div"); measureEl.className = "print-doc pr-measure"; measureEl.setAttribute("aria-hidden", "true"); document.body.appendChild(measureEl); }
    measureEl.innerHTML = printHtml();
    const imgs = $$("img", measureEl);
    const done = () => {
      // Utskriften blir lite luftigare än mätningen, därav 1,08. Avrunda uppåt till hela sidor.
      const n = Math.max(1, Math.ceil(simulatePages(measureEl) * 1.08 - 0.05));
      out.textContent = `≈ ${n} ${n === 1 ? "sida" : "sidor"}`;
      out.className = "rp-pages " + (n < 4 ? "low" : n > 6 ? "high" : "ok");
      out.title = n < 4 ? "Målet är 4–6 sidor" : n > 6 ? "Målet är 4–6 sidor – korta gärna" : "Inom målet 4–6 sidor";
    };
    const pending = imgs.filter((i) => !i.complete);
    if (!pending.length) done(); else Promise.all(pending.map((i) => new Promise((r) => { i.onload = i.onerror = r; }))).then(done);
  }

  // Räknar sidor ungefär som skrivaren gör: bilder och tabellrader delas inte mellan
  // sidor, rubriker hamnar inte ensamma längst ner, vanlig text flyter vidare.
  function simulatePages(root) {
    const pageH = 261 * 96 / 25.4;                             // A4 297 mm minus marginaler 2 × 18 mm
    let page = 1, used = 0;
    const box = root.getBoundingClientRect().top;
    const kids = Array.from(root.children).flatMap((el) => (el.tagName === "HEADER" ? [el] : [el]));
    const top = (el) => el.getBoundingClientRect().top - box;
    const place = (h, keep) => {
      if (keep && used > 0 && used + h > pageH && h <= pageH) { page++; used = 0; }
      used += h;
      while (used > pageH) { used -= pageH; page++; }
    };
    kids.forEach((el, i) => {
      const next = kids[i + 1];
      const h = (next ? top(next) : root.scrollHeight) - top(el);
      if (el.tagName === "TABLE") {
        const rows = Array.from(el.rows), head = el.tHead ? el.tHead.offsetHeight : 0;
        const extra = h - rows.reduce((s, r) => s + r.offsetHeight, 0);
        place(Math.max(0, extra), false);
        rows.forEach((r, j) => {
          const before = page;
          place(r.offsetHeight, true);
          if (page !== before && j > 0 && head) used += head;    // rubrikraden upprepas på ny sida
        });
      } else if (/^H[23]$/.test(el.tagName)) {
        if (used > 0 && used + h + 60 > pageH) { page++; used = 0; }
        place(h, false);
      } else {
        const keep = el.tagName === "FIGURE" || el.classList.contains("pr-imgs") || el.tagName === "HEADER";
        place(h, keep);
      }
    });
    return page - 1 + used / pageH;
  }

  /* ---------------- Ordräknare för briefen ---------------- */
  function updateWords() {
    $$("[data-words]", rootEl).forEach((el) => {
      const n = (getAt(el.dataset.words) || "").trim().split(/\s+/).filter(Boolean).length;
      el.textContent = `${n} ord. En A4-sida rymmer ungefär 400–500 ord.`;
      el.classList.toggle("warn", n > 500);
    });
  }

  /* ---------------- SPÄRREN: ingen text utifrån ----------------
     Man får kopiera och klistra in text som redan finns i rapporten – mellan
     rutorna eller inom samma ruta. Text som kommer utifrån (t.ex. från en
     AI-chatt eller ett annat dokument) stoppas. Skärmdumpar får klistras in
     i bildrutorna.
     Så avgörs det: texten är "egen" om den har kopierats eller klippts ut
     ur en ruta i rapporten, eller om den redan finns i någon av rutorna. */
  const ownClips = new Set();
  const CLIP_KEY = "rapport-egna-urklipp";
  try { (JSON.parse(sessionStorage.getItem(CLIP_KEY)) || []).forEach((t) => ownClips.add(t)); } catch (e) { /* ignorera */ }
  const norm = (t) => String(t || "").replace(/\r/g, "").replace(/\s+/g, " ").trim();
  const isTextField = (el) => el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && /^(text|search|)$/.test(el.type)));
  let pasteOk = false;
  function rememberClip(t) {
    const k = norm(t);
    if (!k) return;
    ownClips.add(k);
    try { sessionStorage.setItem(CLIP_KEY, JSON.stringify([...ownClips].slice(-50))); } catch (e) { /* ignorera */ }
  }
  // All text som finns i rapporten just nu (bilder räknas inte)
  function reportText() {
    const out = [];
    (function walk(o) { for (const k in o) { const v = o[k]; if (typeof v === "string" && !v.startsWith("data:")) out.push(norm(v)); else if (v && typeof v === "object") walk(v); } })(data);
    return out.join("\n");
  }
  // Små saker utifrån är tillåtna: en kort rad (t.ex. en färgkod, ett filnamn eller
  // ett modellnamn) och länkar till källor. Ändra gränsen här.
  const KORT_RAD = 40;
  const isSmallOrLinks = (t) => {
    const raw = String(t || "").trim();
    if (!/\n/.test(raw) && raw.length <= KORT_RAD) return true;
    return raw.split(/\n+/).every((l) => /^https?:\/\/\S+$/.test(l.trim()));
  };
  function isInternal(t) {
    const k = norm(t);
    if (!k || isSmallOrLinks(t)) { pasteOk = true; return true; }
    if (ownClips.has(k)) { pasteOk = true; return true; }
    if (reportText().includes(k)) { pasteOk = true; return true; }
    return false;
  }
  let toastTimer;
  function blocked(msg) {
    data.blockerade = (data.blockerade || 0) + 1; queueSave();
    let t = document.getElementById("rpToast");
    if (!t) { t = document.createElement("div"); t.id = "rpToast"; t.className = "rp-toast"; t.setAttribute("role", "alert"); document.body.appendChild(t); }
    t.textContent = msg || "Text utifrån går inte att klistra in här. Skriv med egna ord – du kan bara kopiera och klistra inom rapporten.";
    t.classList.add("on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 4500);
  }
  ["copy", "cut"].forEach((ev) => document.addEventListener(ev, (e) => {
    const el = e.target;
    if (isTextField(el)) rememberClip(el.value.slice(el.selectionStart, el.selectionEnd));
    else if (el && el.closest && el.closest(".rp-form")) rememberClip(String(window.getSelection()));
  }));

  /* ---------------- Rita sidan ---------------- */
  async function render(main) {
    rootEl = main;
    const saved = await dbGet();
    if (saved) data = Object.assign(EMPTY(), saved);
    main.classList.add("is-rapport");
    main.innerHTML = `
      <span class="eyebrow">Rapporten</span>
      <h1>Från brief till kod: AI-rapport</h1>
      <p class="lead">Skriv rapporten direkt här. Allt sparas automatiskt i den här webbläsaren. När du är klar: <strong>Spara som PDF</strong> och lämna in på itslearning senast fredag 20/11 kl. 23:59.</p>
      <div class="rp-rule"><strong>Skriv med egna ord.</strong> Text utifrån – till exempel från en AI-chatt – går inte att klistra in. Du kan kopiera och klistra mellan rutorna i rapporten, klistra in korta saker som färgkoder, filnamn och länkar, och klistra in skärmdumpar i bildrutorna.</div>
      <div class="rp-bar" role="region" aria-label="Rapportens verktyg">
        <span class="rp-status" id="rpStatus" role="status">✓ Sparat</span>
        <span class="rp-pages" id="rpPages" title="Målet är 4–6 sidor">–</span>
        <nav class="rp-jump" aria-label="Hoppa till del">${[1, 2, 3, 4, 5].map((n) => `<a href="#/rapport#del-${n}">${n}</a>`).join("")}</nav>
        <span class="grow"></span>
        ${window.EXEMPEL ? `<button type="button" class="btn" data-act="example">Visa exempelrapport</button>` : ""}
        <button type="button" class="btn" data-act="preview">Förhandsgranska</button>
        <button type="button" class="btn primary" data-act="pdf">Spara som PDF</button>
      </div>
      <div class="rp-form">${formHtml()}</div>
      <div class="rp-danger"><button type="button" class="link-btn" data-act="clear">Töm hela rapporten</button></div>
      <dialog class="rp-preview" id="rpPreview" aria-label="Förhandsgranskning">
        <div class="rp-preview-bar"><strong class="rp-preview-title">Förhandsgranskning</strong><span class="grow"></span><button type="button" class="btn primary" data-act="pdf">Spara som PDF</button><button type="button" class="btn" data-act="close">Stäng</button></div>
        <div class="rp-preview-page print-doc"></div>
      </dialog>`;
    statusEl = $("#rpStatus");
    wire(main);
    updateWords();
    autosize(main);
    countPages();
  }

  function rerender() {
    const y = window.scrollY;
    $(".rp-form", rootEl).innerHTML = formHtml();
    autosize(rootEl); updateWords(); countPages();
    window.scrollTo(0, y);
  }
  function autosize(root) {
    $$("textarea", root).forEach((t) => { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; });
  }

  async function setImage(slot, file) {
    try {
      const url = await readImage(file);
      setAt(slot.dataset.img, url); queueSave(); rerender();
    } catch (e) { alertMsg("Det där gick inte att läsa som en bild."); }
  }
  function alertMsg(t) { if (statusEl) { statusEl.textContent = t; statusEl.className = "rp-status err"; } }

  function openPrint() {
    let doc = $("#printRoot");
    if (!doc) { doc = document.createElement("div"); doc.id = "printRoot"; doc.className = "print-doc"; document.body.appendChild(doc); }
    doc.innerHTML = printHtml();
    const old = document.title;
    document.title = ["Rapport AI-vecka", data.namn].filter(has).join(" – ");
    const go = () => { window.print(); setTimeout(() => { document.title = old; }, 500); };
    const pending = $$("img", doc).filter((i) => !i.complete);
    if (!pending.length) go(); else Promise.all(pending.map((i) => new Promise((r) => { i.onload = i.onerror = r; }))).then(go);
  }

  function wire(main) {
    main.addEventListener("input", (e) => {
      const el = e.target;
      if (el.dataset.k) {
        const val = el.type === "checkbox" ? el.checked : el.value;
        setAt(el.dataset.k, val);
        if (el.tagName === "TEXTAREA") { el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; }
        // Färgfälten hör ihop i par: uppdatera den andra och mätningen
        const row = el.closest(".rp-crow");
        if (row) {
          $$(`[data-k="${el.dataset.k}"]`, row).forEach((o) => { if (o !== el && o.type !== "checkbox") { if (o.type === "color" && !/^#[0-9a-f]{6}$/i.test(val)) return; o.value = val; } });
          const i = +row.dataset.crow, c = data.d3.kontrast[i], r = ratio(c.text, c.bg), ok = passes(r, c.stor);
          const out = $(".rp-ratio", row);
          out.textContent = `${fmtRatio(r)} ${r == null ? "" : ok ? "✓ Klarar AA" : "✗ Klarar inte AA"}`;
          out.className = "rp-ratio " + (r == null ? "" : ok ? "ok" : "bad");
          const s = $(".rp-sample", row); if (lum(c.text) != null) s.style.color = c.text; if (lum(c.bg) != null) s.style.background = c.bg;
        }
        if (el.dataset.k === "d5.brief") updateWords();
        queueSave();
      }
      if (el.dataset.ref) {
        const set = new Set(data.kallor.valda);
        if (el.checked) set.add(el.dataset.ref); else set.delete(el.dataset.ref);
        data.kallor.valda = [...set]; queueSave();
      }
    });
    main.addEventListener("change", (e) => {
      if (e.target.type === "file") { const slot = e.target.closest("[data-img]"); if (slot && e.target.files[0]) setImage(slot, e.target.files[0]); }
      if (e.target.tagName === "SELECT" || e.target.type === "checkbox") e.target.dispatchEvent(new Event("input", { bubbles: true }));
    });
    main.addEventListener("click", (e) => {
      const t = e.target;
      const add = t.closest("[data-add]");
      if (add) {
        const list = getAt(add.dataset.add);
        const tmpl = add.dataset.add === "d3.kontrast" ? { element: "", text: "#000000", bg: "#ffffff", stor: false } : Object.fromEntries(Object.keys(list[0] || {}).map((k) => [k, ""]));
        list.push(tmpl); queueSave(); rerender(); return;
      }
      const del = t.closest("[data-del]");
      if (del) { getAt(del.dataset.del).splice(+del.dataset.i, 1); queueSave(); rerender(); return; }
      const imgAct = t.closest("[data-img-act]");
      if (imgAct) { const slot = t.closest("[data-img]"); setAt(slot.dataset.img, ""); queueSave(); rerender(); return; }
      const slot = t.closest("[data-img]");
      if (slot && !t.closest("button") && t.tagName !== "INPUT") { $("input[type=file]", slot).click(); return; }
      if (t.closest("[data-copy-prompt]")) {
        const txt = $(".rp-prompt p", main).textContent;
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { t.textContent = "Kopierat!"; setTimeout(() => (t.textContent = "Kopiera prompten"), 1500); });
        return;
      }
      const act = t.closest("[data-act]");
      if (!act) return;
      const a = act.dataset.act;
      if (a === "pdf") { const dlg = $("#rpPreview"); if (dlg.open) dlg.close(); openPrint(); }
      if (a === "preview" || a === "example") {
        const dlg = $("#rpPreview"), ex = a === "example";
        $(".rp-preview-page", dlg).innerHTML = printHtml(ex ? window.EXEMPEL : null);
        $(".rp-preview-title", dlg).textContent = ex ? "Exempelrapport" : "Förhandsgranskning";
        $('[data-act="pdf"]', dlg).hidden = ex;
        dlg.showModal(); dlg.scrollTop = 0;
      }
      if (a === "close") $("#rpPreview").close();
      if (a === "clear") {
        if (!window.confirm("Vill du tömma hela rapporten? Text och bilder raderas och kan inte återställas.")) return;
        data = EMPTY(); queueSave(); rerender();
      }
    });
    // Inklistring: se SPÄRREN nedan. Bilder får klistras in i bildrutorna.
    main.addEventListener("paste", (e) => {
      const slot = document.activeElement && document.activeElement.closest && document.activeElement.closest("[data-img]");
      const items = Array.from((e.clipboardData && e.clipboardData.items) || []);
      const imgItem = items.find((i) => i.type.startsWith("image/"));
      if (slot) {
        e.preventDefault();
        if (imgItem) setImage(slot, imgItem.getAsFile());
        return;
      }
      if (!isTextField(e.target)) return;
      const txt = e.clipboardData ? e.clipboardData.getData("text/plain") : "";
      if (imgItem && !txt) { e.preventDefault(); blocked("Bilder klistrar du in i bildrutorna."); return; }
      if (!isInternal(txt)) { e.preventDefault(); blocked(); }
    });
    main.addEventListener("keydown", (e) => {
      const slot = e.target.closest && e.target.closest("[data-img]");
      if (slot && e.target === slot && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); $("input[type=file]", slot).click(); }
    });
    // Släpp en bild på en bildruta. Text som dras in utifrån stoppas.
    main.addEventListener("dragover", (e) => { if (e.target.closest("[data-img]")) e.preventDefault(); });
    main.addEventListener("drop", (e) => {
      const slot = e.target.closest("[data-img]");
      if (slot) {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) setImage(slot, f);
        return;
      }
      if (!isTextField(e.target)) return;
      const txt = e.dataTransfer.getData("text/plain");
      if (e.dataTransfer.files.length || !isInternal(txt)) { e.preventDefault(); blocked(); }
    });
    // Sista skyddet: inklistring som inte går via ett vanligt paste-event (t.ex. vissa menyer)
    main.addEventListener("beforeinput", (e) => {
      if (!isTextField(e.target)) return;
      if (e.inputType === "insertFromPaste" || e.inputType === "insertFromDrop" || e.inputType === "insertFromPasteAsQuotation") {
        // Godkänd inklistring passerar alltid paste- eller drop-händelsen först
        if (pasteOk) { pasteOk = false; return; }
        e.preventDefault(); blocked();
      }
    });
  }

  window.RAPPORT = { render, ratio, lum, fmtRatio, passes };
})();

