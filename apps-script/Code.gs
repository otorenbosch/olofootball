// OLO Football — ontvangt aanvragen van aanmelden.html, mailt ze naar Olav en bewaart ze in dit Google Sheet.
// Zie README.md voor de installatie.

const ONTVANGER = "infoolavoosterhuis@gmail.com"; // hier komen de aanvragen binnen
const MAX_LENGTE = 30000;                          // bescherming tegen te grote berichten

const KOPPEN = ["Ontvangen", "Status", "Training", "Prijs p.p.", "Locatie", "Datum", "Speler", "Geboortedatum", "Club", "Team",
  "Positie", "Voet", "Verbeterpunten", "Hoofddoelen", "Medisch", "Gefilmd", "Ouder", "Telefoon", "E-mail", "Bel eerst",
  "Gevonden via", "Verwachting"];
const TEKSTKOLOMMEN = ["Geboortedatum", "Telefoon"]; // als tekst bewaren, zodat 0612… en datums niet worden omgezet

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || "";
    if (!raw || raw.length > MAX_LENGTE) return antwoord("fout");
    const d = JSON.parse(raw);
    if (!d.text || !d.subject) return antwoord("fout");

    bewaar(d);

    // Mailen naar Olav; antwoorden gaat naar de ouder
    const opties = { name: "OLO Football website" };
    if (d.replyTo && /^\S+@\S+\.\S+$/.test(d.replyTo)) opties.replyTo = d.replyTo;
    MailApp.sendEmail(ONTVANGER, String(d.subject).slice(0, 200), String(d.text), opties);

    return antwoord("ok");
  } catch (err) {
    return antwoord("fout");
  }
}

// Eén regel per speler in het Sheet (reservekopie en overzicht)
function bewaar(d) {
  const blad = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (blad.getLastRow() === 0) maakKoppen(blad);
  const nu = new Date();
  (d.spelers || []).forEach(function (s) {
    const rij = [nu, "Nieuw", d.training, d.prijs, d.locatie, d.datum, s.naam, s.geboortedatum, s.club, s.team,
      s.positie, s.voet, s.verbeterpunten, s.hoofddoelen, s.medisch, s.gefilmd, s.ouder, s.telefoon, s.email, d.bel,
      d.gevonden, d.verwachting].map(function (v) { return v === undefined || v === null ? "" : v; });
    const nr = blad.getLastRow() + 1;
    TEKSTKOLOMMEN.forEach(function (k) { blad.getRange(nr, KOPPEN.indexOf(k) + 1).setNumberFormat("@"); });
    blad.getRange(nr, 1, 1, rij.length).setValues([rij]);
    blad.getRange(nr, 1).setNumberFormat("dd-MM-yyyy HH:mm");
  });
}

function maakKoppen(blad) {
  blad.getRange(1, 1, 1, KOPPEN.length).setValues([KOPPEN]).setFontWeight("bold").setBackground("#0F2436").setFontColor("#FFFFFF");
  blad.setFrozenRows(1);
  blad.setFrozenColumns(7); // datum en speler blijven in beeld bij scrollen
  blad.getRange(1, 1, blad.getMaxRows(), KOPPEN.length).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP).setVerticalAlignment("top");
  blad.setColumnWidth(1, 120);
  blad.setColumnWidths(3, 4, 120);
  blad.setColumnWidth(7, 160);
  blad.setColumnWidths(13, 3, 220);
  blad.setColumnWidths(17, 3, 160);
  blad.setColumnWidths(21, 2, 220);
  blad.getRange(2, 2, blad.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(["Nieuw", "Gebeld", "Bevestigd", "Afgerond", "Geannuleerd"], true).build());
}

function antwoord(status) {
  return ContentService.createTextOutput(status).setMimeType(ContentService.MimeType.TEXT);
}
