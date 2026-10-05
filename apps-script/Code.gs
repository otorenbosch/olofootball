// OLO Football — ontvangt aanvragen van aanmelden.html, mailt ze naar Olav en bewaart ze in dit Google Sheet.
// Zie README.md voor de installatie.

const ONTVANGER = "infoolavoosterhuis@gmail.com"; // hier komen de aanvragen binnen
const MAX_LENGTE = 30000;                          // bescherming tegen te grote berichten

const KOPPEN = ["Ontvangen", "Status", "Training", "Prijs p.p.", "Locatie", "Datum", "Speler", "Geboortedatum", "Club", "Team",
  "Positie", "Voet", "Verbeterpunten", "Hoofddoelen", "Medisch", "Gefilmd", "Ouder", "Telefoon", "E-mail", "Bel eerst",
  "Gevonden via", "Verwachting", "Dag", "Tijd", "Bevestiging verstuurd", "Uitvalmail verstuurd"];
const STATUSSEN = ["Nieuw", "Gebeld", "Bevestigd", "Afgerond", "Geannuleerd", "Uitgevallen"];
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
  return ContentService.createTextOutput(JSON.stringify({ bezet: bezet, extra: extraDagen(), vrij: vrijeDagen() })).setMimeType(ContentService.MimeType.JSON);
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

// Dagen waarop Olav niet traint, in het tabblad "Vrije dagen": kolom Datum (kolom Reden is voor jezelf).
// Het tabblad wordt automatisch aangemaakt als het er nog niet is.
function vrijeDagen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let blad = ss.getSheetByName("Vrije dagen");
  if (!blad) {
    blad = ss.insertSheet("Vrije dagen");
    blad.getRange("A:B").setNumberFormat("@"); // als tekst, zodat datums niet worden omgezet
    blad.getRange(1, 1, 1, 2).setValues([["Datum", "Reden (optioneel)"]]).setFontWeight("bold");
    blad.getRange("D1").setValue("Zet hier dagen waarop er niet getraind wordt, één per regel. Voorbeeld: 2026-12-25 | Kerst");
    blad.getRange("D2").setValue("Datum als jjjj-mm-dd (of 25-12-2026). De dag verdwijnt dan uit het aanmeldformulier. Verwijder de regel om de dag weer open te zetten.");
    blad.setColumnWidths(1, 2, 140);
  }
  const uit = [];
  if (blad.getLastRow() < 2) return uit;
  blad.getRange(2, 1, blad.getLastRow() - 1, 1).getDisplayValues().forEach(function (r) {
    const m = String(r[0]).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$|^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (!m) return;
    const p2 = function (x) { return ("0" + x).slice(-2); };
    uit.push((m[1] || m[6]) + "-" + p2(m[2] || m[5]) + "-" + p2(m[3] || m[4]));
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
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSSEN, true).build());
}

function antwoord(status) {
  return ContentService.createTextOutput(status).setMimeType(ContentService.MimeType.TEXT);
}

// ---- Mails naar de aanvrager en waarschuwing bij vrije dagen ----
// Eenmalig uitvoeren (zie README): maakt de kolomkoppen, de statuslijst en de trigger aan. Opnieuw uitvoeren kan geen kwaad.
function activeerBevestigingsmail() {
  const blad = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  blad.getRange(1, 1, 1, KOPPEN.length).setValues([KOPPEN]).setFontWeight("bold").setBackground("#0F2436").setFontColor("#FFFFFF");
  blad.getRange(2, 2, blad.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSSEN, true).build());
  const bestaat = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === "bijBewerking"; });
  if (!bestaat) ScriptApp.newTrigger("bijBewerking").forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
}

// Draait bij elke wijziging in het Sheet
function bijBewerking(e) {
  try {
    const cel = e && e.range;
    if (!cel || cel.getNumRows() !== 1 || cel.getNumColumns() !== 1 || cel.getRow() < 2) return;
    const blad = cel.getSheet();
    if (blad.getName() === "Vrije dagen" && cel.getColumn() === 1) return waarschuwVrijeDag(e, cel);
    if (blad.getIndex() !== 1 || cel.getColumn() !== KOPPEN.indexOf("Status") + 1) return;
    const status = String(cel.getValue()).trim();
    blad.getRange(cel.getRow(), 1, 1, KOPPEN.length).setBackground(null); // een eventuele rode waarschuwing is dan afgehandeld
    if (status === "Bevestigd") stuurMail(blad, cel.getRow(), "Bevestiging verstuurd", bevestigingsTekst);
    if (status === "Uitgevallen") stuurMail(blad, cel.getRow(), "Uitvalmail verstuurd", uitvalTekst);
  } catch (err) {
    try { e.source.toast("Er ging iets mis: " + err.message, "OLO Football", 10); } catch (x) {}
  }
}

// Een dag in "Vrije dagen" gezet: toon hoeveel openstaande aanvragen er op die dag staan en kleur ze rood
function waarschuwVrijeDag(e, cel) {
  const dag = normDatum(cel.getDisplayValue());
  if (!dag) return;
  const blad = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (blad.getLastRow() < 2) return;
  const rijen = blad.getRange(2, 1, blad.getLastRow() - 1, KOPPEN.length).getValues();
  let aantal = 0, bevestigd = 0;
  rijen.forEach(function (r, i) {
    if (celTekst(r[KOPPEN.indexOf("Dag")], "yyyy-MM-dd") !== dag) return;
    const st = String(r[KOPPEN.indexOf("Status")]).trim();
    if (["Nieuw", "Gebeld", "Bevestigd"].indexOf(st) < 0) return;
    aantal++;
    if (st === "Bevestigd") bevestigd++;
    blad.getRange(i + 2, 1, 1, KOPPEN.length).setBackground("#FFC7CE");
  });
  e.source.toast(aantal
    ? "Let op: er staan " + aantal + " aanvra" + (aantal === 1 ? "ag" : "gen") + " op deze dag (" + bevestigd + " bevestigd). Ze zijn rood gemarkeerd in het hoofdtabblad. Zet de status op Uitgevallen om de ouder te mailen."
    : "Er staan geen aanvragen op deze dag.", "Vrije dag", 15);
}

// "2026-12-25" of "25-12-2026" -> "2026-12-25"
function normDatum(t) {
  const m = String(t).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$|^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (!m) return "";
  const p2 = function (x) { return ("0" + x).slice(-2); };
  return (m[1] || m[6]) + "-" + p2(m[2] || m[5]) + "-" + p2(m[3] || m[4]);
}

// Stuurt één mail per regel naar de ouder en noteert het resultaat in de gegeven kolom
function stuurMail(blad, rij, kolomNaam, maakTekst) {
  const v = blad.getRange(rij, 1, 1, KOPPEN.length).getValues()[0];
  const kol = function (k) { return v[KOPPEN.indexOf(k)]; };
  const verstuurdCel = blad.getRange(rij, KOPPEN.indexOf(kolomNaam) + 1);
  try {
    if (String(kol(kolomNaam)).trim()) return; // is al eerder verstuurd
    const mail = String(kol("E-mail")).trim();
    if (!/^\S+@\S+\.\S+$/.test(mail)) { verstuurdCel.setValue("Geen e-mailadres"); return; }

    // Meerdere spelers van één aanvraag delen vaak hetzelfde adres: dan maar één mail
    const alle = blad.getRange(2, 1, blad.getLastRow() - 1, KOPPEN.length).getValues();
    const dubbel = alle.some(function (r, i) {
      return i + 2 !== rij && String(r[KOPPEN.indexOf("E-mail")]).trim().toLowerCase() === mail.toLowerCase() &&
        r[KOPPEN.indexOf("Datum")] === kol("Datum") && String(r[KOPPEN.indexOf(kolomNaam)]).indexOf("Verstuurd") === 0;
    });
    if (dubbel) { verstuurdCel.setValue("Verstuurd (met andere speler)"); return; }

    const onderwerp = maakTekst.onderwerp + " – " + kol("Datum");
    MailApp.sendEmail(mail, onderwerp, maakTekst(kol), { name: "OLO Football" });
    verstuurdCel.setValue("Verstuurd " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm"));
  } catch (err) {
    verstuurdCel.setValue("Mislukt: " + err.message);
  }
}

function bevestigingsTekst(kol) {
  return "Hallo " + (String(kol("Ouder")).trim() || "") + ",\n\n" +
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
}
bevestigingsTekst.onderwerp = "Bevestiging training OLO Football";

function uitvalTekst(kol) {
  return "Hallo " + (String(kol("Ouder")).trim() || "") + ",\n\n" +
    "Helaas moet ik de training voor " + kol("Speler") + " op " + kol("Datum") + " (" + kol("Locatie") + ") laten vervallen. " +
    "Dat vind ik erg jammer en ik bied daarvoor mijn excuses aan.\n\n" +
    "Je kunt via https://olofootball.nl/aanmelden.html direct een nieuwe datum en tijd kiezen, of antwoord op deze mail, dan zoeken we samen een moment. " +
    "Heb je al betaald, dan krijg je het bedrag natuurlijk terug.\n\n" +
    "Alvast bedankt voor je begrip.\n\nSportieve groet,\nOlav\nOLO Football\nhttps://olofootball.nl";
}
uitvalTekst.onderwerp = "Training vervalt";
