# Aanmeldformulier koppelen aan e-mail (Google Apps Script)

Doel: als iemand `aanmelden.html` invult, ontvangt Olav de aanvraag per e-mail en komt er een regel in een Google Sheet.
Dit moet **één keer** gedaan worden, ingelogd als `infoolavoosterhuis@gmail.com` (zo blijven de gegevens bij Olav).

1. Ga naar https://sheets.google.com en maak een nieuwe lege spreadsheet, bijvoorbeeld "OLO Football aanvragen".
2. Kies **Extensies → Apps Script**.
3. Verwijder de voorbeeldcode en plak de inhoud van `Code.gs` (in deze map). Klik op **Opslaan**.
4. Klik rechtsboven op **Implementeren → Nieuwe implementatie**.
   - Type (tandwiel): **Web-app**
   - Uitvoeren als: **Ik** (infoolavoosterhuis@gmail.com)
   - Wie heeft toegang: **Iedereen**
5. Klik op **Implementeren** en geef toestemming. Google meldt dat de app niet gecontroleerd is: kies **Geavanceerd → Ga naar … (onveilig)**. Dat is normaal voor een eigen script.
6. Kopieer de **Web-app-URL** (begint met `https://script.google.com/macros/s/…/exec`).
7. Open `aanmelden.html`, zoek `endpoint:""` in het blok `CFG` en zet de URL ertussen. Commit en push naar GitHub.
8. Test: vul het formulier in met je eigen gegevens. Je moet binnen een minuut een mail krijgen en een nieuwe regel in het Sheet zien.

## Als je later iets aanpast in Code.gs
Kies **Implementeren → Implementaties beheren → bewerken (potlood) → Versie: Nieuwe versie → Implementeren**. De URL blijft gelijk.

## Ontvanger wijzigen
Pas `ONTVANGER` bovenin `Code.gs` aan (bijvoorbeeld naar `info@olofootball.nl` zodra dat adres bestaat) en maak een nieuwe versie, zie hierboven.

## Limieten
Een gratis Google-account mag ongeveer 100 mails per dag versturen via een script. Dat is ruim genoeg voor aanvragen.

## Tijden blokkeren na bevestiging
Zet in het Sheet de **Status** van een aanvraag op **Bevestigd**. Die datum en tijd zijn dan niet meer te kiezen op `aanmelden.html` (binnen een paar seconden na het laden van de pagina). Zet je de status terug (bijvoorbeeld naar Geannuleerd), dan komt de tijd weer vrij.
- Dit werkt voor aanvragen die zijn binnengekomen nadat `Code.gs` is bijgewerkt, want pas dan worden de kolommen **Dag** en **Tijd** gevuld. Bij oudere regels kun je die twee kolommen met de hand invullen (dag als `2026-10-09`, tijd als `12:45`).
- Na het bijwerken van `Code.gs` moet je een nieuwe versie implementeren, zie hierboven.

## Bevestigingsmail naar de aanvrager
Zodra de Status van een regel op **Bevestigd** wordt gezet, krijgt de ouder een bevestigingsmail (met datum, tijd, locatie, annuleringsvoorwaarden en de melding dat er een Tikkie volgt). Antwoorden komen bij Olav terecht.
- Eenmalig: plak de nieuwe `Code.gs`, kies in Apps Script bovenin de functie **activeerBevestigingsmail** en klik op **Uitvoeren**. Geef toestemming (dit is nodig om mail te mogen sturen en het Sheet te volgen). Implementeer daarna een nieuwe versie van de web-app.
- Het resultaat staat in de laatste kolom, **Bevestiging verstuurd**: een datum, "Geen e-mailadres" (bel of app dan zelf) of "Mislukt: …".
- Er wordt maar één mail per regel verstuurd, ook als de status later wisselt. Wil je opnieuw laten versturen, maak dan die cel leeg en zet de status opnieuw op Bevestigd.

## Extra trainingsdagen (bijv. vakantie)
In het Sheet staat een tabblad **Extra dagen** (wordt vanzelf aangemaakt zodra de nieuwe code is geïmplementeerd en het formulier één keer is geopend). Zet daar per regel: **Datum** (`2026-10-20` of `20-10-2026`), **Van** (eerste starttijd, bijv. `09:00`) en **Tot** (einde van de laatste training, bijv. `17:00`). De dag verschijnt dan binnen een paar seconden in het formulier, met elk uur een starttijd. Regel verwijderen = dag vervalt weer. Staat de datum al in het gewone rooster, dan gelden de tijden uit dit tabblad.

## Dag laten vervallen
Zet in het tabblad **Vrije dagen** (wordt vanzelf aangemaakt) de **Datum** van de dag waarop niet getraind wordt, bijvoorbeeld `2026-12-25`. Die dag verdwijnt dan uit het aanmeldformulier. De kolom Reden is alleen voor jezelf. Regel verwijderen = dag is weer beschikbaar. Staat een dag zowel in Vrije dagen als in Extra dagen, dan wint Vrije dagen.
Zet je een dag in dit tabblad, dan verschijnt er een melding met het aantal aanvragen (Nieuw, Gebeld of Bevestigd) op die dag, en die regels kleuren rood in het hoofdtabblad.
Dit verbergt de dag alleen voor nieuwe aanvragen. Bestaande aanvragen handel je af met de status **Uitgevallen** (zie hieronder).

## Training laten vervallen (status Uitgevallen)
Zet de Status van een regel op **Uitgevallen**: de ouder krijgt een excuusmail met een link naar het formulier om een nieuwe datum te kiezen, en de tijd komt weer vrij. De rode kleur verdwijnt zodra je de status wijzigt. De mail wordt maar één keer verstuurd per regel; het resultaat staat in de kolom **Uitvalmail verstuurd**.
Na het bijwerken van `Code.gs`: voer **activeerBevestigingsmail** nog één keer uit (voegt de nieuwe kolom en de status Uitgevallen toe aan de keuzelijst) en implementeer een nieuwe versie.
