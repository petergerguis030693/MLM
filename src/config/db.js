const mysql = require('mysql2/promise');

// Erstelle den Pool im Promise-Modus
const db = mysql.createPool({
  host: '127.0.0.1',         // Verwenden Sie 'localhost' für Verbindungen vom Server selbst
  user: 'root',      // Ihr Benutzername
  password: 'yourpassword', // Ihr Passwort
  database: 'herando_vertrieb'         // Ihr Datenbankname
});

// Teste die Verbindung
db.getConnection()
  .then(connection => {
    console.log('Datenbank erfolgreich verbunden');
    connection.release(); // Verbindung zurück in den Pool geben
  })
  .catch(err => {
    console.error('Fehler bei der Verbindung zur Datenbank:', err);
  });

module.exports = db;
