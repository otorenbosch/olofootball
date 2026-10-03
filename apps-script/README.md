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
