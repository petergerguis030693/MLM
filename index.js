const express = require('express');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const axios = require('axios');
const bcrypt = require('bcrypt'); // Für Passwort-Hashing
const nodemailer = require('nodemailer'); // Für E-Mail-Versand



const db = require('./src/config/db'); // Datenbankverbindung
const routes = require('./src/routes'); // Importiere die Routen



const app = express();


// ========================= Multer-Konfiguration =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB maximale Dateigröße
}).fields([
  { name: 'passport', maxCount: 1 },
  { name: 'gewerberegister', maxCount: 1 },
  { name: 'meldezettel', maxCount: 1 },
]);

// ========================= Middleware =========================
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
}));

app.use(expressLayouts);
app.set('layout', 'layouts/layout');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
setHeaders: (res, filePath) => {
  console.log(`Serving file: ${filePath}`);
  if (filePath.endsWith('.pdf')) {
    res.setHeader('Content-Type', 'application/pdf');
  } else if (filePath.endsWith('.png')) {
    res.setHeader('Content-Type', 'image/png');
  } else if (filePath.endsWith('.jpeg') || filePath.endsWith('.jpg')) {
    res.setHeader('Content-Type', 'image/jpeg');
  } else {
    res.setHeader('Content-Type', 'application/octet-stream');
  }
}

// Static route for serving files from /uploads
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
      console.log(`Serving file: ${filePath}`);
      // Dynamically set content-type headers based on file extension
      const ext = path.extname(filePath).toLowerCase();
      switch (ext) {
        case '.pdf':
          res.setHeader('Content-Type', 'application/pdf');
          break;
        case '.png':
          res.setHeader('Content-Type', 'image/png');
          break;
        case '.jpg':
        case '.jpeg':
          res.setHeader('Content-Type', 'image/jpeg');
          break;
        default:
          res.setHeader('Content-Type', 'application/octet-stream');
          break;
      }
    },
  })
);



app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});


app.use((req, res, next) => {
  if (req.session.userId) {
    console.log(`Authentifizierter Partner: ${req.session.partnerName} (ID: ${req.session.userId})`);
    res.locals.userId = req.session.userId;
    res.locals.partnerName = req.session.partnerName;
  } else {
    console.log('Kein Partner eingeloggt.');
    res.locals.userId = null;
    res.locals.partnerName = null;
  }
  next();
});



// Debugging-Middleware
app.use((req, res, next) => {
  console.log('--- Debugging Start ---');
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Method:', req.method);
  if (req.body) console.log('Body:', req.body);
  if (req.files) console.log('Files:', req.files);
  console.log('--- Debugging Ende ---');
  next();
});

// ========================= Fehlerbehandlung =========================
app.use((err, req, res, next) => {
  if (err.message === 'Unexpected end of form') {
    console.error('Fehler beim Datei-Upload:', err);
    return res.status(400).send('Unvollständiger Upload. Bitte erneut versuchen.');
  } else if (err.message.includes('File too large')) {
    console.error('Fehler beim Datei-Upload: Datei zu groß.', err);
    return res.status(413).send('Die Datei ist zu groß. Bitte eine kleinere Datei hochladen.');
  }
  console.error('Allgemeiner Fehler:', err);
  res.status(500).send('Ein Fehler ist aufgetreten.');
});

// ========================= Zusätzliche Route (Proxy-Bild) =========================
app.get('/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  try {
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream',
    });
    response.data.pipe(res);
  } catch (error) {
    console.error('Fehler beim Abrufen des Bildes:', error);
    res.status(500).send('Bild konnte nicht geladen werden.');
  }
});

// ========================= Importierte Routen =========================
app.use('/', routes);


// ========================= Server starten =========================
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});