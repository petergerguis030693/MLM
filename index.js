const express = require('express');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const multer = require('multer');
const path = require('path');
const https = require("https");
const fs = require('fs');
const session = require('express-session');
const axios = require('axios');
const bcrypt = require('bcrypt'); // Für Passwort-Hashing
const nodemailer = require('nodemailer'); // Für E-Mail-Versand



const db = require('./src/config/db'); // Datenbankverbindung
const routes = require('./src/routes'); // Importiere die Routen



const app = express();
const cors = require('cors');
app.use(cors({
  origin: "https://vertrieb.smarttech-connection.com",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://vertrieb.smarttech-connection.com");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Credentials", "true");

  // OPTIONS-Requests direkt beantworten (Preflight-Anfrage)
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

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


const privateKey = fs.readFileSync("/etc/letsencrypt/live/vertrieb.smarttech-connection.com/privkey.pem", "utf8");
const certificate = fs.readFileSync("/etc/letsencrypt/live/vertrieb.smarttech-connection.com/cert.pem", "utf8");
const ca = fs.readFileSync("/etc/letsencrypt/live/vertrieb.smarttech-connection.com/chain.pem", "utf8");

const credentials = { key: privateKey, cert: certificate, ca: ca };
const server = https.createServer(credentials, app);
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

app.post("/insert-payment", async (req, res) => {
  console.log("📩 Anfrage erhalten auf /insert-payment");

  const { partnerId, customerEmail, amount } = req.body;

  console.log(`📥 Empfangene Daten: Partner-ID: ${partnerId}, Kunde: ${customerEmail}, Betrag: ${amount}`);

  if (!partnerId || !customerEmail || !amount) {
    console.error("❌ FEHLER: Fehlende Daten!", { partnerId, customerEmail, amount });
    return res.status(400).json({ error: "Fehlende Daten!" });
  }

  try {
    console.log("💾 Versuche, Zahlung in die Datenbank zu speichern...");

    // 1️⃣ Zahlung in `payments`-Tabelle einfügen
    const [paymentResult] = await db.execute(
      "INSERT INTO payments (email, partner_id, amount, payment_status) VALUES (?, ?, ?, 'success')",
      [customerEmail, partnerId, amount]
    );

    const paymentId = paymentResult.insertId;
    console.log("✅ Zahlung erfolgreich gespeichert! Payment-ID:", paymentId);

    // 2️⃣ Order-Nummer bestimmen: Nächsthöhere `order_number`, aber mindestens 100002
    const [latestOrder] = await db.query("SELECT MAX(order_number) AS lastOrder FROM orders");
    const nextOrderNumber = latestOrder[0].lastOrder ? latestOrder[0].lastOrder + 1 : 100002;

    // 3️⃣ Bestellung in `orders`-Tabelle speichern
    const [orderResult] = await db.execute(
      "INSERT INTO orders (partner_id, amount, status, order_number, customer_id, product) VALUES (?, ?, 'paid', ?, NULL, ?)",
      [partnerId, amount, nextOrderNumber, 'Kundenprodukt']
    );

    const orderId = orderResult.insertId;
    console.log("🛒 Bestellung erfolgreich gespeichert! Order-ID:", orderId, "Order-Nummer:", nextOrderNumber);


    // 2️⃣ Provisionssätze definieren
    const commissionRates = [0.15, 0.05, 0.04, 0.03, 0.02, 0.01, 0.01]; // Level 0 (eigene Provision) bis Level 6
    for (let i = 7; i <= 16; i++) {
      commissionRates[i] = 0.01; // Level 7–16 bleibt 1%
    }

    // 3️⃣ Partner-Stammbaum ermitteln & Provisionen berechnen
    let currentPartner = partnerId;
    let level = 0; // Start mit Level 0 für eigenen Verdienst

    while (currentPartner && level <= 16) {
      // Provisionssatz auswählen (ab Level 7 immer 1%)
      const rate = commissionRates[level] || 0.01;
      const commissionAmount = amount * rate;

      // Provision speichern (damit auch der erste Partner seine eigene Provision erhält)
      await db.execute(
        "INSERT INTO commissions (payment_id, partner_id, level, commission_amount, payout_status) VALUES (?, ?, ?, ?, 0)",
        [paymentId, currentPartner, level, commissionAmount]
      );

      console.log(`💰 Provision für Partner ${currentPartner} auf Level ${level}: ${commissionAmount} €`);

      // Nächste Ebene hoch (falls vorhanden)
      const [sponsor] = await db.query("SELECT sponsor_id FROM partners WHERE id = ?", [currentPartner]);

      if (sponsor.length === 0 || !sponsor[0].sponsor_id) break;

      currentPartner = sponsor[0].sponsor_id;
      level++;
    }

    res.json({ success: true, message: "Zahlung und Provisionen gespeichert!" });

  } catch (err) {
    console.error("❌ Fehler beim DB-Insert:", err.message);
    console.error("🔍 Fehlerdetails:", err);
    res.status(500).json({ error: "Datenbankfehler", details: err.message });
  }
});

// ========================= Importierte Routen =========================
app.use('/', routes);


// ========================= Server starten =========================

server.listen(3002, () => {
  console.log("✅ Server läuft unter HTTPS auf Port 3002");
});