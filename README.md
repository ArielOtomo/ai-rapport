# Från brief till kod: AI-rapport

En webbsida där ni i UX25 skriver en rapport om hur ett AI-verktyg byggde eran todoapp, och sparar den som PDF för inlämning.

Rapporten följer en kedja bakåt: **briefen** som beskrev appen, **designen** i Figma och **koden** som ett AI-verktyg skrev. Ni visar var information försvann på vägen, mäter appens hållbarhet och tillgänglighet, tar ställning till säkerhet och rättigheter, och formulerar en egen strategi för när AI ska användas och när designern tar över.

## Rapportens delar

| Del | Innehåll |
|---|---|
| 1. Kedjan och vad som blev fel | Skärmdumpar av brief, design och app sida vid sida. Minst tre fel, förklarade med begrepp som hallucination och kontextfönster. |
| 2. Briefens brister | Varje brist följs genom kedjan: vad den ledde till i designen och i koden, och vad briefen hade behövt säga. |
| 3. Hållbarhet och tillgänglighet | Fyra kontroller: bilder, beroenden, kontrast och en AI-granskning mot WCAG 2.2 AA. Avslutas med tre brister som studenten har kontrollerat själv och föreslår åtgärder för. |
| 4. Säkerhet och rättigheter | Vad som delades med AI-verktyget, vem som äger resultatet och om något behöver märkas som AI-genererat. |
| 5. Strategi | En omskriven brief, en bild av den egna processen och en motivering. |
| Källor | Färdiga källor att bocka i, och egna källor. |

## Funktioner

- **Skriv direkt i sidan.** Färdiga fält och tabeller för varje del, så att studenten vet vad som ska med.
- **Skärmdumpar.** Välj en fil, dra in en bild eller klistra in en skärmdump direkt i en bildruta. Bilderna förminskas automatiskt.
- **Kontrastmätare.** Räknar ut kontrasten mellan två färger och visar om den klarar WCAG AA.
- **Sidräknare.** Visar ungefär hur många A4-sidor rapporten blir. Målet är 4–6 sidor.
- **Spara som PDF.** Öppnar webbläsarens utskriftsruta med en färdig rapportlayout. Välj *Spara som PDF*. Tomma fält kommer inte med.
- **Exempelrapport.** Knappen *Visa exempelrapport* visar en färdig rapport med kommentarer om vad som gör svaren bra. Den finns också som PDF i `exempel/exempelrapport.pdf`.
- **Ljust och mörkt läge.**

## Skriv med egna ord

Sidan stoppar text som klistras in utifrån – till exempel från en AI-chatt, ett dokument eller en webbsida. Det gäller kortkommandon, högerklicksmenyn och dra-och-släpp.

Det här går bra att klistra in:

- text som redan finns i rapporten, så att man kan flytta text mellan rutorna
- korta saker på en rad, högst 40 tecken – till exempel en färgkod, ett filnamn eller ett modellnamn
- länkar till källor
- skärmdumpar, i bildrutorna

Spärren är ett stöd, inte ett säkert prov. Den hindrar inte att någon skriver av en text för hand.

## Integritet

Allt studenten skriver, även bilderna, sparas bara i webbläsaren på den egna datorn (IndexedDB). Inget skickas till någon server, och sidan har ingen inloggning.

Det betyder också att rapporten bara finns i den webbläsaren. Byter man dator, använder privat läge eller rensar webbläsardata försvinner den. Spara en PDF i slutet av varje arbetspass som säkerhetskopia.


## Om exempelrapporten

Koden i exemplet kommer från en riktig app, en mindmap-app byggd med Claude Code. Briefen, designen och processen i exemplet är påhittade för att visa hur en rapport kan se ut.

## Webbläsare

Fungerar i aktuella versioner av Chrome, Edge, Firefox och Safari. Sidräknaren är en uppskattning – exakt hur sidorna bryts kan skilja lite mellan webbläsare.
