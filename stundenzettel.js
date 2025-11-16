// Stundenzettel Konfiguration 
const stundenzettelErstellenBtn = document.getElementById('stundenzettelErstellenButton');
const zeilenForm = document.getElementById('zeilenForm');
const stundenzettelMaxZeilen = 7;
let aktuellerStundenzettelid = null;
let aktuellerStundenzettelZeilenCount = 0;

// Stundenzettel erstellen
stundenzettelErstellenBtn.addEventListener('click', async() =>{
    aktuellerStundenzettelid = Date.now();
    aktuellerStundenzettelZeilenCount = 0;
    zeilenForm.innerHTML = '';
    neueZeileErstellen();
});

function neueZeileErstellen(){
    if (aktuellerStundenzettelZeilenCount >= stundenzettelMaxZeilen) {
        alert('Maximale Anzahl an Zeilen erreicht. Neuen Stundenzettel erstellen.');
        return;
    }
    aktuellerStundenzettelZeilenCount++;

    const zeileDiv = document.createElement('div');
    zeileDiv.classList.add('zeile');
    zeileDiv.innerHTML = `
    <input type="date" name="date${aktuellerStundenzettelZeilenCount}" required>
    <input type="time" name="from${aktuellerStundenzettelZeilenCount}" required>
    <input type="time" name="to${aktuellerStundenzettelZeilenCount}" required>
    <span class="stunden">0h</span>
    <span class="verdienst">0€</span>
    `

    zeilenForm.appendChild(zeileDiv);

    // Automatisch speichern bei Änderung
    const inputs = zeileDiv.querySelectorAll('input');
    inputs.forEach(input => {
    input.addEventListener('blur', () => {
      const filled = Array.from(inputs).every(i => i.value);
      if (filled) {
        // 👉 hier speichern in Supabase
        console.log("Zeile gespeichert:", {
          date: inputs[0].value,
          from: inputs[1].value,
          to: inputs[2].value,
          lohn: inputs[3].value
        });

        neueZeileErstellen(); // nächste Zeile automatisch einfügen
      }
    });
  });
}
