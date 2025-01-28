const express = require('express');
const app = express();
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Middleware
const bodyParser = require('body-parser'); // Zum Parsen von Anfragekörpern
const cookieParser = require('cookie-parser'); // Zum Auslesen von Cookies
const multer = require('multer'); // Für Datei-Uploads

// Datenbank
const db = require('../config/db'); // Deine DB-Verbindung

// Authentifizierung und Controller
const bcrypt = require('bcrypt'); // Für Passwort-Hashing
const LoginController = require('../controllers/LoginController');
const AuthController = require('../controllers/AuthenticationController');
const AdminControllers = require('../controllers/AdminController');

// Zusätzliche Bibliotheken
const puppeteer = require('puppeteer'); // Für automatisierte Browseraktionen
const nodemailer = require('nodemailer'); // Für E-Mail-Versand
const stripe = require('stripe')('sk_test_51BP6CEL5p3sufeDWIvBGj7pXZX7QHSlroDpLgBkGFX1HMHi2BMVRFSrYU8uOqZXidQrzviC3E3vYaaVKy3Q0H2Ny00EvAFzu3R'); // Für Zahlungsabwicklung

// Speicherort und Konfiguration für Datei-Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/temp');

    // Verzeichnis erstellen, falls es nicht existiert
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`; // Leerzeichen im Dateinamen vermeiden
    cb(null, uniqueName);
  },
});

// Multer-Instanz mit Konfiguration
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Ungültiger Dateityp. Nur PDF, JPEG und PNG sind erlaubt.'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // Maximale Dateigröße: 5 MB
  },
});



// const mw = require('../config/authMiddleware');
require('express-group-routes')

const products = [
  {
    id: 1,
    product_title: 'Lizenzzahlung für Partner',
    price: 2900,
    category_name: 'Partnerprogramm',
    description: 'Ermöglicht die Freischaltung für das Partnerprogramm.',
    title_image: '/assets/images/weblogo.svg',
    gallery_images: '',
  },
  {
    id: 2,
    product_title: 'Yachte',
    price: 1500,
    category_name: 'Luxusartikel',
    description: 'Exklusive Yachten für besondere Anlässe.',
    title_image: '/assets/images/weblogo.svg',
    gallery_images: '',
  },
  {
    id: 3,
    product_title: 'Immobilien',
    price: 1500,
    category_name: 'Investitionen',
    description: 'Attraktive Immobilienangebote für Investoren.',
    title_image: '/assets/images/weblogo.svg',
    gallery_images: '',
  },
  {
    id: 4,
    product_title: 'Autos',
    price: 1500,
    category_name: 'Fahrzeuge',
    description: 'Premium-Fahrzeuge für anspruchsvolle Kunden.',
    title_image: '/assets/images/weblogo.svg',
    gallery_images: '',
  },
  {
    id: 5,
    product_title: 'Uhren',
    price: 1500,
    category_name: 'Luxusuhren',
    description: 'Exklusive Uhren für besondere Momente.',
    title_image: '/assets/images/weblogo.svg',
    gallery_images: '',
  },
];

router.get('/products', (req, res) => {
  res.render('pages/apps/shop/ecom-product-detail', {
    products, // Alle Produkte aus dem Array
    login_user: req.user || 'Gast', // Benutzerinfo
    currentUrl: req.url, // Aktuelle URL
    headerTitle: 'Alle Produkte', // Titel der Seite
  });
});

router.post('/send-product-email', async (req, res) => {
  console.log('Received body:', req.body);
  const { productId, productTitle, firstName, lastName, email } = req.body;

  // PartnerId und PartnerName aus der Session
  const partnerId = req.session.userId || null;
  const partnerName = req.session.partnerName || 'Unbekannter Partner';

  console.log('PartnerId aus Session:', partnerId);
  console.log('PartnerName aus Session:', partnerName);

  try {
    const product = products.find(p => p.id === parseInt(productId));
    if (!product) {
      return res.status(400).json({ success: false, message: 'Produkt nicht gefunden' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(product.price * 100),
      currency: 'eur',
      metadata: { 
        productId, 
        productTitle, 
        partnerId: partnerId || 'unknown', 
        partnerName: partnerName || 'unknown' 
      },
    });

    const paymentLink = `${req.protocol}://${req.get('host')}/checkout/${paymentIntent.client_secret}/${productId}/${partnerId || ''}`;
    console.log('Generierter Payment Link:', paymentLink);

    const transporter = nodemailer.createTransport({
      host: 'smtp.forpsi.com',
      port: 465,
      secure: true,
      auth: {
        user: 'pg@herando.com',
        pass: '!Wert74521',
      },
    });

    const emailTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              .button { 
                  background: #007bff; 
                  color: white !important; 
                  padding: 12px 25px; 
                  text-decoration: none; 
                  border-radius: 5px;
                  display: inline-block;
              }
          </style>
      </head>
      <body>
          <img src="assets/images/weblogo.svg" alt="Herando Logo">
          <p>Sehr geehrte(r) ${firstName} ${lastName},</p>
          <p>Vielen Dank für Ihr Interesse an <strong>${productTitle}</strong>.</p>
          <p>Hier können Sie direkt zur sicheren Zahlung fortfahren:</p>
          <p><a href="${paymentLink}" class="button">Jetzt bezahlen</a></p>
          <p>Partner: ${partnerName} (ID: ${partnerId || 'Nicht verfügbar'})</p>
          <p>Mit besten Grüßen,<br>Ihr Herando-Team</p>
      </body>
      </html>
    `;

    console.log('E-Mail-Daten:', {
      firstName,
      lastName,
      email,
      productTitle,
      paymentLink,
      partnerId,
      partnerName,
    });

    await transporter.sendMail({
      from: '"Herando Shop" <pg@herando.com>',
      to: email,
      subject: `Ihre Bestellung: ${productTitle}`,
      html: emailTemplate,
    });

    console.log('E-Mail erfolgreich gesendet an:', email);
    res.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Senden der E-Mail:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

 // Checkout Seite

router.get('/checkout/:paymentIntent/:productId/:partnerId?', (req, res) => {
  const { paymentIntent, productId, partnerId } = req.params;
  const product = products.find(p => p.id === parseInt(productId));

  res.render('pages/apps/shop/ecom-checkout', {
    product,
    productId,
    stripeKey: 'pk_test_Lv4fEoqrZORuKjAzmevt1WPB',
    paymentIntent,
    partnerId,
    login_user: req.user || 'Gast',
    currentUrl: req.url,
    headerTitle: 'Checkout',
  });
});

router.get('/partner-register-form', (req, res) => {
  res.render('pages/partner-register-form', {
    headerTitle: 'Neuen Partner einladen',
    login_user: req.user, 
    currentUrl: req.url,
  });
});


router.get('/partner-registration', async (req, res) => {
  const { partnerId } = req.query;
  const step = req.query.step || 1;

  try {
    // Prüfen, ob Partner existiert
    const [partner] = await db.query('SELECT * FROM partners WHERE id = ?', [partnerId]);
    if (partner.length === 0) {
      return res.status(404).send('Ungültiger Registrierungs-Link.');
    }

    res.render('pages/partner-registration', {
      step: parseInt(step, 10),
      partnerId,
      sponsorId: partner[0].sponsor_id || 'Keine Sponsor-ID',
      name: partner[0].name || '',
      email: partner[0].email || '',
      headerTitle: 'Partner Regstrierung', 
      login_user: req.user, 
      currentUrl: req.url,
    });
  } catch (error) {
    console.error('Fehler beim Laden der Registrierungsseite:', error);
    res.status(500).send('Es gab ein Problem. Bitte versuchen Sie es später erneut.');
  }
});


// Route für die Registrierung und Datei-Uploads

// Route: Registrierung erfolgreich
router.get('/registration-success', async (req, res) => {
  const { partnerId } = req.query;

  try {
    const [partner] = await db.query('SELECT * FROM partners WHERE id = ?', [partnerId]);
    if (partner.length === 0) {
      return res.status(404).send('Ungültige Partner-ID.');
    }

    res.render('pages/registration-success', {
      name: partner[0].name || '',
      headerTitle: 'Partner Registrierung',
      login_user: req.user || 'Gast',
      currentUrl: req.url,
    });
  } catch (error) {
    console.error('Fehler beim Laden der Erfolgsseite:', error);
    res.status(500).send('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
  }
});


router.use((req, res, next) => {
  res.locals.currentUrl = req.url;
  next();
});

/////////////////////////////////////////////////////////////Testen/////////////////////////////////////////////
router.get('/invite-partner', (req, res) => {
  res.render('pages/invite-partner', {
    headerTitle: 'Partner einladen',
    login_user: req.user || 'Gast',
    currentUrl: req.url,
  });
});

router.post('/send-partner-invite', async (req, res) => {
  const { firstName, lastName, email, sponsorId } = req.body;

  try {
    const [existingUser] = await db.query('SELECT * FROM partners WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).send('Diese E-Mail ist bereits registriert.');
    }

    const [result] = await db.query(
      'INSERT INTO partners (name, email, sponsor_id, license_paid, is_active, registration_verified) VALUES (?, ?, ?, 0, 0, 0)',
      [`${firstName} ${lastName}`, email, sponsorId]
    );

    const partnerId = result.insertId;
    const registrationLink = `${req.protocol}://${req.get('host')}/registration?partnerId=${partnerId}`;

    const transporter = nodemailer.createTransport({
      host: 'smtp.forpsi.com',
      port: 465,
      secure: true,
      auth: {
        user: 'pg@herando.com',
        pass: '!Wert74521',
      },
    });

    await transporter.sendMail({
      from: '"Herando Team" <pg@herando.com>',
      to: email,
      subject: 'Einladung zum Partnerprogramm',
      html: `
        <p>Sehr geehrte(r) ${firstName} ${lastName},</p>
        <p>Bitte schließen Sie die Registrierung über folgenden Link ab:</p>
        <a href="${registrationLink}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Registrierung starten</a>
      `,
    });

    res.status(201).send('Einladungs-E-Mail erfolgreich gesendet.');
  } catch (error) {
    console.error('Fehler beim Senden der Einladung:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

// 2. Registrierung starten
router.get('/registration', async (req, res) => {
  const { partnerId, step } = req.query;

  try {
    const [partner] = await db.query('SELECT * FROM partners WHERE id = ?', [partnerId]);
    if (partner.length === 0) {
      return res.status(404).send('Ungültiger Registrierungslink.');
    }

    res.render('pages/partner-registration', {
      partnerId,
      sponsorId: partner[0].sponsor_id,
      headerTitle: 'Registrierung',
      login_user: req.user || 'Gast',
      currentUrl: req.url,
      step: parseInt(step, 10) || 1,
    });
  } catch (error) {
    console.error('Fehler beim Laden des Formulars:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

// 3. Registrierung abschließen
router.post('/complete-registration', async (req, res) => {
  const { partnerId, username, password, country, firmenname, rechtsform, strasse_hausnummer, plz, ort, umsatzsteuer_id } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'UPDATE partners SET username = ?, password = ?, country = ?, registration_verified = 1 WHERE id = ?',
      [username, hashedPassword, country, partnerId]
    );

    await db.query(
      `INSERT INTO stammdaten 
      (partner_id, firmenname, rechtsform, strasse_hausnummer, plz, ort, umsatzsteuer_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [partnerId, firmenname || null, rechtsform, strasse_hausnummer, plz, ort, umsatzsteuer_id || null]
    );

    // Weiterleitung zu Schritt 2
    res.redirect(`/registration?partnerId=${partnerId}&step=2`);
  } catch (error) {
    console.error('Fehler beim Abschluss der Registrierung:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

// 4. Zustimmungen
router.post('/agreements', async (req, res) => {
  const { partnerId } = req.body;

  try {
    res.redirect(`/registration?partnerId=${partnerId}&step=3`);
  } catch (error) {
    console.error('Fehler beim Bestätigen der Zustimmungen:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

router.post('/next-step', (req, res) => {
  const { partnerId, agreementPrivacy, agreementAGB, agreementRegulation, agreementHouseRules } = req.body;

  try {
    // Überprüfen, ob alle erforderlichen Zustimmungen gegeben wurden
    if (!agreementPrivacy || !agreementAGB || !agreementRegulation || !agreementHouseRules) {
      return res.status(400).send('Alle Zustimmungen müssen bestätigt werden.');
    }

    // Zustimmungen in der Session speichern
    if (!req.session.partnerData) {
      req.session.partnerData = {};
    }

    req.session.partnerData[partnerId] = {
      ...req.session.partnerData[partnerId],
      agreementsAccepted: true, // Zustimmungen zwischenspeichern
    };

    console.log(`Zustimmungen für Partner ${partnerId}:`, req.session.partnerData[partnerId]);

    // Weiterleitung zu Schritt 3
    res.redirect(`/registration?partnerId=${partnerId}&step=3`);
  } catch (error) {
    console.error('Fehler beim Verarbeiten der Zustimmungen:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

// 5. Dokumente hochladen
router.post('/upload-documents', upload.fields([{ name: 'passport' }, { name: 'gewerbe' }, { name: 'meldezettel' }]), async (req, res) => {
  const { partnerId } = req.body;

  try {
    const partnerDir = path.join(__dirname, `../uploads/partners/${partnerId}`);
    if (!fs.existsSync(partnerDir)) {
      fs.mkdirSync(partnerDir, { recursive: true });
    }

    for (const fieldName in req.files) {
      const file = req.files[fieldName][0];
      const tempPath = file.path;
      const filePath = path.join(partnerDir, file.originalname);

      fs.renameSync(tempPath, filePath);

      await db.query(
        'INSERT INTO uploads_partners (partner_id, document_type, file_path) VALUES (?, ?, ?)',
        [partnerId, fieldName, filePath]
      );
    }

    res.redirect(`/registration?partnerId=${partnerId}&step=4`);
  } catch (error) {
    console.error('Fehler beim Hochladen der Dokumente:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

// 6. Zahlung
router.post('/create-checkout-session', async (req, res) => {
  const { partnerId } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Partner-Lizenzgebühr',
            },
            unit_amount: 290000,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/payment-success?session_id={CHECKOUT_SESSION_ID}&partnerId=${partnerId}`,
      cancel_url: `${req.protocol}://${req.get('host')}/payment-cancel`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Fehler beim Erstellen der Checkout-Session:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

// 7. Zahlung erfolgreich
router.get('/payment-success', async (req, res) => {
  const { session_id, partnerId } = req.query; // partnerId entspricht sponsor_id

  try {
    // Stripe Checkout-Session abrufen
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
      // E-Mail und sponsor_id (partnerId) aus der Datenbank abrufen
      const [partner] = await db.query(
        'SELECT email, sponsor_id FROM partners WHERE id = ?',
        [partnerId]
      );

      if (!partner || partner.length === 0) {
        console.error('Ungültige Partner-ID:', partnerId);
        return res.status(404).send('Ungültige Partner-ID.');
      }

      const { email, sponsor_id } = partner[0];

      // Partnerstatus in der `partners`-Tabelle aktualisieren
      await db.query('UPDATE partners SET license_paid = 1, is_active = 1 WHERE id = ?', [partnerId]);

      // Betrag aus der Stripe-Session (in Cent)
      const amountPaid = session.amount_total / 100;

      // Zahlung in der `payments`-Tabelle speichern
      await db.query(
        'INSERT INTO payments (email, partner_id, amount, payment_status, commission_payout) VALUES (?, ?, ?, ?, ?)',
        [email, sponsor_id, amountPaid, 'success', 0] // `sponsor_id` wird hier korrekt verwendet
      );

      // Erfolgsseite rendern
      res.render('pages/payment-success', {
        headerTitle: 'Zahlung erfolgreich',
        login_user: req.user || 'Gast',
        currentUrl: req.url,
      });
    } else {
      // Weiterleitung bei Zahlungsabbruch
      res.redirect('/payment-cancel');
    }
  } catch (error) {
    console.error('Fehler bei der Zahlungsüberprüfung:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

// 8. Zahlung abgebrochen
router.get('/payment-cancel', (req, res) => {
  res.render('pages/payment-cancel', {
    headerTitle: 'Zahlung abgebrochen',
    login_user: req.user || 'Gast',
    currentUrl: req.url,
  });
});












///////////////////////////////////////////////////////////CRM klein/////////////////////////////////////////////
// Kundenübersicht anzeigen
router.get('/customers', async (req, res) => {
  const partnerId = req.session.userId; // Authentifizierter Partner
  try {
    // Nur Kunden anzeigen, die dem aktuellen Partner gehören
    const [customers] = await db.query('SELECT * FROM customers WHERE partner_id = ?', [partnerId]);
    res.render('pages/crm/customers', {
      headerTitle: 'Kundenverwaltung',
      customers,
      login_user: req.user || 'Gast',
      currentUrl: req.url,
    });
  } catch (error) {
    console.error('Fehler beim Laden der Kunden:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

// Neuen Kunden hinzufügen
// Kunden hinzufügen
router.post('/customers/add', async (req, res) => {
  const { name, email, phone, address, status } = req.body;
  const partnerId = req.session.userId; // Authentifizierter Partner
  try {
    await db.query(
      'INSERT INTO customers (partner_id, name, email, phone, address, status) VALUES (?, ?, ?, ?, ?, ?)',
      [partnerId, name, email, phone, address, status || 'lead']
    );
    res.redirect('/customers');
  } catch (error) {
    console.error('Fehler beim Hinzufügen eines Kunden:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

// Kunden bearbeiten
router.post('/customers/edit/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, status } = req.body;
  const partnerId = req.session.userId; // Authentifizierter Partner
  try {
    // Überprüfen, ob der Kunde dem aktuellen Partner gehört
    const [customer] = await db.query('SELECT * FROM customers WHERE id = ? AND partner_id = ?', [id, partnerId]);
    if (customer.length === 0) {
      return res.status(403).send('Keine Berechtigung, diesen Kunden zu bearbeiten.');
    }

    await db.query(
      'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, status = ? WHERE id = ? AND partner_id = ?',
      [name, email, phone, address, status, id, partnerId]
    );
    res.redirect('/customers');
  } catch (error) {
    console.error('Fehler beim Bearbeiten eines Kunden:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

// Kunden löschen
router.post('/customers/delete/:id', async (req, res) => {
  const { id } = req.params;
  const partnerId = req.session.userId; // Authentifizierter Partner
  try {
    // Überprüfen, ob der Kunde dem aktuellen Partner gehört
    const [customer] = await db.query('SELECT * FROM customers WHERE id = ? AND partner_id = ?', [id, partnerId]);
    if (customer.length === 0) {
      return res.status(403).send('Keine Berechtigung, diesen Kunden zu löschen.');
    }

    await db.query('DELETE FROM customers WHERE id = ? AND partner_id = ?', [id, partnerId]);
    res.redirect('/customers');
  } catch (error) {
    console.error('Fehler beim Löschen eines Kunden:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

// ======================= Aufgabenverwaltung =======================

// Aufgabenübersicht anzeigen
router.get('/tasks', async (req, res) => {
  const partnerId = req.session.userId; // Authentifizierter Partner
  try {
    // Aufgaben und Kunden des aktuellen Partners abrufen
    const [tasks] = await db.query(
      `
      SELECT tasks.*, customers.name AS customer_name 
      FROM tasks
      INNER JOIN customers ON tasks.customer_id = customers.id
      WHERE tasks.partner_id = ?
    `,
      [partnerId]
    );

    const [customers] = await db.query('SELECT id, name FROM customers WHERE partner_id = ?', [partnerId]);

    res.render('pages/crm/tasks', {
      headerTitle: 'Aufgabenverwaltung',
      tasks, // Aufgabenliste
      customers, // Kundenliste
      login_user: req.user || 'Gast',
      currentUrl: req.url,
    });
  } catch (error) {
    console.error('Fehler beim Laden der Aufgaben:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

// Neue Aufgabe hinzufügen
router.post('/tasks/add', async (req, res) => {
  const { customer_id, task_description, due_date } = req.body;
  const partnerId = req.session.userId; // Authentifizierter Partner
  try {
    // Überprüfen, ob der Kunde dem aktuellen Partner gehört
    const [customer] = await db.query('SELECT * FROM customers WHERE id = ? AND partner_id = ?', [customer_id, partnerId]);
    if (customer.length === 0) {
      return res.status(403).send('Keine Berechtigung, eine Aufgabe für diesen Kunden hinzuzufügen.');
    }

    await db.query(
      'INSERT INTO tasks (customer_id, partner_id, task_description, due_date) VALUES (?, ?, ?, ?)',
      [customer_id, partnerId, task_description, due_date]
    );
    res.redirect('/tasks');
  } catch (error) {
    console.error('Fehler beim Hinzufügen einer Aufgabe:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

// Aufgabe bearbeiten
router.post('/tasks/edit/:id', async (req, res) => {
  const { id } = req.params;
  const { task_description, due_date, status } = req.body;
  const partnerId = req.session.userId; // Authentifizierter Partner
  try {
    // Überprüfen, ob die Aufgabe dem aktuellen Partner gehört
    const [task] = await db.query('SELECT * FROM tasks WHERE id = ? AND partner_id = ?', [id, partnerId]);
    if (task.length === 0) {
      return res.status(403).send('Keine Berechtigung, diese Aufgabe zu bearbeiten.');
    }

    await db.query(
      'UPDATE tasks SET task_description = ?, due_date = ?, status = ? WHERE id = ? AND partner_id = ?',
      [task_description, due_date, status, id, partnerId]
    );
    res.redirect('/tasks');
  } catch (error) {
    console.error('Fehler beim Bearbeiten einer Aufgabe:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

// Aufgabe löschen
router.post('/tasks/delete/:id', async (req, res) => {
  const { id } = req.params;
  const partnerId = req.session.userId; // Authentifizierter Partner
  try {
    // Überprüfen, ob die Aufgabe dem aktuellen Partner gehört
    const [task] = await db.query('SELECT * FROM tasks WHERE id = ? AND partner_id = ?', [id, partnerId]);
    if (task.length === 0) {
      return res.status(403).send('Keine Berechtigung, diese Aufgabe zu löschen.');
    }

    await db.query('DELETE FROM tasks WHERE id = ? AND partner_id = ?', [id, partnerId]);
    res.redirect('/tasks');
  } catch (error) {
    console.error('Fehler beim Löschen einer Aufgabe:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});









/////////////////////////Upload vom Partner genehmigung///////////////////////////////////
// Route: Alle Dokumente und Partnerdaten anzeigen
router.get('/documents', async (req, res) => {
  try {
    // Lade alle Partnerinformationen
    const [partners] = await db.query('SELECT * FROM partners');

    // Lade alle hochgeladenen Dokumente
    const [documents] = await db.query('SELECT * FROM uploads_partners');

    // Ordne die Dokumente den Partnern zu und passe den Pfad an
    const partnerData = partners.map(partner => {
      const partnerDocs = documents
        .filter(doc => doc.partner_id === partner.id)
        .map(doc => ({
          ...doc,
          // Datei-Pfad ins Partner-Verzeichnis anpassen
          file_path: `/uploads/partners/${partner.id}/${doc.file_path.split('/').pop()}`
        }));
      return { ...partner, documents: partnerDocs };
    });

    // Render die Seite mit den Partner- und Dokumentdaten
    res.render('pages/partner-documents', {
      partners: partnerData,
      login_user: req.user,
      currentUrl: req.url,
      headerTitle: 'Dashboard',
    });
  } catch (error) {
    console.error('Fehler beim Laden der Dokumente:', error);
    res.status(500).send('Fehler beim Laden der Dokumente.');
  }
});

// Route: Dokument genehmigen oder ablehnen
router.post('/documents/action', async (req, res) => {
  const { document_id, action, rejection_reason } = req.body;

  if (!document_id || isNaN(document_id) || !action) {
    return res.status(400).send('Ungültige Eingabedaten.');
  }

  try {
    if (action === 'approve') {
      await db.query(
        'UPDATE uploads_partners SET status = ?, rejection_reason = NULL WHERE id = ?',
        ['approved', document_id]
      );
      console.log(`Dokument ${document_id} wurde genehmigt.`);
    } else if (action === 'reject') {
      if (!rejection_reason) {
        return res.status(400).send('Ein Ablehnungsgrund ist erforderlich.');
      }
      await db.query(
        'UPDATE uploads_partners SET status = ?, rejection_reason = ? WHERE id = ?',
        ['rejected', rejection_reason, document_id]
      );
      console.log(`Dokument ${document_id} wurde abgelehnt.`);
    } else {
      return res.status(400).send('Ungültige Aktion.');
    }

    res.redirect('/documents');
  } catch (error) {
    console.error('Fehler beim Verarbeiten der Aktion:', error);
    res.status(500).send('Fehler beim Verarbeiten der Aktion.');
  }
});

// Route: Neues Dokument hochladen
router.post('/documents/upload', async (req, res) => {
  const { partner_id, document_type, file_path } = req.body;

  if (!partner_id || !document_type || !file_path) {
    return res.status(400).send('Alle Felder sind erforderlich.');
  }

  try {
    const filePath = `/uploads/partners/${partner_id}/${file_path.split('/').pop()}`;
    await db.query(
      'INSERT INTO uploads_partners (partner_id, document_type, file_path, status) VALUES (?, ?, ?, ?)',
      [partner_id, document_type, filePath, 'pending']
    );

    console.log(`Neues Dokument für Partner ${partner_id} hochgeladen.`);
    res.redirect('/documents');
  } catch (error) {
    console.error('Fehler beim Hochladen des Dokuments:', error);
    res.status(500).send('Fehler beim Hochladen des Dokuments.');
  }
});


///////////////////////////////////////////////////////////////////////////////////////


router.get("/index", AdminControllers.DashboardController);
router.get("/dashboard",  AdminControllers.DashboardController);
router.get("/project-page", AdminControllers.ProjectController );
router.get("/contacts", AdminControllers.ContactController );
router.get("/index-2", (req, res) => { res.render("index-2", { login_user: req.user, currentUrl: req.url, headerTitle: 'Dashboard' }); });
router.get("/kanban", (req, res) => { res.render("kanban", { login_user: req.user, currentUrl: req.url, headerTitle: 'Kanban' }); });
router.get("/calendar-page", (req, res) => { res.render("calendar-page", { login_user: req.user, currentUrl: req.url, headerTitle: 'Calendar' }); });
router.get("/message", (req, res) => { res.render("message", { login_user: req.user, currentUrl: req.url, headerTitle: 'Message' }); });
router.get("/post-details", (req, res) => { res.render("pages/apps/post-details", { login_user: req.user, currentUrl: req.url, headerTitle: 'Post Detail' }); });
// Email Manager--
router.get("/email-compose", (req, res) => { res.render("email-compose", { login_user: req.user, currentUrl: req.url, headerTitle: 'Compose' }); });
router.get("/email-inbox", (req, res) => { res.render("email-inbox", { login_user: req.user, currentUrl: req.url, headerTitle: 'Inbox' }); });
router.get("/email-read", (req, res) => { res.render("email-read", { login_user: req.user, currentUrl: req.url, headerTitle: 'Read' }); });
router.get("/app-calender", (req, res) => { res.render("app-calender", { login_user: req.user, currentUrl: req.url, headerTitle: 'Calendar' }); });
// Shop Manager--
router.get("/ecom-product-grid", (req, res) => { res.render("pages/apps/shop/ecom-product-grid", { login_user: req.user, currentUrl: req.url, headerTitle: 'Product Grid' }); });
router.get("/ecom-product-order", (req, res) => { res.render("pages/apps/shop/ecom-product-order", { login_user: req.user, currentUrl: req.url, headerTitle: 'Product Order' }); });
router.get("/ecom-checkout", (req, res) => { res.render("pages/apps/shop/ecom-checkout", { login_user: req.user, currentUrl: req.url, headerTitle: 'Checkout' }); });
router.get("/ecom-invoice", (req, res) => { res.render("pages/apps/shop/ecom-invoice", { login_user: req.user, currentUrl: req.url, headerTitle: 'Invoice' }); });
router.get("/ecom-customers", (req, res) => { res.render("pages/apps/shop/ecom-customers", { login_user: req.user, currentUrl: req.url, headerTitle: 'Customers' }); });


//Nachrichten verschicken
router.get('/messages', async (req, res) => {
  if (!req.session.userId) {
      return res.status(401).send('Bitte logge dich ein, um die Nachrichten zu sehen.');
  }

  try {
      const messages = await db.query(`
          SELECT m.*, p.name AS sender_name 
          FROM messages m
          JOIN partners p ON m.sender_id = p.id
          WHERE m.receiver_id = ?
          ORDER BY m.sent_at DESC
      `, [req.session.userId]);

      // Falls keine Nachrichten vorhanden sind, eine leere Liste zurückgeben
      const messageList = messages.length ? messages : []; 

      res.render('pages/message', {
          login_user: req.session.userId, // Benutzer-ID
          currentUrl: req.url, // Aktuelle URL
          headerTitle: 'Nachrichtenübersicht', // Header-Titel
          messages: messageList, // Nachrichten (leer, wenn keine vorhanden)
      });
  } catch (error) {
      console.error('Fehler beim Abrufen der Nachrichten:', error);
      res.status(500).send('Fehler beim Laden der Nachrichten.');
  }
});

// Nachricht senden
router.post('/api/messages', async (req, res) => {
  const { receiverId, subject, messageContent } = req.body;
  const senderId = req.session.userId; // Aktueller Benutzer als Absender

  try {
    // Überprüfen, ob alle notwendigen Daten vorhanden sind
    if (!senderId || !receiverId || !messageContent) {
      return res.status(400).json({ success: false, message: 'Alle Felder sind erforderlich.' });
    }

    // Nachricht in die Datenbank einfügen
    await db.query(
      `INSERT INTO messages (sender_id, receiver_id, subject, message_content, is_read, sent_at)
       VALUES (?, ?, ?, ?, 0, NOW())`,
      [senderId, receiverId, subject || 'Kein Betreff', messageContent]
    );

    res.json({ success: true, message: 'Nachricht erfolgreich gesendet.' });
  } catch (error) {
    console.error('Fehler beim Senden der Nachricht:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Senden der Nachricht.' });
  }
});

// 2. Nachricht als gelesen markieren
router.post('/messages/read', async (req, res) => {
  const { messageId } = req.body;

  try {
      await db.query('UPDATE messages SET is_read = 1 WHERE id = ?', [messageId]);
      res.json({ success: true });
  } catch (error) {
      console.error('Fehler beim Markieren der Nachricht als gelesen:', error);
      res.status(500).json({ success: false, message: 'Fehler beim Markieren der Nachricht.' });
  }
});

// 3. Neue Nachricht senden
router.post('/messages/send', async (req, res) => {
  const { senderId, receiverId, messageContent } = req.body;

  try {
      await db.query(`
          INSERT INTO messages (sender_id, receiver_id, message_content, is_read)
          VALUES (?, ?, ?, 0)
      `, [senderId, receiverId, messageContent]);

      res.json({ success: true, message: 'Nachricht erfolgreich gesendet.' });
  } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
      res.status(500).json({ success: false, message: 'Fehler beim Senden der Nachricht.' });
  }
});

// API: Direkte Partner abrufen
router.get('/api/partners', async (req, res) => {
  try {
    const userId = req.session.userId; // Aktuell eingeloggter Benutzer

    // Prüfen, ob der Benutzer eingeloggt ist
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Nicht authentifiziert.' });
    }

    // Direkte Partner des Benutzers abrufen
    const [partners] = await db.query(
      `SELECT id, name 
       FROM partners 
       WHERE sponsor_id = ?`, // Sponsor-ID entspricht der User-ID
      [userId]
    );

    res.json({ success: true, partners });
  } catch (error) {
    console.error('Fehler beim Abrufen der direkten Partner:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Partner.' });
  }
});

router.get('/api/messages/received', async (req, res) => {
  try {
    const userId = req.session.userId; // Aktueller Benutzer

    const [messages] = await db.query(`
      SELECT m.id, m.sender_id, m.receiver_id, m.subject, m.message_content, m.is_read, m.sent_at, p.name AS sender_name
      FROM messages m
      JOIN partners p ON m.sender_id = p.id
      WHERE m.receiver_id = ?
      ORDER BY m.sent_at DESC
    `, [userId]);

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Fehler beim Abrufen der erhaltenen Nachrichten:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Nachrichten.' });
  }
});

router.get('/api/messages/sent', async (req, res) => {
  try {
    const userId = req.session.userId; // Aktueller Benutzer

    const [messages] = await db.query(`
      SELECT m.id, m.sender_id, m.receiver_id, m.subject, m.message_content, m.is_read, m.sent_at, p.name AS receiver_name
      FROM messages m
      JOIN partners p ON m.receiver_id = p.id
      WHERE m.sender_id = ?
      ORDER BY m.sent_at DESC
    `, [userId]);

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Fehler beim Abrufen der gesendeten Nachrichten:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Nachrichten.' });
  }
});

// Provisionauszahlung

// Partner: Bankdaten speichern
router.post('/add-bank-details', async (req, res) => {
  const partnerId = req.session.userId; // Partner-ID aus der Session
  const { cardType, cardNumber, expirationDate, cardHolderName } = req.body;

  console.log('--- Debugging Start ---');
  console.log('Partner-ID aus der Session:', partnerId);
  console.log('Request Body:', req.body);
  console.log('--- Debugging Ende ---');

  if (!partnerId) {
    console.error('Fehler: Partner-ID ist nicht in der Session gesetzt.');
    return res.status(400).json({ message: 'Partner-ID nicht gefunden. Bitte erneut einloggen.' });
  }

  try {
    // Überprüfen, ob Kartendaten bereits existieren
    const [existingCard] = await db.query(`SELECT * FROM cards WHERE partner_id = ?`, [partnerId]);

    console.log('Prüfe vorhandene Karten:', existingCard);

    if (existingCard.length > 0) {
      console.error('Kartendaten existieren bereits:', existingCard);
      return res.status(400).json({ message: 'Kartendaten existieren bereits. Bitte aktualisieren Sie diese.' });
    }

    // Kartendaten speichern
    console.log('Füge Karte ein: ', {
      partnerId,
      cardType,
      cardNumber,
      expirationDate,
      cardHolderName,
    });

    const insertCardResult = await db.query(
      `INSERT INTO cards (partner_id, card_type, card_number, expiration_date, card_holder_name) 
      VALUES (?, ?, ?, ?, ?)`,
      [partnerId, cardType, cardNumber, expirationDate, cardHolderName]
    );

    console.log('Erfolgreich Karte eingefügt:', insertCardResult);

    res.json({ message: 'Kartendaten erfolgreich gespeichert.' });
  } catch (error) {
    console.error('Fehler beim Speichern der Kartendaten:', error);
    res.status(500).json({ message: 'Fehler beim Speichern der Kartendaten.' });
  }
});

  // Partner: Auszahlung beantragen
  router.post('/payout', async (req, res) => {
    const userId = req.session.userId; // Partner-ID aus der Session
  
    try {
      console.log('Aktuelle Partner-ID:', userId);
  
      // Provisionen berechnen (nur nicht ausgezahlte Beträge)
      const [provisionsResult] = await db.query(`
        WITH RECURSIVE PartnerTree AS (
          SELECT id, sponsor_id, 1 AS level
          FROM partners
          WHERE id = ?
  
          UNION ALL
  
          SELECT p.id, p.sponsor_id, pt.level + 1
          FROM partners p
          INNER JOIN PartnerTree pt ON p.sponsor_id = pt.id
          WHERE pt.level < 16
        )
        SELECT 
          pt.level,
          SUM(pm.amount) AS totalAmount,
          SUM(
            CASE
              WHEN pt.level = 1 THEN pm.amount * 0.15
              WHEN pt.level = 2 THEN pm.amount * 0.05
              WHEN pt.level = 3 THEN pm.amount * 0.04
              WHEN pt.level = 4 THEN pm.amount * 0.03
              WHEN pt.level = 5 THEN pm.amount * 0.02
              WHEN pt.level <= 16 THEN pm.amount * 0.01
              ELSE 0
            END
          ) AS totalProvision
        FROM PartnerTree pt
        INNER JOIN payments pm ON pt.id = pm.partner_id
        WHERE pm.payment_status = 'success' AND pm.commission_payout = 0
        GROUP BY pt.level
        ORDER BY pt.level;
      `, [userId]);
  
      const totalProvision = provisionsResult.reduce((sum, row) => sum + parseFloat(row.totalProvision || 0), 0);
  
      if (totalProvision <= 0) {
        return res.status(400).json({ message: 'Keine verfügbaren Provisionen zur Auszahlung.' });
      }
  
      console.log('Berechnete Provision:', totalProvision);
  
      // Auszahlung beantragen
      await db.query(
        `INSERT INTO payouts (partner_id, amount, status, requested_at)
        VALUES (?, ?, 'pending', NOW())`,
        [userId, totalProvision]
      );
  
      // Vor dem Update: Logge betroffene Datensätze
      const [rows] = await db.query(
        `SELECT * FROM payments WHERE payment_status = 'success' AND commission_payout = 0 AND partner_id = ?`,
        [userId]
      );
      console.log('Datensätze vor UPDATE:', rows);
  
      // Provisionen als ausgezahlt markieren
      const [result] = await db.query(
        `UPDATE payments
         SET commission_payout = 1
         WHERE payment_status = 'success' AND commission_payout = 0 AND partner_id = ?`,
        [userId]
      );
  
      console.log('Aktualisierte Zeilen:', result.affectedRows);
  
      res.json({ message: `Auszahlung in Höhe von ${totalProvision.toFixed(2)} € erfolgreich beantragt.` });
    } catch (error) {
      console.error('Fehler beim Beantragen der Auszahlung:', error.message);
      res.status(500).json({ message: 'Fehler beim Beantragen der Auszahlung.' });
    }
  });
  
  router.post('/approve-payout', async (req, res) => {
    const { payoutId } = req.body;
  
    try {
      console.log('--- Debugging Start ---');
      console.log('Body:', req.body);
      console.log('--- Debugging Ende ---');
  
      // 1. Prüfen, ob die Auszahlung existiert und ausstehend ist
      const [payoutRecord] = await db.query(
        `SELECT * FROM payouts WHERE id = ? AND status = 'pending'`,
        [payoutId]
      );
  
      if (!payoutRecord.length) {
        return res.status(404).json({ message: 'Auszahlung nicht gefunden oder bereits bearbeitet.' });
      }
  
      const partnerId = payoutRecord[0].partner_id;
      const amount = parseFloat(payoutRecord[0].amount);
  
      console.log('Genehmige Auszahlung für:', { partnerId, amount });
  
      // 2. Statische Bankkonto-Daten für Test
      const staticIban = 'DE89370400440532013000'; // Simulierte IBAN
      const staticName = 'Test Benutzer'; // Simulierter Name des Kontoinhabers
  
      console.log('Statische Testdaten:', { iban: staticIban, name: staticName });
  
      // 3. Erstelle einen Stripe-Connected Account (falls nicht vorhanden)
      const connectedAccount = await stripe.accounts.create({
        type: 'custom',
        country: 'DE',
        email: `partner${partnerId}@example.com`, // Simulierte E-Mail
        business_type: 'individual',
        individual: {
          first_name: 'Test', // Beispiel-Vorname
          last_name: 'Benutzer', // Beispiel-Nachname
          dob: { day: 1, month: 1, year: 1990 }, // Beispiel-Geburtsdatum
          address: {
            line1: 'Musterstraße 1', // Beispiel-Adresse
            postal_code: '10115', // Gültige deutsche Postleitzahl
            city: 'Berlin', // Stadt
            country: 'DE', // Deutschland
          },
        },
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000), // Aktuelles Datum in Sekunden
          ip: req.ip, // IP-Adresse des Nutzers
        },
      });
  
      console.log('Erstellter Connected Account:', connectedAccount.id);
  
      // 4. Erstelle ein Bankkonto-Token
      const bankAccountToken = await stripe.tokens.create({
        bank_account: {
          country: 'DE', // Deutschland
          currency: 'eur',
          account_holder_name: staticName,
          account_holder_type: 'individual', // Oder "company"
          account_number: staticIban, // Simulierte IBAN
        },
      });
  
      console.log('Erstellter Bankkonto-Token:', bankAccountToken.id);
  
      // 5. Verknüpfe den Bankkonto-Token mit dem Connected Account
      const bankAccount = await stripe.accounts.createExternalAccount(
        connectedAccount.id,
        { external_account: bankAccountToken.id }
      );
  
      console.log('Verknüpftes Bankkonto:', bankAccount.id);
  
      // 6. Führe die Auszahlung an den Connected Account durch
      const stripePayout = await stripe.transfers.create({
        amount: Math.round(amount * 100), // Betrag in Cent
        currency: 'eur',
        destination: connectedAccount.id, // Connected Account als Ziel
        description: `Auszahlung für Partner ID ${partnerId}`,
        metadata: {
          partner_id: partnerId,
          payout_id: payoutId,
        },
      });
  
      console.log('Stripe-Auszahlung erfolgreich:', stripePayout.id);
  
      // 7. Datenbank aktualisieren
      await db.query(
        `UPDATE payouts 
         SET status = 'approved', approved_at = NOW(), paid_at = NOW() 
         WHERE id = ?`,
        [payoutId]
      );
  
      res.json({ message: `Testauszahlung in Höhe von ${amount.toFixed(2)} € erfolgreich genehmigt.` });
    } catch (error) {
      console.error('Fehler beim Genehmigen der Auszahlung:', error.message);
      res.status(500).json({ message: 'Fehler beim Genehmigen der Auszahlung.' });
    }
  });
    
  // Admin: Auszahlungsübersicht
  router.get('/payouts', async (req, res) => {
    try {
      const [payouts] = await db.query(`
        SELECT p.id, p.partner_id, p.amount, p.status, p.requested_at, p.approved_at, p.paid_at 
        FROM payouts p
        ORDER BY p.requested_at DESC
      `);
  
      // Konvertiere `amount` in eine Zahl für jede Auszahlung
      const formattedPayouts = payouts.map(payout => ({
        ...payout,
        amount: parseFloat(payout.amount), // Konvertiere amount in eine Zahl
      }));
  
      res.render('pages/admin-payouts', {
        payouts: formattedPayouts,
        login_user: req.user,
        currentUrl: req.url,
        headerTitle: 'Auszahlungsübersicht',
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Auszahlungen:', error.message);
      res.status(500).send('Ein Fehler ist aufgetreten.');
    }
  });
  

  // Partner: Bankdaten-Formular anzeigen
  router.get('/bank-details', (req, res) => {
    res.render('pages/bank-details', {
      login_user: req.user,
      currentUrl: req.url,
      headerTitle: 'Bankdaten eingeben',
      userId: req.session.userId || 0,
    });
  });

/////////////////////////////////////////////////////////////////////////////

//Adminrolle übergeben! 
// Route: Admin-Dashboard anzeigen
router.get('/admin/dashboard', async (req, res) => {
  res.render('pages/admin-dashboard', {
    login_user: req.user,
    currentUrl: req.url,
    headerTitle: 'Admin-Dashboard',
  });
});

// Route: Adminrolle hinzufügen
router.post('/admin/add-role', async (req, res) => {
  const { partnerId, role } = req.body;

  try {
    // Adminrolle hinzufügen
    await db.query(`
      INSERT INTO admin_roles (partnerId, role) VALUES (?, ?)
    `, [partnerId, role]);

    res.json({ 
      message: 'Adminrolle erfolgreich hinzugefügt.' 
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Adminrolle:', error.message);
    res.status(500).json({ 
      message: 'Fehler beim Hinzufügen der Adminrolle.' 
    });
  }
});

// Route: Adminrolle entfernen
router.post('/admin/remove-role', async (req, res) => {
  const { partnerId } = req.body;

  try {
    // Adminrolle entfernen
    await db.query(`
      DELETE FROM admin_roles WHERE partnerId = ?
    `, [partnerId]);

    res.json({ 
      message: 'Adminrolle erfolgreich entfernt.' 
    });
  } catch (error) {
    console.error('Fehler beim Entfernen der Adminrolle:', error.message);
    res.status(500).json({ 
      message: 'Fehler beim Entfernen der Adminrolle.' 
    });
  }
});

// Route: Alle Adminrollen anzeigen (für Superadmins)
router.get('/admin/roles', async (req, res) => {
  if (req.adminRole !== 'superadmin') {
    return res.status(403).send('Zugriff verweigert. Nur Superadmins dürfen dies sehen.');
  }

  try {
    const [roles] = await db.query(`
      SELECT ar.id, ar.partnerId, p.name, ar.role, ar.created_at 
      FROM admin_roles ar
      LEFT JOIN partners p ON ar.partnerId = p.id
      ORDER BY ar.created_at DESC
    `);

    res.render('pages/admin-roles', {
      roles,
      login_user: req.user, // Benutzerinformationen
      currentUrl: req.url, // Aktuelle URL
      headerTitle: 'Adminrollen verwalten', // Header-Titel
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Adminrollen:', error.message);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});






///////////////////////////////Link Versendung an Kunden/////////////////////////////////////////

// Route: Link mit Partner-ID per E-Mail senden
router.get('/email-customer', (req, res) => {
  res.render('pages/email-customer', {
      headerTitle: 'Kunden-E-Mail senden',
      login_user: req.user || 'Gast', 
      currentUrl: req.url, 
  });
});

router.post('/send-customer-link', async (req, res) => {
  const { email, partnerId } = req.body;

  if (!email || !partnerId) {
      return res.status(400).json({ message: 'E-Mail und Partner-ID sind erforderlich.' });
  }

  try {
      // Dynamischen Link erstellen
      const link = `https://www.herando.com/my/adverts/private?partnerId=${partnerId}`;

      // E-Mail-Versand einrichten
      const transporter = nodemailer.createTransport({
          host: 'smtp.forpsi.com',
          port: 465,
          secure: true,
          auth: {
              user: 'pg@herando.com',
              pass: '!Wert74521',
          },
      });

      // E-Mail senden
      await transporter.sendMail({
          from: '"Herando Team" <pg@herando.com>',
          to: email,
          subject: 'Ihr persönlicher Buchungslink',
          html: `
              <p>Sehr geehrte/r Kunde/in,</p>
              <p>Hier ist Ihr persönlicher Buchungslink:</p>
              <p><a href="${link}" target="_blank">${link}</a></p>
              <p>Mit besten Grüßen,<br>Ihr Herando-Team</p>
          `,
      });

      console.log(`E-Mail erfolgreich an ${email} gesendet.`);
      res.status(200).json({ message: 'E-Mail mit Buchungslink erfolgreich gesendet.' });
  } catch (error) {
      console.error('Fehler beim Versenden der E-Mail:', error);
      res.status(500).json({ message: 'Fehler beim Versenden der E-Mail.' });
  }
});

router.post('/api/payment', async (req, res) => {
  const { partnerId, amount, product, paymentStatus } = req.body;

  // Eingabewerte prüfen
  if (!partnerId || !amount || !product || !paymentStatus) {
      return res.status(400).json({ 
          message: 'Alle Felder (partnerId, amount, product, paymentStatus) sind erforderlich.' 
      });
  }

  // Zusätzliche Validierung (optional)
  if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
          message: 'Der Betrag (amount) muss eine positive Zahl sein.' 
      });
  }

  if (!['success', 'failed'].includes(paymentStatus)) {
      return res.status(400).json({ 
          message: 'Der Zahlungsstatus (paymentStatus) muss "success" oder "failed" sein.' 
      });
  }

  try {
      // Zahlungsdaten in der Datenbank speichern
      const query = `
          INSERT INTO payments (partner_id, amount, product, payment_status, created_at) 
          VALUES (?, ?, ?, ?, NOW())
      `;
      await db.query(query, [partnerId, amount, product, paymentStatus]);

      console.log(`✅ Zahlung erfolgreich gespeichert: Partner-ID: ${partnerId}, Betrag: ${amount}, Produkt: ${product}, Status: ${paymentStatus}`);

      // Erfolgsantwort
      res.status(200).json({ 
          message: 'Zahlungsdaten erfolgreich gespeichert.' 
      });
  } catch (error) {
      // Fehlerprotokollierung und Antwort
      console.error('Fehler beim Speichern der Zahlungsdaten:', error);
      res.status(500).json({ 
          message: 'Es ist ein Fehler beim Speichern der Zahlungsdaten aufgetreten.' 
      });
  }
});




// Chart --
router.get("/chart-flot", (req, res) => { res.render("chart-flot", { login_user: req.user, currentUrl: req.url, headerTitle: 'Flot Chart' }); });
router.get("/chart-morris", (req, res) => { res.render("chart-morris", { login_user: req.user, currentUrl: req.url, headerTitle: 'Morris Chart' }); });
router.get("/chart-chartjs", (req, res) => { res.render("chart-chartjs", { login_user: req.user, currentUrl: req.url, headerTitle: 'Chart Chartjs' }); });
router.get("/chart-chartist", (req, res) => { res.render("chart-chartist", { login_user: req.user, currentUrl: req.url, headerTitle: 'Chart Chartist' }); });
router.get("/chart-sparkline", (req, res) => { res.render("chart-sparkline", { login_user: req.user, currentUrl: req.url, headerTitle: 'Chart Sparkline' }); });
router.get("/chart-peity", (req, res) => { res.render("chart-peity", { login_user: req.user, currentUrl: req.url, headerTitle: 'Chart Peity' }); });

// bootstrap --
router.get("/ui-accordion", (req, res) => { res.render("ui-accordion", { login_user: req.user, currentUrl: req.url, headerTitle: 'Accordion' }); });
router.get("/ui-alert", (req, res) => { res.render("ui-alert", { login_user: req.user, currentUrl: req.url, headerTitle: 'Alert' }); });
router.get("/ui-badge", (req, res) => { res.render("ui-badge", { login_user: req.user, currentUrl: req.url, headerTitle: 'Badge' }); });
router.get("/ui-button", (req, res) => { res.render("ui-button", { login_user: req.user, currentUrl: req.url, headerTitle: 'Buttons' }); });
router.get("/ui-modal", (req, res) => { res.render("ui-modal", { login_user: req.user, currentUrl: req.url, headerTitle: 'Modal' }); });
router.get("/ui-button-group", (req, res) => { res.render("ui-button-group", { login_user: req.user, currentUrl: req.url, headerTitle: 'Button Group' }); });
router.get("/ui-list-group", (req, res) => { res.render("ui-list-group", { login_user: req.user, currentUrl: req.url, headerTitle: 'List Group' }); });
router.get("/ui-card", (req, res) => { res.render("ui-card", { login_user: req.user, currentUrl: req.url, headerTitle: 'Card' }); });
router.get("/ui-carousel", (req, res) => { res.render("ui-carousel", { login_user: req.user, currentUrl: req.url, headerTitle: 'Carousel' }); });
router.get("/ui-dropdown", (req, res) => { res.render("ui-dropdown", { login_user: req.user, currentUrl: req.url, headerTitle: 'Dropdown' }); });
router.get("/ui-popover", (req, res) => { res.render("ui-popover", { login_user: req.user, currentUrl: req.url, headerTitle: 'Popover' }); });
router.get("/ui-progressbar", (req, res) => { res.render("ui-progressbar", { login_user: req.user, currentUrl: req.url, headerTitle: 'Progressbar' }) });
router.get("/ui-tab", (req, res) => { res.render("ui-tab", { login_user: req.user, currentUrl: req.url, headerTitle: 'Tab' }); });
router.get("/ui-typography", (req, res) => { res.render("ui-typography", { login_user: req.user, currentUrl: req.url, headerTitle: 'Typography' }); });
router.get("/ui-pagination", (req, res) => { res.render("ui-pagination", { login_user: req.user, currentUrl: req.url, headerTitle: 'Pagination' }) });
router.get("/ui-grid", (req, res) => { res.render("ui-grid", { login_user: req.user, currentUrl: req.url, headerTitle: 'Grid' }); });
router.get("/ui-media-object", (req, res) => { res.render("ui-media-object", { login_user: req.user, currentUrl: req.url, headerTitle: 'Media Object' }); });
router.get("/ui-offcanvas", (req, res) => { res.render("ui-offcanvas", { login_user: req.user, currentUrl: req.url, headerTitle: 'Offcanvas' }); });
router.get("/ui-toasts", (req, res) => { res.render("ui-toasts", { login_user: req.user, currentUrl: req.url, headerTitle: 'Toast' }); });
router.get("/ui-spinners", (req, res) => { res.render("ui-spinners", { login_user: req.user, currentUrl: req.url, headerTitle: 'Spinner' }); });
router.get("/ui-scrollspy", (req, res) => { res.render("ui-scrollspy", { login_user: req.user, currentUrl: req.url, headerTitle: 'ScrollSpy' }); });
router.get("/ui-range-slider", (req, res) => { res.render("ui-range-slider", { login_user: req.user, currentUrl: req.url, headerTitle: 'Range Slider' }); });
router.get("/ui-placeholders", (req, res) => { res.render("ui-placeholder", { login_user: req.user, currentUrl: req.url, headerTitle: 'Placeholder' }); });
router.get("/ui-object-fit", (req, res) => { res.render("ui-object-fit", { login_user: req.user, currentUrl: req.url, headerTitle: 'Object Fit' }); });
router.get("/ui-navbar", (req, res) => { res.render("ui-navbar", { login_user: req.user, currentUrl: req.url, headerTitle: 'Navbar' }); });
router.get("/ui-colors", (req, res) => { res.render("ui-colors", { login_user: req.user, currentUrl: req.url, headerTitle: 'Colors' }); });
router.get("/ui-breadcrumb", (req, res) => { res.render("ui-breadcrumb", { login_user: req.user, currentUrl: req.url, headerTitle: 'Breadcrumb' }); });

// Plugins --
router.get("/uc-select2", (req, res) => { res.render("uc-select2", { login_user: req.user, currentUrl: req.url, headerTitle: 'Select 2' }); });
router.get("/uc-nestable", (req, res) => { res.render("uc-nestable", { login_user: req.user, currentUrl: req.url, headerTitle: 'Nestable' }); });
router.get("/uc-noui-slider", (req, res) => { res.render("uc-noui-slider", { login_user: req.user, currentUrl: req.url, headerTitle: 'Noui Slider' }); });
router.get("/uc-sweetalert", (req, res) => { res.render("uc-sweetalert", { login_user: req.user, currentUrl: req.url, headerTitle: 'Sweet Alert' }); });
router.get("/uc-toastr", (req, res) => { res.render("uc-toastr", { login_user: req.user, currentUrl: req.url, headerTitle: 'Toastr' }); });
router.get("/map-jqvmap", (req, res) => { res.render("map-jqvmap", { login_user: req.user, currentUrl: req.url, headerTitle: 'Jqvmap' }); });
router.get("/uc-lightgallery", (req, res) => { res.render("uc-lightgallery", { login_user: req.user, currentUrl: req.url, headerTitle: 'Light Gallery' }); });

router.get("/widget-basic", (req, res) => { res.render("widget-basic", { login_user: req.user, currentUrl: req.url, headerTitle: 'Widget' }); });
// Forms -- 
router.get("/form-element", (req, res) => { res.render("form-element", { login_user: req.user, currentUrl: req.url, headerTitle: 'Form Element' }); });
router.get("/form-wizard", (req, res) => { res.render("form-wizard", { login_user: req.user, currentUrl: req.url, headerTitle: 'Form Wizard' }); });
router.get("/form-ckeditor", (req, res) => { res.render("form-ckeditor", { login_user: req.user, currentUrl: req.url, headerTitle: 'CkEditor' }); });
router.get("/form-pickers", (req, res) => { res.render("form-pickers", { login_user: req.user, currentUrl: req.url, headerTitle: 'Pickers' }); });
router.get("/form-validation", (req, res) => { res.render("form-validation", { login_user: req.user, currentUrl: req.url, headerTitle: 'Form Validation' }); });
// Table -- 
router.get("/table-bootstrap-basic", (req, res) => { res.render("table-bootstrap-basic", { login_user: req.user, currentUrl: req.url, headerTitle: 'Table Basic' }); });
router.get("/table-datatable-basic", (req, res) => { res.render("table-datatable-basic", { login_user: req.user, currentUrl: req.url, headerTitle: 'DataTable' }); });

router.get("/empty-page", (req, res) => { res.render("empty-page", { login_user: req.user, currentUrl: req.url, headerTitle: 'Empty Page' }); });

const withOutLayoutPageRoute = [
  { name: "page-login" },
  { name: "page-register" },
  { name: "page-forgot-password" },
  { name: "page-lock-screen" },
  { name: "page-error-400" },
  { name: "page-error-403" },
  { name: "page-error-404" },
  { name: "page-error-500" },
  { name: "page-error-503" },
];

// Beispiel einer Login-Route (falls erforderlich)
router.post('/login', async (req, res) => {
  const { userId } = req.body; 
  res.cookie('userId', userId, { httpOnly: true }); // Setze den Cookie
  req.session.userId = userId; 

  res.redirect('/dashboard'); 
});

router.get("/", function (req, res) {
  const token = req.cookies.token;
  if (token) {
    res.redirect('/dashboard');
  } else {
    res.render("pages/authentication/page-login", { layout: false, message: req.query.message || null });
  }
});

router.post('/login-store', LoginController.login);
router.post('/register-store', AuthController.RegisterStore);
router.get('/logout', AuthController.logout);

for (let i = 0; i < withOutLayoutPageRoute.length; i++) {
  router.get(`/authentication/${withOutLayoutPageRoute[i].name}`, function (req, res) {
    const token = req.cookies.token;
    if (token) {
      res.redirect('/dashboard');
    } else {
      const message = req.query.message || null;
      res.render(`authentication/${withOutLayoutPageRoute[i].name}`, { layout: false, message: message });
    }
  });
}

router.get('/dashboard', async (req, res) => {
  const { userId } = req.query; // userId aus den URL-Parametern extrahieren

  if (!userId) {
    return res.redirect('/login'); // Wenn keine userId vorhanden ist, zur Login-Seite weiterleiten
  }

  try {
    const [partner] = await db.query('SELECT username FROM partners WHERE id = ?', [userId]);

    if (partner.length === 0) {
      return res.redirect('/login'); // Zur Login-Seite weiterleiten, wenn der Benutzer nicht gefunden wurde
    }

    res.render('dashboard', {
      layout: 'layouts/layout', // Layout festlegen
      headerTitle: 'Dashboard', // Titel für das Dashboard
      username: partner[0].username, // Benutzername des Partners
      partnerName: partner[0].username,
      adminRole: req.adminRole || null, // Adminrolle wird mit übergeben, falls verfügbar
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Partnerdaten:', error);
    return res.redirect('/login');
  }
});

// Route: Hauptseite mit Benutzerüberprüfung
router.get('/', async (req, res) => {
  const userId = req.cookies.userId; // Lese die Benutzer-ID aus dem Cookie
  console.log('userId aus Cookie:', userId);  

  try {
    if (userId) {
      const [user] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

      if (user.length > 0) {
        console.log(`Benutzer gefunden: ${user[0].username} (ID: ${userId})`);
        return res.render('layouts/layout', {
          currentUrl: req.originalUrl,
          userId: userId,         // Gebe die Benutzer-ID an die View weiter
          username: user[0].username // Gebe den Benutzernamen an die View weiter
        });
      } else {
        console.warn(`Kein Benutzer mit ID ${userId} gefunden.`);
      }
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der Benutzerdaten:', error);
  }

  // Gast oder Fehlerfall
  res.render('layouts/layout', {
    currentUrl: req.originalUrl,
    userId: null,  // Benutzer-ID nicht gefunden
    username: null // Kein Benutzername verfügbar
  });
});

// Route: Login-Handler
router.post('/login', async (req, res) => {
  const { userId } = req.body; // Lese die Benutzer-ID aus dem Formular

  if (!userId) {
    console.error('Keine userId in der Anfrage gefunden.');
    return res.redirect('/login');
  }

  try {
    const [user] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

    if (user.length > 0) {
      console.log(`Login erfolgreich für Benutzer: ${user[0].username} (ID: ${userId})`);
      
      // Cookie setzen
      res.cookie('userId', userId, { httpOnly: true, secure: true }); // Nutze `secure` für HTTPS
      req.session.userId = userId; // Session setzen, falls benötigt

      return res.redirect('/'); // Zurück zur Hauptseite
    } else {
      console.warn(`Login fehlgeschlagen: Benutzer mit ID ${userId} nicht gefunden.`);
      return res.redirect('/login');
    }
  } catch (error) {
    console.error('Fehler beim Login:', error);
    return res.redirect('/login');
  }
});

router.get('/profile', (req, res) => {
  res.render('profile', { layout: 'layouts/layout', headerTitle: 'Profile' });
});

router.get("/login", (req, res) => {
  res.render("pages/authentication/page-login", { layout: false, 
    message: req.query.message || null
   });
});

router.get('/page-register', (req, res) => {
  console.log('Route /page-register wurde aufgerufen');
  res.render('pages/authentication/page-register', { layout: false, message: null });
});

router.get('*', function (req, res) {
  res.render('pages/error/page-error-404', { layout: false });
});


module.exports = router;