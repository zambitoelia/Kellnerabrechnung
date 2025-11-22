import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
)

// Aktuellen User holen
const { data: userdata } = await supabase.auth.getUser();
const userId = userdata?.user?.id;

// DOM Elemente
const adminUploadBereich = document.getElementById('adminUploadBereich');
const planTypeSelect = document.getElementById('planType');
const planUploadInput = document.getElementById('planUpload');
const uploadBtn = document.getElementById('uploadBtn');
const currentPlanContent = document.getElementById('currentPlanContent');
const currentPlanWeek = document.getElementById('currentPlanWeek');
const upcomingPlanContainer = document.getElementById('upcomingPlanContainer');
const upcomingPlanContent = document.getElementById('upcomingPlanContent');
const archivSelect = document.getElementById('archivSelect');
const archivContent = document.getElementById('archivContent');

// Custom Popup Elemente
const customPopup = document.getElementById('customPopup');
const popupTitle = document.getElementById('popupTitle');
const popupMessage = document.getElementById('popupMessage');
const popupCloseBtn = document.getElementById('popupCloseBtn');
const popupConfirmBtn = document.getElementById('popupConfirmBtn');
const popupCancelBtn = document.getElementById('popupCancelBtn');

let popupResolve = null;
let isAdmin = false;

// ------------------------ Popup Funktionen ------------------------

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
        
        popupTitle.className = '';
        if (type === 'error') popupTitle.classList.add('error');
        if (type === 'success') popupTitle.classList.add('success');
        if (type === 'warning') popupTitle.classList.add('warning');
        
        popupCloseBtn.style.display = 'inline-block';
        popupConfirmBtn.style.display = 'none';
        popupCancelBtn.style.display = 'none';
        
        customPopup.style.display = 'flex';
        
        popupResolve = resolve;
    });
}

function customConfirm(title, message) {
    return new Promise((resolve) => {
        popupTitle.textContent = title;
        popupMessage.textContent = message;
        
        popupTitle.className = '';
        
        popupCloseBtn.style.display = 'none';
        popupConfirmBtn.style.display = 'inline-block';
        popupCancelBtn.style.display = 'inline-block';
        
        customPopup.style.display = 'flex';
        
        popupResolve = resolve;
    });
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

// ------------------------ Vollbild-Funktion für Bilder ------------------------

function openFullscreen(imageUrl) {
    const fullscreenDiv = document.createElement('div');
    fullscreenDiv.className = 'fullscreen-overlay';
    fullscreenDiv.innerHTML = `
        <div class="fullscreen-content">
            <button class="fullscreen-close" onclick="closeFullscreen()">&times;</button>
            <img src="${imageUrl}" alt="Dienstplan Vollbild">
        </div>
    `;
    document.body.appendChild(fullscreenDiv);
    
    // Schließen bei Klick auf Overlay
    fullscreenDiv.addEventListener('click', (e) => {
        if (e.target === fullscreenDiv) {
            closeFullscreen();
        }
    });
    
    // Schließen mit ESC-Taste
    document.addEventListener('keydown', handleEscapeKey);
}

function closeFullscreen() {
    const fullscreenDiv = document.querySelector('.fullscreen-overlay');
    if (fullscreenDiv) {
        fullscreenDiv.remove();
    }
    document.removeEventListener('keydown', handleEscapeKey);
}

function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeFullscreen();
    }
}

// Funktionen global verfügbar machen für onclick
window.openFullscreen = openFullscreen;
window.closeFullscreen = closeFullscreen;

// ------------------------ Hilfsfunktionen ------------------------

// Kalenderwoche berechnen
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { week: weekNo, year: d.getUTCFullYear() };
}

// Montag der aktuellen Woche (KW Start)
function getMondayOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Montag
    return new Date(d.setDate(diff));
}

// Nächsten Montag berechnen
function getNextMonday(date) {
    const monday = getMondayOfWeek(date);
    monday.setDate(monday.getDate() + 7);
    return monday;
}

// Datumsspanne für Woche formatieren (Montag - Sonntag)
function getWeekDateRange(monday) {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const formatDate = (date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };
    
    return `${formatDate(monday)} - ${formatDate(sunday)}`;
}

// Pfad im dienstplan Bucket basierend auf Typ
function getPlanPath(type = 'current') {
    if (type === 'upcoming') {
        return 'upcoming_plan';
    } else if (type === 'archive') {
        return 'archive_plan';
    }
    return 'current_plan';
}

// Filename mit KW
function getFileName(weekInfo, originalName) {
    const ext = originalName.split('.').pop();
    return `KW${weekInfo.week}_${weekInfo.year}.${ext}`;
}

// ------------------------ Admin Check ------------------------

async function checkAdminStatus() {
    if (!userId) {
        console.log('Kein User angemeldet');
        return false;
    }

    console.log('Prüfe Admin Status für User:', userId);

    // Erst alle Spalten laden um zu sehen was vorhanden ist
    let { data, error } = await supabase
        .from('t_user')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    console.log('Query Ergebnis - Data:', data);
    console.log('Query Ergebnis - Error:', error);

    if (error) {
        console.error('Fehler bei Admin-Check:', error);
        return false;
    }

    if (!data) {
        console.log('Kein Eintrag in t_user gefunden - erstelle neuen User mit Rolle "user"');
        
        // User automatisch anlegen
        const { data: insertData, error: insertError } = await supabase
            .from('t_user')
            .insert([{ user_id: userId, user_role: 'user' }])
            .select()
            .maybeSingle();
        
        if (insertError) {
            console.error('Fehler beim Erstellen des User-Eintrags:', insertError);
            
            // Prüfen ob es ein Permissions-Problem ist
            if (insertError.code === '42501' || insertError.message.includes('policy')) {
                await customAlert(
                    'Datenbank-Konfiguration fehlt: Bitte RLS Policies für t_user Tabelle erstellen.',
                    'Konfiguration erforderlich',
                    'error'
                );
            } else {
                await customAlert(
                    'Fehler beim Erstellen des Benutzereintrags. Bitte kontaktiere den Administrator.',
                    'Fehler',
                    'error'
                );
            }
            return false;
        }
        
        if (insertData) {
            console.log('✅ User erfolgreich in t_user erstellt:', insertData);
            data = insertData;
        }
    }

    if (!data) {
        console.error('Kein User-Datensatz verfügbar');
        return false;
    }

    console.log('✅ User Datensatz geladen:', JSON.stringify(data, null, 2));
    console.log('User Role:', data.user_role);
    const isAdmin = data.user_role === 'admin';
    console.log('Ist Admin:', isAdmin);
    
    return isAdmin;
}

// ------------------------ Upload Funktion ------------------------

async function uploadDienstplan(file, type) {
    const now = new Date();
    let weekInfo;
    
    if (type === 'upcoming') {
        const nextMonday = getNextMonday(now);
        weekInfo = getWeekNumber(nextMonday);
    } else {
        const monday = getMondayOfWeek(now);
        weekInfo = getWeekNumber(monday);
    }

    const bucketName = 'dienstplan';
    const folderPath = getPlanPath(type);
    const fileName = getFileName(weekInfo, file.name);
    const filePath = `${folderPath}/${weekInfo.year}/${fileName}`;

    // Zuerst prüfen ob schon ein Plan für diese Woche existiert
    const { data: existingFiles } = await supabase.storage
        .from(bucketName)
        .list(`${folderPath}/${weekInfo.year}`);

    if (existingFiles && existingFiles.length > 0) {
        // Alte Datei löschen
        for (const oldFile of existingFiles) {
            await supabase.storage
                .from(bucketName)
                .remove([`${folderPath}/${weekInfo.year}/${oldFile.name}`]);
        }
    }

    // Neue Datei hochladen
    const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (error) {
        console.error('Upload Fehler:', error);
        throw error;
    }

    // Öffentliche URL generieren
    const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

    return {
        url: urlData.publicUrl,
        weekInfo,
        type
    };
}

// ------------------------ Dienstpläne laden ------------------------

async function loadCurrentPlan() {
    const now = new Date();
    const monday = getMondayOfWeek(now);
    const weekInfo = getWeekNumber(monday);
    const dateRange = getWeekDateRange(monday);
    
    const bucketName = 'dienstplan';
    const folderPath = 'current_plan';
    
    const { data: files } = await supabase.storage
        .from(bucketName)
        .list(`${folderPath}/${weekInfo.year}`);

    if (!files || files.length === 0) {
        currentPlanContent.innerHTML = '<p class="no-plan-message">Kein Dienstplan für diese Woche verfügbar</p>';
        currentPlanWeek.innerHTML = `<p class="week-info">${dateRange}</p>`;
        return;
    }

    const file = files[0];
    const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(`${folderPath}/${weekInfo.year}/${file.name}`);

    // Cache-Buster hinzufügen
    const cacheBuster = `?t=${Date.now()}`;
    const imageUrl = urlData.publicUrl + cacheBuster;

    currentPlanWeek.innerHTML = `<p class="week-info">${dateRange}</p>`;
    
    const deleteButton = isAdmin ? `<button class="delete-plan-btn" onclick="deletePlan('current', '${folderPath}/${weekInfo.year}/${file.name}')">🗑️ Löschen</button>` : '';
    
    if (file.name.toLowerCase().endsWith('.pdf')) {
        currentPlanContent.innerHTML = `
            ${deleteButton}
            <iframe src="${imageUrl}" class="plan-pdf"></iframe>
            <a href="${imageUrl}" target="_blank" class="download-link">PDF öffnen</a>
        `;
    } else {
        currentPlanContent.innerHTML = `
            ${deleteButton}
            <img src="${imageUrl}" alt="Dienstplan ${dateRange}" class="plan-image" onclick="openFullscreen(this.src)">
        `;
    }
}

async function loadUpcomingPlan() {
    const now = new Date();
    const nextMonday = getNextMonday(now);
    const weekInfo = getWeekNumber(nextMonday);
    const dateRange = getWeekDateRange(nextMonday);
    
    const bucketName = 'dienstplan';
    const folderPath = 'upcoming_plan';
    
    const { data: files } = await supabase.storage
        .from(bucketName)
        .list(`${folderPath}/${weekInfo.year}`);

    if (!files || files.length === 0) {
        upcomingPlanContainer.style.display = 'none';
        return;
    }

    const file = files[0];
    const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(`${folderPath}/${weekInfo.year}/${file.name}`);

    // Cache-Buster hinzufügen
    const cacheBuster = `?t=${Date.now()}`;
    const imageUrl = urlData.publicUrl + cacheBuster;

    upcomingPlanContainer.style.display = 'block';
    
    const deleteButton = isAdmin ? `<button class="delete-plan-btn-small" onclick="deletePlan('upcoming', '${folderPath}/${weekInfo.year}/${file.name}')">🗑️</button>` : '';
    
    if (file.name.toLowerCase().endsWith('.pdf')) {
        upcomingPlanContent.innerHTML = `
            <p class="week-info-small">${dateRange} ${deleteButton}</p>
            <a href="${imageUrl}" target="_blank" class="preview-link">
                <div class="pdf-preview">📄 PDF Vorschau</div>
            </a>
        `;
    } else {
        upcomingPlanContent.innerHTML = `
            <p class="week-info-small">${dateRange} ${deleteButton}</p>
            <img src="${imageUrl}" alt="Dienstplan ${dateRange}" class="plan-image-small" onclick="openFullscreen(this.src)">
        `;
    }
}

async function loadArchive() {
    const bucketName = 'dienstplan';
    const folderPath = 'archive_plan';
    
    // Alle Jahre im Archiv laden
    const { data: folders } = await supabase.storage
        .from(bucketName)
        .list(folderPath);

    if (!folders || folders.length === 0) {
        return;
    }

    let allPlans = [];

    // Für jedes Jahr die Dateien laden
    for (const folder of folders) {
        if (folder.name === '.emptyFolderPlaceholder') continue;
        
        const { data: files } = await supabase.storage
            .from(bucketName)
            .list(`${folderPath}/${folder.name}`);

        if (files) {
            files.forEach(file => {
                if (file.name === '.emptyFolderPlaceholder') return;
                
                // KW aus Dateinamen extrahieren
                const match = file.name.match(/KW(\d+)_(\d+)/);
                if (match) {
                    allPlans.push({
                        week: parseInt(match[1]),
                        year: parseInt(match[2]),
                        fileName: file.name,
                        path: `${folderPath}/${folder.name}/${file.name}`
                    });
                }
            });
        }
    }

    // Sortieren: Neueste zuerst
    allPlans.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.week - a.week;
    });

    // Dropdown befüllen
    archivSelect.innerHTML = '<option value="">-- Ältere Dienstpläne anzeigen --</option>';
    allPlans.forEach(plan => {
        const option = document.createElement('option');
        option.value = plan.path;
        option.textContent = `KW ${plan.week} / ${plan.year}`;
        option.dataset.fileName = plan.fileName;
        archivSelect.appendChild(option);
    });
}

// ------------------------ Archiv Auswahl ------------------------

archivSelect.addEventListener('change', async () => {
    const selectedPath = archivSelect.value;
    
    if (!selectedPath) {
        archivContent.style.display = 'none';
        return;
    }

    const { data: urlData } = supabase.storage
        .from('dienstplan')
        .getPublicUrl(selectedPath);

    // Cache-Buster hinzufügen
    const cacheBuster = `?t=${Date.now()}`;
    const imageUrl = urlData.publicUrl + cacheBuster;

    archivContent.style.display = 'block';
    
    const fileName = archivSelect.options[archivSelect.selectedIndex].dataset.fileName;
    
    if (fileName.toLowerCase().endsWith('.pdf')) {
        archivContent.innerHTML = `
            <iframe src="${imageUrl}" class="plan-pdf"></iframe>
            <a href="${imageUrl}" target="_blank" class="download-link">PDF öffnen</a>
        `;
    } else {
        archivContent.innerHTML = `<img src="${imageUrl}" alt="Archivierter Dienstplan" class="plan-image">`;
    }
});

// ------------------------ Dienstplan löschen ------------------------

async function deletePlan(type, filePath) {
    const confirmation = await customConfirm(
        `Möchten Sie diesen Dienstplan wirklich löschen?`,
        `Typ: ${type === 'current' ? 'Aktuell' : 'Nächste Woche'}\n\nDieser Vorgang kann nicht rückgängig gemacht werden.`
    );
    
    if (!confirmation) return;
    
    const bucketName = 'dienstplan';
    
    try {
        const { error } = await supabase.storage
            .from(bucketName)
            .remove([filePath]);
        
        if (error) {
            console.error('Fehler beim Löschen:', error);
            await customAlert('Fehler beim Löschen des Dienstplans', 'Fehler', 'error');
            return;
        }
        
        await customAlert('Dienstplan erfolgreich gelöscht', 'Erfolg', 'success');
        
        // UI neu laden
        await loadCurrentPlan();
        await loadUpcomingPlan();
    } catch (error) {
        console.error('Fehler:', error);
        await customAlert('Ein Fehler ist aufgetreten', 'Fehler', 'error');
    }
}

// Global verfügbar machen
window.deletePlan = deletePlan;

// ------------------------ Upload Button ------------------------

uploadBtn.addEventListener('click', async () => {
    if (!isAdmin) {
        await customAlert('Keine Berechtigung zum Hochladen', 'Fehler', 'error');
        return;
    }

    const selectedFile = planUploadInput.files[0];
    if (!selectedFile) {
        await customAlert('Bitte eine Datei auswählen', 'Fehler', 'error');
        return;
    }

    const type = planTypeSelect.value;

    try {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Wird hochgeladen...';

        const result = await uploadDienstplan(selectedFile, type);
        
        await customAlert(
            `Dienstplan erfolgreich hochgeladen für KW ${result.weekInfo.week}/${result.weekInfo.year}`,
            'Erfolg',
            'success'
        );

        // UI neu laden
        planUploadInput.value = '';
        await loadCurrentPlan();
        await loadUpcomingPlan();
        
    } catch (error) {
        console.error('Upload Fehler:', error);
        await customAlert('Fehler beim Hochladen des Dienstplans', 'Fehler', 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Hochladen';
    }
});

// ------------------------ Automatische Archivierung (Wochenübergang) ------------------------

async function checkAndArchiveOldPlans() {
    const now = new Date();
    const currentMonday = getMondayOfWeek(now);
    const currentWeekInfo = getWeekNumber(currentMonday);
    
    // Prüfen ob heute Montag ist und ob wir schon archiviert haben
    const dayOfWeek = now.getDay();
    
    const bucketName = 'dienstplan';
    
    // Current Plan prüfen
    const { data: currentFiles } = await supabase.storage
        .from(bucketName)
        .list('current_plan');

    if (currentFiles) {
        for (const yearFolder of currentFiles) {
            if (yearFolder.name === '.emptyFolderPlaceholder') continue;
            
            const { data: files } = await supabase.storage
                .from(bucketName)
                .list(`current_plan/${yearFolder.name}`);

            if (files) {
                for (const file of files) {
                    const match = file.name.match(/KW(\d+)_(\d+)/);
                    if (match) {
                        const fileWeek = parseInt(match[1]);
                        const fileYear = parseInt(match[2]);
                        
                        // Wenn die KW älter ist als aktuelle Woche -> archivieren
                        if (fileYear < currentWeekInfo.year || 
                            (fileYear === currentWeekInfo.year && fileWeek < currentWeekInfo.week)) {
                            
                            // Datei downloaden
                            const { data: fileData } = await supabase.storage
                                .from(bucketName)
                                .download(`current_plan/${yearFolder.name}/${file.name}`);

                            if (fileData) {
                                // In Archiv hochladen
                                await supabase.storage
                                    .from(bucketName)
                                    .upload(`archive_plan/${fileYear}/${file.name}`, fileData, { upsert: true });

                                // Aus current_plan löschen
                                await supabase.storage
                                    .from(bucketName)
                                    .remove([`current_plan/${yearFolder.name}/${file.name}`]);
                            }
                        }
                    }
                }
            }
        }
    }

    // Upcoming Plan zu Current verschieben wenn Montag
    if (dayOfWeek === 1) { // Montag
        const { data: upcomingFiles } = await supabase.storage
            .from(bucketName)
            .list(`upcoming_plan/${currentWeekInfo.year}`);

        if (upcomingFiles && upcomingFiles.length > 0) {
            for (const file of upcomingFiles) {
                if (file.name === '.emptyFolderPlaceholder') continue;
                
                // Datei downloaden
                const { data: fileData } = await supabase.storage
                    .from(bucketName)
                    .download(`upcoming_plan/${currentWeekInfo.year}/${file.name}`);

                if (fileData) {
                    // In current_plan hochladen
                    await supabase.storage
                        .from(bucketName)
                        .upload(`current_plan/${currentWeekInfo.year}/${file.name}`, fileData, { upsert: true });

                    // Aus upcoming_plan löschen
                    await supabase.storage
                        .from(bucketName)
                        .remove([`upcoming_plan/${currentWeekInfo.year}/${file.name}`]);
                }
            }
        }
    }
}

// ------------------------ Initialisierung ------------------------

async function init() {
    // Admin Status prüfen (nur wenn angemeldet)
    if (userId) {
        isAdmin = await checkAdminStatus();
    }
    
    console.log('Admin Upload Bereich Element:', adminUploadBereich);
    console.log('isAdmin Wert:', isAdmin);
    
    if (isAdmin) {
        console.log('Zeige Admin Upload Bereich an');
        adminUploadBereich.style.display = 'block';
    } else {
        console.log('Admin Bereich bleibt versteckt - kein Admin');
    }

    // Automatische Archivierung prüfen
    await checkAndArchiveOldPlans();

    // Pläne laden
    await loadCurrentPlan();
    await loadUpcomingPlan();
    await loadArchive();
}

init();