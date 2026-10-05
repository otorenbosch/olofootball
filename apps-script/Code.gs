// OLO Football — ontvangt aanvragen van aanmelden.html, mailt ze naar Olav en bewaart ze in dit Google Sheet.
// Zie README.md voor de installatie.

const ONTVANGER = "infoolavoosterhuis@gmail.com"; // hier komen de aanvragen binnen
const MAX_LENGTE = 30000;                          // bescherming tegen te grote berichten

const KOPPEN = ["Ontvangen", "Status", "Training", "Prijs p.p.", "Locatie", "Datum", "Speler", "Geboortedatum", "Club", "Team",
  "Positie", "Voet", "Verbeterpunten", "Hoofddoelen", "Medisch", "Gefilmd", "Ouder", "Telefoon", "E-mail", "Bel eerst",
  "Gevonden via", "Verwachting", "Dag", "Tijd", "Bevestiging verstuurd"];
const TEKSTKOLOMMEN = ["Geboortedatum", "Telefoon", "Prijs p.p.", "Dag", "Tijd"]; // als tekst bewaren, zodat 0612… en datums niet worden omgezet

// Het formulier vraagt hiermee op welke tijden al zijn bevestigd, zodat die niet meer te kiezen zijn.
// Alleen datum en tijd worden teruggegeven, geen persoonsgegevens.
function doGet() {
  const bezet = {};
  try {
    const blad = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const rijen = blad.getLastRow() > 1 ? blad.getRange(2, 1, blad.getLastRow() - 1, KOPPEN.length).getValues() : [];
    const iStatus = KOPPEN.indexOf("Status"), iDag = KOPPEN.indexOf("Dag"), iTijd = KOPPEN.indexOf("Tijd");
    rijen.forEach(function (r) {
      if (String(r[iStatus]).trim() !== "Bevestigd") return;
      const dag = celTekst(r[iDag], "yyyy-MM-dd"), tijd = celTekst(r[iTijd], "HH:mm");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dag) || !/^\d{2}:\d{2}$/.test(tijd)) return;
      (bezet[dag] = bezet[dag] || []).push(tijd);
    });
  } catch (err) {}
  return ContentService.createTextOutput(JSON.stringify({ bezet: bezet, extra: extraDagen() })).setMimeType(ContentService.MimeType.JSON);
}

// Extra trainingsdagen (bijv. in de vakantie) die Olav in het tabblad "Extra dagen" zet: kolommen Datum, Van, Tot.
// Het tabblad wordt automatisch aangemaakt als het er nog niet is.
function extraDagen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let blad = ss.getSheetByName("Extra dagen");
  if (!blad) {
    blad = ss.insertSheet("Extra dagen");
    blad.getRange("A:C").setNumberFormat("@"); // als tekst, zodat 9:00 en datums niet worden omgezet
    blad.getRange(1, 1, 1, 3).setValues([["Datum", "Van", "Tot"]]).setFontWeight("bold");
    blad.getRange("E1").setValue("Zet hier extra trainingsdagen, één per regel. Voorbeeld: 2026-10-20 | 09:00 | 17:00");
    blad.getRange("E2").setValue("Datum als jjjj-mm-dd (of 20-10-2026), tijden als uu:mm. Van = eerste starttijd, Tot = einde van de laatste training.");
    blad.getRange("E3").setValue("Verwijder een regel om de dag weer te laten vervallen. Oude datums worden vanzelf genegeerd.");
    blad.setColumnWidths(1, 3, 110);
  }
  const uit = [];
  if (blad.getLastRow() < 2) return uit;
  blad.getRange(2, 1, blad.getLastRow() - 1, 3).getDisplayValues().forEach(function (r) {
    const m = String(r[0]).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$|^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    const van = String(r[1]).trim().match(/^(\d{1,2}):(\d{2})/), tot = String(r[2]).trim().match(/^(\d{1,2}):(\d{2})/);
    if (!m || !van || !tot) return;
    const j = m[1] || m[6], mnd = m[2] || m[5], dag = m[3] || m[4];
    const p2 = function (x) { return ("0" + x).slice(-2); };
    uit.push({ datum: j + "-" + p2(mnd) + "-" + p2(dag), van: p2(van[1]) + ":" + van[2], tot: p2(tot[1]) + ":" + tot[2] });
  });
  return uit;
}

// Sheets maakt van "12:45" of "2026-10-09" soms toch een datum; zet dat terug naar tekst
function celTekst(v, formaat) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), formaat);
  return String(v).trim();
}

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
  else if (blad.getLastColumn() < KOPPEN.length) { // bestaand Sheet: ontbrekende kolomkoppen aanvullen
    blad.getRange(1, 1, 1, KOPPEN.length).setValues([KOPPEN]).setFontWeight("bold").setBackground("#0F2436").setFontColor("#FFFFFF");
  }
  const nu = new Date();
  (d.spelers || []).forEach(function (s) {
    const rij = [nu, "Nieuw", d.training, d.prijs, d.locatie, d.datum, s.naam, s.geboortedatum, s.club, s.team,
      s.positie, s.voet, s.verbeterpunten, s.hoofddoelen, s.medisch, s.gefilmd, s.ouder, s.telefoon, s.email, d.bel,
      d.gevonden, d.verwachting, d.dag, d.tijd].map(function (v) { return v === undefined || v === null ? "" : v; });
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

// ---- Bevestigingsmail naar de aanvrager ----
// Eenmalig uitvoeren (zie README): maakt de kolomkop en de trigger aan.
function activeerBevestigingsmail() {
  const blad = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  blad.getRange(1, KOPPEN.length).setValue("Bevestiging verstuurd").setFontWeight("bold").setBackground("#0F2436").setFontColor("#FFFFFF");
  const bestaat = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === "bijBewerking"; });
  if (!bestaat) ScriptApp.newTrigger("bijBewerking").forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
}

// Draait bij elke wijziging in het Sheet; doet alleen iets als Status op "Bevestigd" wordt gezet
function bijBewerking(e) {
  try {
    const cel = e && e.range;
    const blad = cel && cel.getSheet();
    if (!cel || blad.getIndex() !== 1 || cel.getRow() < 2 || cel.getNumRows() !== 1 || cel.getNumColumns() !== 1) return;
    if (cel.getColumn() !== KOPPEN.indexOf("Status") + 1 || String(cel.getValue()).trim() !== "Bevestigd") return;
    const rij = cel.getRow();
    const v = blad.getRange(rij, 1, 1, KOPPEN.length).getValues()[0];
    const kol = function (k) { return v[KOPPEN.indexOf(k)]; };
    const verstuurdCel = blad.getRange(rij, KOPPEN.indexOf("Bevestiging verstuurd") + 1);
    if (String(kol("Bevestiging verstuurd")).trim()) return; // is al eerder verstuurd
    const mail = String(kol("E-mail")).trim();
    if (!/^\S+@\S+\.\S+$/.test(mail)) { verstuurdCel.setValue("Geen e-mailadres"); return; }

    // Meerdere spelers van één aanvraag delen vaak hetzelfde adres: dan maar één mail
    const alle = blad.getRange(2, 1, blad.getLastRow() - 1, KOPPEN.length).getValues();
    const dubbel = alle.some(function (r, i) {
      return i + 2 !== rij && String(r[KOPPEN.indexOf("E-mail")]).trim().toLowerCase() === mail.toLowerCase() &&
        r[KOPPEN.indexOf("Datum")] === kol("Datum") && String(r[KOPPEN.indexOf("Bevestiging verstuurd")]).indexOf("Verstuurd") === 0;
    });
    if (dubbel) { verstuurdCel.setValue("Verstuurd (met andere speler)"); return; }

    const tekst = "Hallo " + (String(kol("Ouder")).trim() || "") + ",\n\n" +
      "Leuk dat je je hebt aangemeld! Hierbij bevestig ik de training voor " + kol("Speler") + ":\n\n" +
      "Training: " + kol("Training") + "\n" +
      "Datum en tijd: " + kol("Datum") + "\n" +
      "Locatie: " + kol("Locatie") + "\n" +
      "Prijs: " + (typeof kol("Prijs p.p.") === "number" ? "€" + kol("Prijs p.p.") : kol("Prijs p.p.")) + "\n\n" +
      "Betalen: je ontvangt van mij nog een Tikkie.\n\n" +
      "Annuleren: dat kan tot 24 uur van tevoren, met geld-terug-garantie. Daarna kan er niet meer geannuleerd worden. " +
      "Laat het mij dan zo snel mogelijk weten door op deze mail te antwoorden.\n\n" +
      "Heb je vragen? Antwoord gerust op deze mail.\n\n" +
      "Tot dan!\n\nSportieve groet,\nOlav\nOLO Football\nhttps://olofootball.nl";
    MailApp.sendEmail(mail, "Bevestiging training OLO Football – " + kol("Datum"), tekst, { name: "OLO Football" });
    verstuurdCel.setValue("Verstuurd " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm"));
  } catch (err) {
    try { e.range.getSheet().getRange(e.range.getRow(), KOPPEN.length).setValue("Mislukt: " + err.message); } catch (x) {}
  }
}
