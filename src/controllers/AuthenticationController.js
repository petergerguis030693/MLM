const db = require('../config/db');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

// Multer Setup für Datei-Upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/'); // Zielordner für Uploads
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Einzigartiger Dateiname
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Nur Bilder (JPEG, PNG, GIF) sind erlaubt!'), false);
  }
};

// Multer Konfiguration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } 
});

// Registrierungsfunktion
const RegisterStore = [
  upload.single('logo'), // Middleware für Datei-Upload
  async (req, res) => {
    try {
      const {
        username,
        email,
        company,
        vatid,
        firstname,
        lastname,
        gender,
        birthdate,
        phone,
        package,
        password,
        confirm_password,
        address,
        plz
      } = req.body;

      // Eingabevalidierung
      if (!username || !email || !password || !confirm_password) {
        return res.render('pages/authentication/page-register', {
          layout: false,
          message: { status: false, message: 'Alle Pflichtfelder ausfüllen!' }
        });
      }

      if (password.length < 6) {
        return res.render('pages/authentication/page-register', {
          layout: false,
          message: { status: false, message: 'Passwort muss länger als 6 Zeichen sein.' }
        });
      }

      if (password !== confirm_password) {
        return res.render('pages/authentication/page-register', {
          layout: false,
          message: { status: false, message: 'Passwörter stimmen nicht überein.' }
        });
      }

      // Prüfen, ob Benutzername oder E-Mail bereits existieren
      const [existingUser] = await db.query(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, email]
      );
      if (existingUser.length > 0) {
        const message =
          existingUser[0].username === username
            ? 'Benutzername ist bereits vergeben.'
            : 'Die E-Mail-Adresse wird bereits verwendet.';
        return res.render('pages/authentication/page-register', {
          layout: false,
          message: { status: false, message }
        });
      }

      // Passwort verschlüsseln
      const hashedPassword = await bcrypt.hash(password, 10);

      // Datei-Upload prüfen
      const logo = req.file ? `/uploads/${req.file.filename}` : null;

      // Benutzer in die Datenbank einfügen
      const query = `
        INSERT INTO users (username, email, company, address, plz, vatid, firstname, lastname, gender, birthdate, phone, package, password, logo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await db.query(query, [
        username,
        email,
        company || '',
        address || '',
        plz || '',
        vatid || '',
        firstname || '',
        lastname || '',
        gender || '',
        birthdate || null,
        phone || '',
        package || 'light',
        hashedPassword,
        logo
      ]);

      // Erfolgreiche Registrierung
      res.render('pages/authentication/page-register', {
        layout: false,
        message: { status: true, message: 'Registrierung erfolgreich! Weiterleitung zum Login...' },
        redirect: true
      });
    } catch (error) {
      console.error('Fehler bei der Registrierung:', error);

      // Fehlerbehandlung
      res.render('pages/authentication/page-register', {
        layout: false,
        message: { status: false, message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' }
      });
    }
  }
];

// Logout-Funktion
const logout = async (req, res) => {
  try {
    res.clearCookie('token'); // Lösche das Cookie
    return res.redirect('/');
  } catch (error) {
    console.error('Fehler beim Logout:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
};

module.exports = { RegisterStore, logout };
