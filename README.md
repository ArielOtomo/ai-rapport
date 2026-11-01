# Programmering – AI-vecka: Rapporten

Rapportmodulen för AI-veckan som en egen sida. Studenten skriver rapporten *Från brief till kod: AI-rapport* direkt i sidan och sparar den som PDF.

## Lägg upp med GitHub Pages

1. Skapa ett public repo, t.ex. `programmering-ai-vecka-rapport`, och lägg upp innehållet i den här mappen.
2. **Settings → Pages → Deploy from a branch**, branch `main`, mapp `/ (root)`.
3. Sidan hamnar på `https://<användarnamn>.github.io/programmering-ai-vecka-rapport/`.

## Spärren mot inklistring

- Text som kommer **utifrån** – från en AI-chatt, ett dokument eller en webbsida – går inte att klistra in eller dra in.
- Text som redan finns **i rapporten** får kopieras och klistras in, mellan rutorna eller inom samma ruta.
- **Korta saker** utifrån får klistras in: en rad på högst 40 tecken (t.ex. en färgkod från Figma, ett filnamn eller ett modellnamn) och länkar till källor. Gränsen ändras med `KORT_RAD` i `js/rapport.js`.
- **Skärmdumpar** får klistras in i bildrutorna.
- Spärren gäller kortkommandon, högerklicksmenyn och dra-och-släpp.

Spärren är ett stöd, inte ett säkert prov. Den hindrar inte att någon skriver av text för hand, och webbläsartillägg kan i sällsynta fall ändra textrutor direkt. Antalet stoppade försök sparas i rapportens data men visas inte i PDF:en.

## Övrigt

- Allt sparas automatiskt i webbläsaren (IndexedDB), även bilderna – bara på den datorn och i den webbläsaren. Be studenterna spara en PDF i slutet av varje arbetspass.
- **Visa exempelrapport** visar en färdig rapport med kommentarer. Samma rapport finns som `exempel/exempelrapport.pdf`.
- Källorna från måndagen ligger i `js/kallor.js`.

## Filer

```
├── index.html
├── css/style.css
├── images/brand-mark.svg
├── exempel/exempelrapport.pdf
└── js/
    ├── kallor.js    ← måndagens källor
    ├── exempel.js   ← exempelrapporten
    ├── rapport.js   ← rapporten, PDF-utskriften och spärren
    └── main.js      ← startar sidan
```
