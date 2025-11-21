import { createClient } from '@supabase/supabase-js'
// Create a single supabase client for interacting with your database
const supabase = createClient
(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY, 
)

// Aktuellen User holen
const {data: userdata} = await supabase.auth.getUser();
const userId = userdata?.user?.id;


// ---------------------------- Stundenzettel Konfiguration ------------------------

const stundenzettelErstellenBtn = document.getElementById('stundenzettelErstellenButton');
const stundenzettelSpeichernBtn = document.getElementById('stundenzettelSpeichernButton');
const stundenzettelLoeschenBtn = document.getElementById('stundenzettelLoeschenButton');
const neueZeileBtn = document.getElementById('neueZeileButton');
const stundenzettelAuswahl = document.getElementById('stundenzettelAuswahl');
const zeilenForm = document.getElementById('zeilenForm');
const stundenzettelMaxZeilen = 7;
let aktuellerStundenzettelZeilenCount = 0;
let aktuellerStundenzettelid = null;
let aktuellerStundenlohn = 10;
let aktuellerZettelAbgegeben = false;

const zettelBildUpload = document.getElementById('zettelBildUpload');
const bildVorschau = document.getElementById('bildVorschau');
const zettelAbgebenBtn = document.getElementById('zettelAbgebenBtn');

// Custom Popup Elemente
const customPopup = document.getElementById('customPopup');
const popupTitle = document.getElementById('popupTitle');
const popupMessage = document.getElementById('popupMessage');
const popupCloseBtn = document.getElementById('popupCloseBtn');
const popupConfirmBtn = document.getElementById('popupConfirmBtn');
const popupCancelBtn = document.getElementById('popupCancelBtn');

let popupResolve = null;

// Popup Funktionen
function schliessePopup() {
    customPopup.style.display = 'none';
    if (popupResolve) {
        popupResolve(false);
        popupResolve = null;
    }
}

function customAlert(message, title = 'Hinweis', type = 'info') {
    return new Promise((resolve) => {
        popupTitle.textContent = title;
        popupMessage.textContent = message;
        
        // Title Styling basierend auf Typ
        popupTitle.className = '';
        if (type === 'error') popupTitle.classList.add('error');
        if (type === 'success') popupTitle.classList.add('success');
        if (type === 'warning') popupTitle.classList.add('warning');
        
        // Nur OK Button anzeigen
        popupCloseBtn.style.display = 'inline-block';
        popupConfirmBtn.style.display = 'none';
        popupCancelBtn.style.display = 'none';
        
        customPopup.style.display = 'flex';
        
        popupResolve = resolve;
    });
}

function customConfirm(message, title = 'Bestätigung') {
    return new Promise((resolve) => {
        popupTitle.textContent = title;
        popupMessage.textContent = message;
        popupTitle.className = 'warning';
        
        // Bestätigen und Abbrechen Buttons anzeigen
        popupCloseBtn.style.display = 'none';
        popupConfirmBtn.style.display = 'inline-block';
        popupCancelBtn.style.display = 'inline-block';
        
        customPopup.style.display = 'flex';
        
        popupResolve = resolve;
    });
}

function zeigeAbgegebenPopup() {
    customAlert('Dieser Zettel kann nicht mehr bearbeitet werden.', 'Zettel wurde abgegeben', 'error');
}

popupCloseBtn.addEventListener('click', () => {
    schliessePopup();
});

popupConfirmBtn.addEventListener('click', () => {
    customPopup.style.display = 'none';
    if (popupResolve) {
        popupResolve(true);
        popupResolve = null;
    }
});

popupCancelBtn.addEventListener('click', () => {
    schliessePopup();
});

customPopup.addEventListener('click', (e) => {
    if (e.target === customPopup) {
        schliessePopup();
    }
});

// ------------------------ Bild Upload ------------------------
async function ladeBildHoch(file) {
    if (!aktuellerStundenzettelid) {
        await customAlert('Bitte zuerst einen Stundenzettel erstellen oder auswählen', 'Fehler', 'error');
        return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${aktuellerStundenzettelid}_${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
        .from('stundenzettel-bilder')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Fehler beim Hochladen des Bildes:', error);
        await customAlert('Fehler beim Hochladen des Bildes', 'Fehler', 'error');
        return null;
    }

    // Öffentliche URL generieren
    const { data: urlData } = supabase.storage
        .from('stundenzettel-bilder')
        .getPublicUrl(fileName);

    const bildUrl = urlData.publicUrl;

    // URL in Datenbank speichern
    const { error: updateError } = await supabase
        .from('t_stundenzettel')
        .update({ bild_url: bildUrl })
        .eq('zettel_id', aktuellerStundenzettelid);

    if (updateError) {
        console.error('Fehler beim Speichern der Bild-URL:', updateError);
        return null;
    }

    return bildUrl;
}

function zeigeBildVorschau(url) {
    bildVorschau.innerHTML = `<img src="${url}" alt="Stundenzettel Foto">`;
}

// ------------------------ Zettel abgeben ------------------------
async function zettelAbgeben() {
    if (!aktuellerStundenzettelid) {
        await customAlert('Bitte zuerst einen Stundenzettel erstellen oder auswählen', 'Fehler', 'error');
        return;
    }

    if (aktuellerZettelAbgegeben) {
        return; // Bereits abgegeben
    }

    const bestaetigung = await customConfirm('Möchten Sie diesen Stundenzettel wirklich abgeben? Danach können keine Änderungen mehr vorgenommen werden.', 'Zettel abgeben?');
    if (!bestaetigung) return;

    const { error } = await supabase
        .from('t_stundenzettel')
        .update({ zettel_abgegeben: true })
        .eq('zettel_id', aktuellerStundenzettelid);

    if (error) {
        console.error('Fehler beim Abgeben des Zettels:', error);
        await customAlert('Fehler beim Abgeben des Zettels', 'Fehler', 'error');
        return;
    }

    aktuellerZettelAbgegeben = true;
    sperreFelderNachAbgabe();
}

function sperreFelderNachAbgabe() {
    // Button Text und Styling ändern
    zettelAbgebenBtn.textContent = 'Zettel wurde abgegeben';
    zettelAbgebenBtn.classList.add('abgegeben');
    zettelAbgebenBtn.disabled = true;

    // Nur Zeilen-Eingabefelder sperren (nicht Auszahlungs-Felder)
    const alleInputs = zeilenForm.querySelectorAll('input');
    alleInputs.forEach(input => input.disabled = true);

    // Buttons sperren
    neueZeileBtn.disabled = true;
    neueZeileBtn.style.display = 'none';
    stundenzettelSpeichernBtn.disabled = true;
    
    // Lösch-Buttons entfernen
    const loeschButtons = zeilenForm.querySelectorAll('.delete-button');
    loeschButtons.forEach(btn => btn.style.display = 'none');

    // Auszahlungs-Felder und Bild-Upload bleiben aktiv (nicht sperren)
}

function entsperreFelderNachLaden() {
    // Button Text und Styling zurücksetzen
    zettelAbgebenBtn.textContent = 'Zettel abgeben';
    zettelAbgebenBtn.classList.remove('abgegeben');
    zettelAbgebenBtn.disabled = false;

    // Alle Eingabefelder entsperren
    const alleInputs = zeilenForm.querySelectorAll('input');
    alleInputs.forEach(input => input.disabled = false);

    // Buttons entsperren
    neueZeileBtn.disabled = false;
    aktualisiereNeueZeileButton();
    stundenzettelSpeichernBtn.disabled = false;
    
    // Lösch-Buttons anzeigen
    const loeschButtons = zeilenForm.querySelectorAll('.delete-button');
    loeschButtons.forEach(btn => btn.style.display = 'inline-block');
}

function aktualisiereNeueZeileButton() {
    const alleZeilen = zeilenForm.querySelectorAll('.zeile');
    if (alleZeilen.length >= 7) {
        neueZeileBtn.style.display = 'none';
    } else {
        neueZeileBtn.style.display = 'inline-block';
    }
}

// ------------------------ Laden aller Stundenzettel ------------------------
async function ladeAlleStundenzettel() {
    const { data: alleZettel, error } = await supabase
    .from('t_stundenzettel')
    .select('zettel_id, stundenlohn')
    .eq('user_id', userId)
    .order('zettel_id', { ascending: false });
    
    if (error) {
        console.error('Fehler beim Laden der Stundenzettel:', error);
        return;
    }
    
    // Für jeden Stundenzettel die Zeilen laden um Datumsspanne zu ermitteln
    const zettelMitDaten = await Promise.all(alleZettel.map(async (zettel) => {
        const { data: zeilen } = await supabase
        .from('t_stundenzeilen')
        .select('date')
        .eq('zettel_id', zettel.zettel_id)
        .order('date', { ascending: true });
        
        let datumBereich = '';
        if (zeilen && zeilen.length > 0) {
            const vonDatum = new Date(zeilen[0].date).toLocaleDateString('de-DE');
            const bisDatum = new Date(zeilen[zeilen.length - 1].date).toLocaleDateString('de-DE');
            datumBereich = vonDatum === bisDatum ? vonDatum : `${vonDatum} - ${bisDatum}`;
        } else {
            datumBereich = 'Keine Einträge';
        }
        
        return { ...zettel, datumBereich };
    }));
    
    // Dropdown befüllen
    stundenzettelAuswahl.innerHTML = '<option value="">-- Stundenzettel wählen --</option>';
    zettelMitDaten.forEach(zettel => {
        const option = document.createElement('option');
        option.value = zettel.zettel_id;
        option.textContent = `Stundenzettel #${zettel.zettel_id} (${zettel.datumBereich})`;
        stundenzettelAuswahl.appendChild(option);
    });
    
    return alleZettel;
}

// Alle Stundenzettel laden
const alleStundenzettel = await ladeAlleStundenzettel();

// ------------------------ Laden des letzten Stundenzettels ------------------------
const { data: lastZettel, error: errorZettel } = await supabase
.from('t_stundenzettel')
.select('*')
.eq('user_id', userId)
.order('zettel_id', { ascending: false })
.limit(1)
.maybeSingle();

if (errorZettel && errorZettel.code !== 'PGRST116') {
    console.error('Fehler beim Laden des Stundenzettels:', errorZettel);
}

if (lastZettel) {
    aktuellerStundenzettelid = lastZettel.zettel_id;
    aktuellerStundenlohn = lastZettel.stundenlohn || 10;
    document.getElementById('stundenlohnInput').value = aktuellerStundenlohn;
    stundenzettelAuswahl.value = lastZettel.zettel_id;
    ladeStundenzettelAuszahlung(lastZettel);
} else {
    document.getElementById('stundenlohnInput').value = 10;
}

// Setup Auszahlungs-Event-Listener
setupStundenzettelAuszahlung();

// ------------------------- Laden der Zeilen ------------------------
let lastZeilen = [];

if (aktuellerStundenzettelid) {
    const { data, error: errorZeilen } = await supabase
    .from('t_stundenzeilen')
    .select('*')
    .eq('zettel_id', aktuellerStundenzettelid)
    .order('date', { ascending: true });
    
    if (errorZeilen) {
        console.error('Fehler beim Laden der Zeilen:', errorZeilen);
    } else if (data) {
        lastZeilen = data;
        aktuellerStundenzettelZeilenCount = data.length;
    }
} else {
    neueZeileErstellen();
}


//------------------------ Zeilen im Formular anzeigen ------------------------
lastZeilen.forEach(zeile => {
    const zeileDiv = document.createElement('div');
    zeileDiv.classList.add('zeile');
    zeileDiv.dataset.aktuelleZeileID = zeile.zeilen_id
    zeileDiv.innerHTML = `
    <input type="date" name="workdate" value="${zeile.date}" required>
    <input type="time" name="time_from" value="${zeile.time_from}" required>
    <input type="time" name="time_to" value="${zeile.time_to}" required>
    <span class="stunden">${zeile.hours}h</span>
    <span class="trenner">|</span>
    <span class="verdienst">${zeile.earned}€</span>
    `;
    zeilenForm.appendChild(zeileDiv);
    setupAutoSave(zeileDiv);
});

// Summe nach dem Laden aktualisieren
aktualisiereSumme();
aktualisiereNeueZeileButton();

// ------------------------ Neuen Stundenzettel Erstellen ------------------------

stundenzettelErstellenBtn.addEventListener('click', async() =>{
    const stundenlohnInput = document.getElementById('stundenlohnInput');
    // Verwende den aktuellen Stundenlohn (von vorherigem Zettel) statt immer 10€
    const stundenlohn = parseFloat(stundenlohnInput.value) || aktuellerStundenlohn || 10;
    
    const { data: newZettel, error } = await supabase
    .from('t_stundenzettel')
    .insert([{user_id: userId, stundenlohn: stundenlohn}])
    .select('zettel_id, stundenlohn')
    .single();
    
    if (error) {
        console.error('Fehler beim Erstellen des Stundenzettels:', error);
        await customAlert('Fehler beim Erstellen des Stundenzettels', 'Fehler', 'error');
        return;
    }
    
    aktuellerStundenzettelid = newZettel?.zettel_id;
    aktuellerStundenlohn = newZettel?.stundenlohn || 10;
    aktuellerStundenzettelZeilenCount = 0;
    aktuellerZettelAbgegeben = false;
    zeilenForm.innerHTML = '';
    neueZeileErstellen();
    aktualisiereSumme();
    
    // UI entsperren
    entsperreFelderNachLaden();
    
    // Dropdown aktualisieren
    await ladeAlleStundenzettel();
    stundenzettelAuswahl.value = aktuellerStundenzettelid;
    
    await customAlert('Neuer Stundenzettel erstellt!', 'Erfolg', 'success');
});

// ------------------------ Stundenlohn Update ------------------------

const stundenlohnInput = document.getElementById('stundenlohnInput');
stundenlohnInput.addEventListener('change', async () => {
    if (!aktuellerStundenzettelid) {
        return;
    }
    
    const neuerStundenlohn = parseFloat(stundenlohnInput.value) || 10;
    
    const { error } = await supabase
    .from('t_stundenzettel')
    .update({ stundenlohn: neuerStundenlohn })
    .eq('zettel_id', aktuellerStundenzettelid);
    
    if (error) {
        console.error('Fehler beim Aktualisieren des Stundenlohns:', error);
        await customAlert('Fehler beim Speichern des Stundenlohns', 'Fehler', 'error');
    } else {
        aktuellerStundenlohn = neuerStundenlohn;
    }
});

// ------------------------ Stundenzettel Auswahl ------------------------

stundenzettelAuswahl.addEventListener('change', async () => {
    const selectedZettelId = stundenzettelAuswahl.value;
    
    if (!selectedZettelId) {
        return;
    }
    
    // Stundenzettel laden
    const { data: zettel, error } = await supabase
    .from('t_stundenzettel')
    .select('*')
    .eq('zettel_id', selectedZettelId)
    .single();
    
    if (error) {
        console.error('Fehler beim Laden des Stundenzettels:', error);
        await customAlert('Fehler beim Laden des Stundenzettels', 'Fehler', 'error');
        return;
    }
    
    aktuellerStundenzettelid = zettel.zettel_id;
    aktuellerStundenlohn = zettel.stundenlohn || 10;
    document.getElementById('stundenlohnInput').value = aktuellerStundenlohn;
    ladeStundenzettelAuszahlung(zettel);
    
    // Zeilen laden
    const { data: zeilen, error: errorZeilen } = await supabase
    .from('t_stundenzeilen')
    .select('*')
    .eq('zettel_id', aktuellerStundenzettelid)
    .order('date', { ascending: true });
    
    if (errorZeilen) {
        console.error('Fehler beim Laden der Zeilen:', errorZeilen);
        return;
    }
    
    // Formular leeren und neue Zeilen anzeigen
    zeilenForm.innerHTML = '';
    aktuellerStundenzettelZeilenCount = 0;
    aktualisiereSumme();
    
    if (zeilen && zeilen.length > 0) {
        zeilen.forEach(zeile => {
            aktuellerStundenzettelZeilenCount++;
            const zeileDiv = document.createElement('div');
            zeileDiv.classList.add('zeile');
            zeileDiv.dataset.aktuelleZeileID = zeile.zeilen_id;
            zeileDiv.innerHTML = `
                <input type="date" name="workdate" value="${zeile.date}" required>
                <input type="time" name="time_from" value="${zeile.time_from}" required>
                <input type="time" name="time_to" value="${zeile.time_to}" required>
                <span class="stunden">${zeile.hours}h</span>
                <span class="trenner">|</span>
                <span class="verdienst">${zeile.earned}€</span>
            `;
            zeilenForm.appendChild(zeileDiv);
            setupAutoSave(zeileDiv);
        });
        aktualisiereSumme();
        aktualisiereNeueZeileButton();
    } else {
        aktualisiereSumme();
        aktualisiereNeueZeileButton();
    }
});

// ------------------------ Stundenzettel Löschen ------------------------

stundenzettelLoeschenBtn.addEventListener('click', async () =>{
    if (!aktuellerStundenzettelid) {
        await customAlert('Kein Stundenzettel ausgewählt', 'Fehler', 'error');
        return;
    }
    
    const bestaetigung = await customConfirm(`Möchten Sie den Stundenzettel #${aktuellerStundenzettelid} wirklich löschen?\n\nAlle zugehörigen Zeilen werden ebenfalls gelöscht.\n\nDieser Vorgang kann nicht rückgängig gemacht werden!`, 'Stundenzettel löschen?');
    
    if (!bestaetigung) {
        return;
    }
    
    try {
        // Erst die Zeilen löschen
        const { error: errorZeilen } = await supabase
        .from('t_stundenzeilen')
        .delete()
        .eq('zettel_id', aktuellerStundenzettelid);
        
        if (errorZeilen) {
            console.error('Fehler beim Löschen der Zeilen:', errorZeilen);
            await customAlert('Fehler beim Löschen der Zeilen', 'Fehler', 'error');
            return;
        }
        
        // Dann den Stundenzettel löschen
        const { error: errorZettel } = await supabase
        .from('t_stundenzettel')
        .delete()
        .eq('zettel_id', aktuellerStundenzettelid);
        
        if (errorZettel) {
            console.error('Fehler beim Löschen des Stundenzettels:', errorZettel);
            await customAlert('Fehler beim Löschen des Stundenzettels', 'Fehler', 'error');
            return;
        }
        
        // UI zurücksetzen
        const letzterStundenlohn = aktuellerStundenlohn; // Stundenlohn merken
        aktuellerStundenzettelid = null;
        aktuellerStundenlohn = letzterStundenlohn; // Stundenlohn beibehalten
        aktuellerStundenzettelZeilenCount = 0;
        zeilenForm.innerHTML = '';
        document.getElementById('stundenlohnInput').value = letzterStundenlohn;
        
        // Dropdown aktualisieren
        await ladeAlleStundenzettel();
        stundenzettelAuswahl.value = '';
        aktualisiereSumme();
        
        await customAlert('Stundenzettel erfolgreich gelöscht', 'Erfolg', 'success');
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Ein Fehler ist aufgetreten', 'Fehler', 'error');
    }
});

// ------------------------ Neue Zeile Button ------------------------

neueZeileBtn.addEventListener('click', async () =>{
    if (!aktuellerStundenzettelid) {
        await customAlert('Bitte erstellen Sie zuerst einen Stundenzettel', 'Fehler', 'error');
        return;
    }
    neueZeileErstellen();
});

// ------------------------ Bild Upload Event Listener ------------------------

zettelBildUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const bildUrl = await ladeBildHoch(file);
    if (bildUrl) {
        zeigeBildVorschau(bildUrl);
    }
});

// ------------------------ Zettel abgeben Event Listener ------------------------

zettelAbgebenBtn.addEventListener('click', zettelAbgeben);

// ------------------------ Stundenzettel Speichern ------------------------

stundenzettelSpeichernBtn.addEventListener('click', async() =>{
    if (!aktuellerStundenzettelid) {
        await customAlert('Kein aktiver Stundenzettel vorhanden', 'Fehler', 'error');
        return;
    }
    
    if (aktuellerZettelAbgegeben) {
        zeigeAbgegebenPopup();
        return;
    }
    
    const zeilen = zeilenForm.querySelectorAll('.zeile');
    let gespeichert = 0;
    let fehler = 0;
    
    for (const zeileDiv of zeilen) {
        const inputs = zeileDiv.querySelectorAll('input');
        const filled = Array.from(inputs).every(i => i.value);
        
        if (filled) {
            try {
                const workdate = inputs[0].value;
                const time_from = inputs[1].value;
                const time_to = inputs[2].value;
                
                const startTime = new Date(`${workdate}T${time_from}`);
                let endTime = new Date(`${workdate}T${time_to}`);
                
                // Wenn Endzeit vor Startzeit liegt, ist es der nächste Tag
                if (endTime <= startTime) {
                  endTime.setDate(endTime.getDate() + 1);
                }
                
                const workedHours = (endTime - startTime) / (1000 * 60 * 60);
                const earned = workedHours * aktuellerStundenlohn;
                
                await zelleSpeichernDB(
                    workdate,
                    time_from,
                    time_to,
                    aktuellerStundenzettelid,
                    workedHours,
                    earned,
                    zeileDiv
                );
                
                const AnzeigeStunden = zeileDiv.querySelector('.stunden');
                const AnzeigeVerdienst = zeileDiv.querySelector('.verdienst');
                AnzeigeStunden.textContent = `${workedHours.toFixed(2)}h`;
                AnzeigeVerdienst.textContent = `${earned.toFixed(2)}€`;
                
                gespeichert++;
            } catch (error) {
                console.error('Fehler beim Speichern:', error);
                fehler++;
            }
        }
    }
    
    if (fehler > 0) {
        await customAlert(`${gespeichert} Zeilen gespeichert, ${fehler} Fehler aufgetreten`, 'Warnung', 'warning');
    } else {
        await customAlert(`${gespeichert} Zeilen erfolgreich gespeichert`, 'Erfolg', 'success');
    }
    
    aktualisiereSumme();
});


// ------------------------ Auszahlungs-Toggle für Stundenzettel ------------------------

function setupStundenzettelAuszahlung() {
    const checkbox = document.getElementById('zettelAusbezahlt');
    const details = document.getElementById('zettelAuszahlungsDetails');
    
    checkbox.addEventListener('change', async () => {
        details.style.display = checkbox.checked ? 'flex' : 'none';
        await speichereStundenzettelAuszahlung();
    });
    
    // Event Listener für Auszahlungsfelder
    const auszahlungsInputs = details.querySelectorAll('input');
    auszahlungsInputs.forEach(input => {
        input.addEventListener('blur', async () => {
            await speichereStundenzettelAuszahlung();
        });
    });
}

async function speichereStundenzettelAuszahlung() {
    if (!aktuellerStundenzettelid) return;
    
    const checkbox = document.getElementById('zettelAusbezahlt');
    const barAusbezahlt = parseFloat(document.getElementById('zettelBarAusbezahlt').value) || null;
    const datumBar = document.getElementById('zettelDatumBar').value || null;
    const ueberwiesen = parseFloat(document.getElementById('zettelUeberwiesen').value) || null;
    const datumUeberwiesen = document.getElementById('zettelDatumUeberwiesen').value || null;
    
    const { error } = await supabase
    .from('t_stundenzettel')
    .update({
        ausbezahlt: checkbox.checked,
        bar_ausbezahlt: barAusbezahlt,
        datum_bar_ausbezahlt: datumBar,
        ueberwiesen_ausbezahlt: ueberwiesen,
        datum_ueberwiesen_ausbezahlt: datumUeberwiesen
    })
    .eq('zettel_id', aktuellerStundenzettelid);
    
    if (error) {
        console.error('Fehler beim Speichern der Auszahlungsdaten:', error);
    }
}

function ladeStundenzettelAuszahlung(zettel) {
    const checkbox = document.getElementById('zettelAusbezahlt');
    const details = document.getElementById('zettelAuszahlungsDetails');
    
    checkbox.checked = zettel.ausbezahlt || false;
    details.style.display = zettel.ausbezahlt ? 'flex' : 'none';
    
    document.getElementById('zettelBarAusbezahlt').value = zettel.bar_ausbezahlt || '';
    document.getElementById('zettelDatumBar').value = zettel.datum_bar_ausbezahlt || '';
    document.getElementById('zettelUeberwiesen').value = zettel.ueberwiesen_ausbezahlt || '';
    document.getElementById('zettelDatumUeberwiesen').value = zettel.datum_ueberwiesen_ausbezahlt || '';
    
    // Bild laden falls vorhanden
    if (zettel.bild_url) {
        zeigeBildVorschau(zettel.bild_url);
    } else {
        bildVorschau.innerHTML = '';
    }
    
    // Zettel abgegeben Status prüfen
    aktuellerZettelAbgegeben = zettel.zettel_abgegeben || false;
    if (aktuellerZettelAbgegeben) {
        sperreFelderNachAbgabe();
    } else {
        entsperreFelderNachLaden();
    }
}

// ------------------------ Summe Berechnen ------------------------

function aktualisiereSumme() {
    const alleZeilen = zeilenForm.querySelectorAll('.zeile');
    let gesamtStunden = 0;
    let gesamtVerdienst = 0;
    
    alleZeilen.forEach(zeileDiv => {
        const inputs = zeileDiv.querySelectorAll('input');
        const filled = Array.from(inputs).every(i => i.value);
        
        if (filled) {
            const workdate = inputs[0].value;
            const time_from = inputs[1].value;
            const time_to = inputs[2].value;
            
            const startTime = new Date(`${workdate}T${time_from}`);
            let endTime = new Date(`${workdate}T${time_to}`);
            
            if (endTime <= startTime) {
                endTime.setDate(endTime.getDate() + 1);
            }
            
            const workedHours = (endTime - startTime) / (1000 * 60 * 60);
            const earned = workedHours * aktuellerStundenlohn;
            
            gesamtStunden += workedHours;
            gesamtVerdienst += earned;
        }
    });
    
    document.getElementById('gesamtStunden').textContent = `${gesamtStunden.toFixed(2)}h`;
    document.getElementById('gesamtVerdienst').textContent = `${gesamtVerdienst.toFixed(2)}\u20ac`;
}

// ------------------------ Neue Zeile Erstellen ------------------------

function neueZeileErstellen(){
    aktuellerStundenzettelZeilenCount++;

    const zeileDiv = document.createElement('div');
    zeileDiv.classList.add('zeile');
    zeileDiv.dataset.neueZeileID = `temp-${Date.now()}`
    zeileDiv.innerHTML = `
    <input type="date" name="workdate${aktuellerStundenzettelZeilenCount}" required>
    <input type="time" name="time_from${aktuellerStundenzettelZeilenCount}" required>
    <input type="time" name="time_to${aktuellerStundenzettelZeilenCount}" required>
    <span class="stunden">0h</span>
    <span class="trenner">|</span>
    <span class="verdienst">0€</span>
    `

    zeilenForm.appendChild(zeileDiv);
    setupAutoSave(zeileDiv);
    aktualisiereNeueZeileButton();
}

// ---------------------------- Automatisch speichern  ------------------------
function setupAutoSave(zeileDiv) {
    const inputs = zeileDiv.querySelectorAll('input');
    inputs.forEach(input => {
    input.addEventListener('blur', async () => {
      // Prüfen ob Zettel abgegeben wurde
      if (aktuellerZettelAbgegeben) {
        zeigeAbgegebenPopup();
        return; // Keine Bearbeitung erlaubt
      }
      
      const filled = Array.from(inputs).every(i => i.value);
      if (filled) {
      const workdate = inputs[0].value;
      const time_from = inputs[1].value;
      const time_to = inputs[2].value;

      const startTime = new Date(`${workdate}T${time_from}`);
      let endTime = new Date(`${workdate}T${time_to}`);
      
      // Wenn Endzeit vor Startzeit liegt, ist es der nächste Tag
      if (endTime <= startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }
      
      const workedHours = (endTime - startTime) / (1000 * 60 * 60);
      const earned = workedHours * aktuellerStundenlohn;

      const AnzeigeStunden = zeileDiv.querySelector('.stunden');
      const AnzeigeVerdienst = zeileDiv.querySelector('.verdienst');
      AnzeigeStunden.textContent = `${workedHours.toFixed(2)}h`;
      AnzeigeVerdienst.textContent = `${earned.toFixed(2)}€`;

      if (!aktuellerStundenzettelid) {
        await customAlert('Bitte erstellen Sie zuerst einen Stundenzettel', 'Fehler', 'error');
        return;
      }
    
      try {
        await zelleSpeichernDB(
          workdate,
          time_from,
          time_to,
          aktuellerStundenzettelid,
          workedHours,
          earned,
          zeileDiv
        );
        aktualisiereSumme();
      } catch (error) {
        console.error('Fehler beim Speichern:', error);
        await customAlert('Fehler beim Speichern der Zeile', 'Fehler', 'error');
      }
      }
    });
  });
}



// ------------------------ Speichern der Zeile in der DB ------------------------

async function zelleSpeichernDB(workdate, time_from, time_to, aktuellerStundenzettelid,workedHours, earned, zeileDiv){
  if (!aktuellerStundenzettelid) {
    throw new Error('Kein Stundenzettel vorhanden. Bitte erstellen Sie zuerst einen Stundenzettel.');
  }
  
  const aktuelleZeileID = zeileDiv.dataset.aktuelleZeileID;
  console.log('Aktuelle Zeilen ID:', aktuelleZeileID);
  const neueZeileID = zeileDiv.dataset.neueZeileID;
  
  if(aktuelleZeileID){
    const { data, error } = await supabase
    .from('t_stundenzeilen')
    .update({
        date: workdate,
        time_from,
        time_to,
        hours: workedHours,
        earned
    })
    .eq('zeilen_id', aktuelleZeileID);


    
    if (error) {
        console.error('Fehler beim Speichern der Zeile:', error);
        throw error;
    }
    return data;
  }else {
      const { data, error } = await supabase
      .from('t_stundenzeilen')
            .insert([{
            zettel_id: aktuellerStundenzettelid,
            date: workdate,
            time_from,
            time_to,
            hours: workedHours,
            earned

          }])
      .select()
      .single();
      if (error) {
          console.error('Fehler beim Einfügen der neuen Zeile:', error);
          throw error;
      }

      if (data) {
          delete zeileDiv.dataset.neueZeileID;
          zeileDiv.dataset.aktuelleZeileID = data.zeilen_id;
      }

}
}
