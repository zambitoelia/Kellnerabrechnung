import { createClient } from '@supabase/supabase-js'

const loginBtn = document.getElementById('loginButton');
const logoutBtn = document.getElementById('logoutButton');
const willkommenText = document.getElementById('willkommenText');
const abrechnungBtn = document.getElementById('linkToAbrechnung');
const stundenzettelBtn = document.getElementById('linkToStundenzettel');
let currentUser = null;





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
    alert('Error logging in: ' + error.message);
    return null;
}
else {
    updateUI();
    return data;
}}

// login BUTTON
loginBtn.addEventListener('click', async () => {
    const email = prompt('Enter your email:');
    const password = prompt('Enter your password:');
    const user = await supabaseLogin(email, password);
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
    alert('You have been logged out.');
    updateUI();
});

// klick auf Abrechnung BUTTON
abrechnungBtn.addEventListener('click', () => {
    window.location.href = '2-Abrechnung.html';
});

// klick auf Stundenzettel BUTTON
stundenzettelBtn.addEventListener('click', () => {
    if (!currentUser) {
        alert('Bitte Anmelden, um auf den Stundenzettel zugreifen zu können.');
        return;
    }
    else{
    window.location.href = '3-Stundenzettel.html';
    }
});


updateUI();