import { createClient } from '@supabase/supabase-js'

const loginBtn = document.getElementById('loginButton');
const logoutBtn = document.getElementById('logoutButton');
const willkommenText = document.getElementById('willkommenText');
const abrechnungBtn = document.getElementById('linkToAbrechnung');
const stundenzettelBtn = document.getElementById('linkToStundenzettel');
let currentUser = null;

// Custom Popup Elemente
const customPopup = document.getElementById('customPopup');
const popupTitle = document.getElementById('popupTitle');
const popupMessage = document.getElementById('popupMessage');
const popupCloseBtn = document.getElementById('popupCloseBtn');
const popupConfirmBtn = document.getElementById('popupConfirmBtn');
const popupCancelBtn = document.getElementById('popupCancelBtn');

// Login Popup Elemente
const loginPopup = document.getElementById('loginPopup');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const loginCancelBtn = document.getElementById('loginCancelBtn');

let popupResolve = null;
let loginResolve = null;

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

function zeigeLoginPopup() {
    return new Promise((resolve) => {
        loginEmail.value = '';
        loginPassword.value = '';
        loginPopup.style.display = 'flex';
        loginEmail.focus();
        loginResolve = resolve;
    });
}

function schliesseLoginPopup(credentials = null) {
    loginPopup.style.display = 'none';
    if (loginResolve) {
        loginResolve(credentials);
        loginResolve = null;
    }
}

// Event Listeners für Popups
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

loginSubmitBtn.addEventListener('click', () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    if (email && password) {
        schliesseLoginPopup({ email, password });
    } else {
        customAlert('Bitte E-Mail und Passwort eingeben', 'Fehler', 'error');
    }
});

loginCancelBtn.addEventListener('click', () => {
    schliesseLoginPopup(null);
});

loginPopup.addEventListener('click', (e) => {
    if (e.target === loginPopup) {
        schliesseLoginPopup(null);
    }
});

// Enter-Taste im Login-Popup
loginPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loginSubmitBtn.click();
    }
});

// Passwort anzeigen/verbergen
const togglePasswordBtn = document.getElementById('togglePassword');
togglePasswordBtn.addEventListener('click', () => {
    const type = loginPassword.type === 'password' ? 'text' : 'password';
    loginPassword.type = type;
    togglePasswordBtn.classList.toggle('active');
});





// Create a single supabase client for interacting with your database
const supabase = createClient
(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY, 
)


// login FUNCTION
async function supabaseLogin(username, password)
{
    const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
    })
if (error) {
    await customAlert('Error logging in: ' + error.message, 'Fehler', 'error');
    return null;
}
else {
    updateUI();
    return data;
}}

// login BUTTON
loginBtn.addEventListener('click', async () => {
    const credentials = await zeigeLoginPopup();
    if (credentials) {
        const user = await supabaseLogin(credentials.email, credentials.password);
    }
});

// Buttons AUSBLENDEN / Update UI
async function updateUI() {
const { data: { user } } = await supabase.auth.getUser();
currentUser = user || null;


if (user) {
    logoutBtn.style.display = 'block';
    willkommenText.style.display = 'block';
    willkommenText.textContent = `Willkommen, ${user.email}`;
    loginBtn.style.display = 'none';
} else {
    logoutBtn.style.display = 'none';
    willkommenText.style.display = 'none';
    loginBtn.style.display = 'block';
}}


// logout FUNCTION
async function supabaseLogout()
{ await supabase.auth.signOut();}

// logout BUTTON
logoutBtn.addEventListener('click', async () => {
    await supabaseLogout();
    await customAlert('Sie wurden erfolgreich abgemeldet.', 'Abgemeldet', 'success');
    updateUI();
});

// klick auf Abrechnung BUTTON
abrechnungBtn.addEventListener('click', () => {
    window.location.href = '2-Abrechnung.html';
});

// klick auf Stundenzettel BUTTON
stundenzettelBtn.addEventListener('click', async () => {
    if (!currentUser) {
        await customAlert('Bitte Anmelden, um auf den Stundenzettel zugreifen zu können.', 'Anmeldung erforderlich', 'warning');
        return;
    }
    else{
    window.location.href = '3-Stundenzettel.html';
    }
});


updateUI();