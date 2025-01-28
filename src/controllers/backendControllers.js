const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app); // Zuerst den Server initialisieren
const io = socketIo(server); // WebSocket nach der Server-Initialisierung erstellen
//const { getRandomInt } = require('../utils/helpers'); // Helferfunktion für zufällige Zahlen



async function saveCategory(req, res) {
  const { name, beschreibung } = req.body;
  try {
    const query = `INSERT INTO kategorien (name, beschreibung) VALUES (?, ?)`;
    await db.query(query, [name, beschreibung]);

    // Erfolgreich hinzugefügt - Weiterleitung mit Erfolgsmeldung
    const [categories] = await db.query('SELECT * FROM kategorien');
    res.render('pages/cms/blog-category', {
      categories,
      message: { status: true, message: 'Kategorie erfolgreich hinzugefügt!' },
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Kategorie:', error);
    res.status(500).send('Fehler beim Hinzufügen der Kategorie');
  }
}

async function getCategories(req, res) {
  try {
    const [categories] = await db.query('SELECT * FROM kategorien');
    res.render('pages/cms/blog-category', {
      categories,
      message: null,
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Kategorien:', error);
    res.status(500).send('Fehler beim Abrufen der Kategorien');
  }
}

async function getCategoriesContent(req, res) {
  try {
    // Kategorien aus der Datenbank abrufen
    const [categories] = await db.query('SELECT * FROM kategorien');

    // Kategorien an die View übergeben
    res.render('pages/cms/content-add', {
      categories,  // Übergabe der Kategorien an die View
      message: null,
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Kategorien:', error);
    res.status(500).send('Fehler beim Abrufen der Kategorien');
  }
}

async function deleteCategory(req, res) {
  const { id } = req.body;
  try {
    const query = `DELETE FROM kategorien WHERE id = ?`;
    await db.query(query, [id]);

    const [categories] = await db.query('SELECT * FROM kategorien');
    res.render('pages/cms/blog-category', {
      categories,
      message: { status: true, message: 'Kategorie erfolgreich gelöscht!' },
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Kategorie:', error);
    res.render('pages/cms/blog-category', {
      categories: [],
      message: { status: false, message: 'Fehler beim Löschen der Kategorie.' },
    });
  }
}

async function editCategory(req, res) {
  const { id, name, beschreibung } = req.body;
  try {
    const query = `UPDATE kategorien SET name = ?, beschreibung = ? WHERE id = ?`;
    await db.query(query, [name, beschreibung, id]);
    res.redirect('/blog-category'); // Nach dem Update zurück zur Kategorieübersicht
  } catch (error) {
    console.error('Fehler beim Bearbeiten der Kategorie:', error);
    res.redirect('/blog-category?error=true'); // Bei Fehler auf die Übersicht weiterleiten
  }
}

const getUnterkategorien = async (req, res) => {
  try {
    const unterkategorienQuery = `
      SELECT 
        uk.id AS unterkategorie_id,
        uk.name AS unterkategorie_name,
        uk.beschreibung,
        uk.kategorie_id,
        k.name AS hauptkategorie_name
      FROM 
        unterkategorien uk
      JOIN 
        kategorien k ON uk.kategorie_id = k.id
      ORDER BY 
        k.name, uk.name;
    `;
    const kategorienQuery = `
      SELECT 
        id AS kategorie_id, 
        name AS kategorie_name 
      FROM 
        kategorien
      ORDER BY 
        name;
    `;
    const [unterkategorienRows] = await db.query(unterkategorienQuery);
    const [kategorienRows] = await db.query(kategorienQuery);

    res.render('pages/cms/unterkategorien', {
      unterkategorien: unterkategorienRows,
      kategorien: kategorienRows,
      message: null,
      login_user: req.user,
      currentUrl: req.url,
      headerTitle: 'Unterkategorien Hinzufügen',
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Unterkategorien:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
};

const insertUnterkategorie = async (req, res) => {
  const { name, beschreibung, kategorie_id } = req.body;

  if (!name || !kategorie_id) {
    return res.status(400).json({ error: 'Name und Kategorie-ID sind erforderlich.' });
  }

  try {
    await db.query(
      'INSERT INTO unterkategorien (name, beschreibung, kategorie_id) VALUES (?, ?, ?)',
      [name, beschreibung, kategorie_id]
    );
    res.redirect('/unterkategorien');
  } catch (error) {
    console.error('Fehler beim Einfügen der Unterkategorie:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten.' });
  }
};

const updateUnterkategorie = async (req, res) => {
  const { id, name, beschreibung, kategorie_id } = req.body;

  if (!id || !name || !kategorie_id) {
    return res.status(400).json({ error: 'ID, Name und Kategorie-ID sind erforderlich.' });
  }

  try {
    await db.query(
      'UPDATE unterkategorien SET name = ?, beschreibung = ?, kategorie_id = ? WHERE id = ?',
      [name, beschreibung, kategorie_id, id]
    );
    res.redirect('/unterkategorien');
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Unterkategorie:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten.' });
  }
};

const deleteUnterkategorie = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM unterkategorien WHERE id = ?', [id]);
    res.redirect('/unterkategorien'); 
    } catch (error) {
    console.error('Fehler beim Löschen der Unterkategorie:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten.' });
  }
};

async function addContent(req, res) {
  try {
    const user_id = req.cookies.userId; // Cookie auslesen
    if (!user_id) {
      return res.status(400).send({ success: false, message: 'Benutzer nicht eingeloggt.' });
    }

    const {
      title: titel, beschreibung, preis, seo_title, seo_keywords,
      seo_description, status, kategorie_id
    } = req.body;

    // Validierung: Titel und Kategorie erforderlich
    if (!titel || titel.trim() === '') {
      return res.status(400).send({ success: false, message: 'Titel darf nicht leer sein.' });
    }
    if (!kategorie_id) {
      return res.status(400).send({ success: false, message: 'Kategorie muss ausgewählt werden.' });
    }

    // Titelbild speichern
    const titelbild = req.files?.titelbild;
    const titelbild_url = titelbild
      ? `/uploads/${Date.now()}_${titelbild.name}`
      : null;

    if (titelbild) {
      await titelbild.mv(path.join(__dirname, '../../public', titelbild_url));
    }

    // Eintrag in Tabelle `inserate`
    const [result] = await db.query(`
      INSERT INTO inserate (
        user_id, kategorie_id, titel, beschreibung, preis, 
        seo_title, seo_keywords, seo_description, titelbild_url, status
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user_id,
      kategorie_id,
      titel,
      beschreibung || '',
      preis || 0,
      seo_title || '',
      seo_keywords || '',
      seo_description || '',
      titelbild_url,
      status || 0,
    ]);

    const inserat_id = result.insertId;

    // Galeriebilder speichern
    const galeriebilder = req.files?.galeriebilder;
    if (galeriebilder) {
      const bilderArray = Array.isArray(galeriebilder) ? galeriebilder : [galeriebilder];
      for (const bild of bilderArray) {
        const bild_url = `/uploads/${Date.now()}_${bild.name}`;
        await bild.mv(path.join(__dirname, '../../public', bild_url));

        await db.query(`
          INSERT INTO bilder (inserat_id, bild_url) 
          VALUES (?, ?)
        `, [inserat_id, bild_url]);
      }
    }

    // Kategorie-spezifische Details speichern
    switch (parseInt(kategorie_id, 10)) {
      case 2: // Uhren
        const { marke, modell, material, zustand, herstellungsjahr } = req.body;
        await db.query(`
          INSERT INTO kategorie_details (
            kategorie_id, inserat_id, marke, modell, material, zustand, herstellungsjahr
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          kategorie_id,
          inserat_id,
          marke || '',
          modell || '',
          material || '',
          zustand || null,
          herstellungsjahr || null,
        ]);
        break;

      case 11: // Boote
      case 12: // Yacht
        const { bootstyp, laenge, breite, tiefgang, baujahr_boot, motorleistung, ausstattung } = req.body;
        await db.query(`
          INSERT INTO kategorie_details (
            kategorie_id, inserat_id, bootstyp, laenge, breite, tiefgang, baujahr_boot, motorleistung, ausstattung
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          kategorie_id,
          inserat_id,
          bootstyp || null,
          laenge || null,
          breite || null,
          tiefgang || null,
          baujahr_boot || null,
          motorleistung || null,
          ausstattung || '',
        ]);
        break;

      case 13: // Immobilien
        const { immobilien_art, flaeche, zimmeranzahl, baujahr, lagebeschreibung } = req.body;
        await db.query(`
          INSERT INTO kategorie_details (
            kategorie_id, inserat_id, immobilien_art, flaeche, zimmeranzahl, baujahr, lagebeschreibung
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          kategorie_id,
          inserat_id,
          immobilien_art || null,
          flaeche || null,
          zimmeranzahl || null,
          baujahr || null,
          lagebeschreibung || '',
        ]);
        break;

      case 14: // Investitionen
        const { typ_des_investments, rendite, stille_beteiligung, branche, interne_referenz, unternehmen_seit, kapitalbedarf, mittelverwendung, beteiligungsform, abrechnungsmodus } = req.body;
        await db.query(`
          INSERT INTO kategorie_details (
            kategorie_id, inserat_id, typ_des_investments, rendite, stille_beteiligung, branche, interne_referenz, unternehmen_seit, kapitalbedarf, mittelverwendung, beteiligungsform, abrechnungsmodus
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          kategorie_id,
          inserat_id,
          typ_des_investments || '',
          rendite || null,
          stille_beteiligung || null,
          branche || '',
          interne_referenz || '',
          unternehmen_seit || null,
          kapitalbedarf || null,
          mittelverwendung || '',
          beteiligungsform || '',
          abrechnungsmodus || '',
        ]);
        break;

      default:
        console.warn('Unbekannte Kategorie-ID:', kategorie_id);
    }

    // Weiterleitung zur Inhaltsseite
    res.redirect('/content');
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Inhalts:', error);
    res.status(500).send({ success: false, message: 'Fehler beim Hinzufügen des Inhalts.' });
  }
}

async function getContent(req, res) {
  try {
    const [content] = await db.query(`
      SELECT 
          i.id AS inserat_id,
          i.titel,
          i.beschreibung,
          i.preis,
          i.titelbild_url,
          i.status,
          CAST(i.status AS CHAR) AS status, 
          GROUP_CONCAT(b.bild_url) AS galeriebilder,
          i.erstellt_am
      FROM 
          inserate i
      LEFT JOIN 
          bilder b ON i.id = b.inserat_id
      WHERE status IN ('sichtbar', 'unsichtbar')
      GROUP BY 
          i.id
      ORDER BY 
          i.erstellt_am DESC;
    `);

    console.log("Content:", JSON.stringify(content, null, 2)); // Debugging
    res.render('pages/cms/content', {
      login_user: req.user,
      content,
      currentUrl: req.url,
      headerTitle: 'Content'
    });
  } catch (error) {
    console.error("Fehler beim Abrufen der Inhalte:", error);
    res.status(500).send("Fehler beim Abrufen der Inhalte");
  }
}

const getProfile = async (req, res) => {
  try {
    const userId = req.cookies.userId;
    console.log('userId aus Cookie:', userId);

    if (!userId) {
      console.error('Benutzer-ID fehlt im Cookie. Umleitung zur Login-Seite.');
      return res.redirect('/login');
    }

    // Benutzerdaten aus `users` abrufen
    const [user] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    console.log('Benutzer aus users:', user);

    if (!user || user.length === 0) {
      console.error('Kein Benutzer in der Tabelle `users` gefunden. Umleitung zur Login-Seite.');
      return res.redirect('/login');
    }

    // Firmendaten aus `firmenkunde` abrufen
    const [firmenkunde] = await db.query('SELECT * FROM firmenkunde WHERE user_id = ?', [userId]);
    console.log('Eintrag aus firmenkunde:', firmenkunde);

    if (!firmenkunde || firmenkunde.length === 0) {
      console.error('Kein Benutzer in der Tabelle `firmenkunde` gefunden. Umleitung zur Login-Seite.');
      return res.redirect('/login');
    }

    // Profildaten an die View übergeben
    res.render('pages/apps/edit-profile', {
      company_name: firmenkunde[0].company || '',
      vat_number: firmenkunde[0].vatid || '',
      company_number: firmenkunde[0].company_number || '',
      industry: firmenkunde[0].industry || '',
      service: firmenkunde[0].service || '',
      founding_date: firmenkunde[0].founding_date || '',
      phone_number: firmenkunde[0].phone || '',
      email: firmenkunde[0].email || '',
      address: firmenkunde[0].address || '',
      country: firmenkunde[0].country || '',
      postal_code: firmenkunde[0].plz || '',
      logo: firmenkunde[0].logo ? `/uploads/${firmenkunde[0].logo}` : null,
      message: null,
      login_user: user[0].username,
      currentUrl: req.url,
      headerTitle: 'Edit Profile',
    });
  } catch (error) {
    console.error('Fehler beim Laden des Profils:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.cookies.userId;

    if (!userId) {
      console.error('Benutzer-ID fehlt. Umleitung zur Login-Seite.');
      return res.redirect('/login');
    }

    const {
      company_name,
      vat_number,
      company_number,
      industry,
      service,
      founding_date,
      phone_number,
      email,
      address,
      country,
      postal_code,
    } = req.body;

    // SQL-Query für das Update
    const query = `
      UPDATE firmenkunde SET 
        company = ?, 
        vatid = ?, 
        company_number = ?, 
        industry = ?, 
        service = ?, 
        founding_date = ?, 
        phone = ?, 
        email = ?, 
        address = ?, 
        country = ?, 
        plz = ?
      WHERE user_id = ?
    `;

    const params = [
      company_name || '',
      vat_number || '',
      company_number || '',
      industry || '',
      service || '',
      founding_date || null,
      phone_number || '',
      email || '',
      address || '',
      country || '',
      postal_code || '',
      userId,
    ];

    // Datenbank-Update ausführen
    await db.query(query, params);

    res.render('pages/apps/edit-profile', {
      message: { status: true, message: 'Profil erfolgreich aktualisiert!' },
      company_name,
      vat_number,
      company_number,
      industry,
      service,
      founding_date,
      phone_number,
      email,
      address,
      country,
      postal_code,
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Profils:', error);
    res.render('pages/apps/edit-profile', {
      message: { status: false, message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.' },
    });
  }
};

const getInserate = async (req, res) => {
  try {
    const selectedCategory = req.query.kategorie || null; // Kategorie-Filter aus den Query-Parametern
    let query = `
      SELECT 
          i.id AS inserat_id,
          i.titel,
          i.beschreibung,
          i.preis,
          i.titelbild_url,
          i.erstellt_am,
          u.username AS autor,
          k.name AS kategorie_name,
          b.bild_url AS bild_url,
          w.id AS werbeanzeige_id,
          w.werbe_typ,
          w.startdatum,
          w.enddatum,
          w.position,
          w.aktiv AS werbeanzeige_aktiv
      FROM 
          inserate i
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN kategorien k ON i.kategorie_id = k.id
      LEFT JOIN bilder b ON i.id = b.inserat_id
      LEFT JOIN werbeanzeigen w ON i.id = w.inserat_id
      WHERE 
          i.pruefung = 0
          AND i.erstellt_am <= CURDATE()
    `;

    const queryParams = [];
    if (selectedCategory) {
      query += ` AND k.name = ?`; // Abfrage anpassen
      queryParams.push(selectedCategory); // Kategorie-Parameter hinzufügen
    }

    query += ` ORDER BY i.erstellt_am DESC;`;

    // SQL-Abfrage ausführen
    const [rows] = await db.query(query, queryParams);

    // Gruppiere Bilder nach Inserat
    const inserate = rows.reduce((acc, row) => {
      const inserat = acc.find(i => i.inserat_id === row.inserat_id);
      if (inserat) {
        if (row.bild_url) {
          inserat.bilder.push(row.bild_url);
        }
        if (row.werbeanzeige_id) {
          inserat.werbeanzeige = {
            werbeanzeige_id: row.werbeanzeige_id,
            werbe_typ: row.werbe_typ,
            startdatum: row.startdatum,
            enddatum: row.enddatum,
            aktiv: row.werbeanzeige_aktiv,
            position: row.position,
          };
        }
      } else {
        acc.push({
          inserat_id: row.inserat_id,
          titel: row.titel,
          beschreibung: row.beschreibung,
          preis: row.preis,
          erstellt_am: row.erstellt_am,
          titelbild_url: row.titelbild_url,
          autor: row.autor,
          kategorie_name: row.kategorie_name,
          werbeanzeige: row.werbeanzeige_id
            ? {
              werbeanzeige_id: row.werbeanzeige_id,
              werbe_typ: row.werbe_typ,
              startdatum: row.startdatum,
              enddatum: row.enddatum,
              aktiv: row.werbeanzeige_aktiv,
              position: row.position,
            }
            : null,
          bilder: row.bild_url ? [row.bild_url] : [],
        });
      }
      return acc;
    }, []);

    res.render('pages/apps/shop/ecom-product-list', {
      inserate,
      currentUrl: req.url,
      headerTitle: 'Produkte Liste',
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Inserate:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
};

const addBlogCategory = async (req, res) => {
  const { name, slug, beschreibung } = req.body;

  try {
    const query = 'INSERT INTO blog_kategorie (name, slug, beschreibung) VALUES (?, ?, ?)';
    await db.query(query, [name, slug, beschreibung || null]);
    res.redirect('/add-categorie-blog');
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Blog-Kategorie:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
};

const getBlogCategories = async (req, res) => {
  try {
    const query = `SELECT id, name, slug, beschreibung, erstellt_am FROM blog_kategorie`;
    const [categories] = await db.query(query);

    if (!categories || categories.length === 0) {
      console.error("Keine Blog-Kategorien gefunden.");
      return res.render("pages/cms/add-categorie-blog", {
        categories: [],
        login_user: req.user,
        currentUrl: req.url,
        headerTitle: "Add Blog",
      });
    }

    res.render("pages/cms/add-categorie-blog", {
      categories,
      login_user: req.user,
      currentUrl: req.url,
      headerTitle: "Add Blog",
    });
  } catch (error) {
    console.error("Fehler beim Abrufen der Blog-Kategorien:", error.message);
    res.status(500).send("Ein Fehler ist aufgetreten.");
  }
};

const addBlogPost = async (req, res) => {
  try {
    console.log('--- Debugging Anfrage ---');
    console.log('Headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    console.log('--- Ende Debugging ---');

    if (!req.files || !req.files.image) {
      return res.status(400).send('Keine Datei hochgeladen.');
    }

    const image = req.files.image;
    const uploadPath = path.join(process.cwd(), 'public/uploads', image.name);

    // Datei speichern
    await image.mv(uploadPath);

    console.log('Datei erfolgreich hochgeladen:', image.name);

    const { title, description, blog_category_id } = req.body;

    if (!title || !description || !blog_category_id) {
      return res.status(400).send('Alle erforderlichen Felder müssen ausgefüllt werden.');
    }

    const imagePath = `/uploads/${image.name}`;

    const query = `
      INSERT INTO blog_posts (title, description, image_url, blog_category_id) 
      VALUES (?, ?, ?, ?)
    `;
    const values = [title, description, imagePath, blog_category_id];

    const [result] = await db.query(query, values);

    console.log('Blog-Post erfolgreich in der Datenbank gespeichert mit ID:', result.insertId);

    res.redirect('/add-categorie-blog'); // Erfolgreich weiterleiten
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Blog-Posts:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
};

const getAddBlogPage = (req, res) => {
  try {
    res.render('pages/cms/add-blog', {
      login_user: res.locals.username,
      currentUrl: req.url,
      headerTitle: 'Add Blog',
    });
  } catch (error) {
    console.error('Fehler beim Laden der Add-Blog-Seite:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
};

const getBlogs = async (req, res) => {
  try {
    const [blogs] = await db.query(`
      SELECT id, title, 
             DATE_FORMAT(created_at, '%d %b, %Y') AS created_at 
      FROM blog_posts 
      ORDER BY created_at DESC
    `);

    res.render('pages/cms/cms-blog', {
      login_user: req.user,
      currentUrl: req.url,
      headerTitle: 'Blog',
      blogs,
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Blogs:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
};

const deleteContent = async (req, res) => {
  const contentId = req.params.id;

  try {
    // Überprüfen, ob die ID vorhanden ist
    const [result] = await db.query('SELECT * FROM inserate WHERE id = ?', [contentId]);
    if (result.length === 0) {
      return res.status(404).send({ success: false, message: 'Inhalt nicht gefunden.' });
    }

    // Inhalt löschen
    await db.query('DELETE FROM inserate WHERE id = ?', [contentId]);
    console.log(`Inhalt mit ID ${contentId} wurde gelöscht.`);

    // Nach dem Löschen zur Inhaltsliste weiterleiten
    res.redirect('/content');
  } catch (error) {
    console.error('Fehler beim Löschen des Inhalts:', error);
    res.status(500).send({ success: false, message: 'Fehler beim Löschen des Inhalts.' });
  }
};

const editContentForm = async (req, res) => {
  const contentId = req.params.id;

  try {
    const [content] = await db.query(
      `
      SELECT i.id AS inserat_id, i.titel, i.beschreibung, i.preis, i.titelbild_url, 
             i.kategorie_id, k.name AS kategorie_name
      FROM inserate i
      JOIN kategorien k ON i.kategorie_id = k.id
      WHERE i.id = ?
      `,
      [contentId]
    );

    const [categories] = await db.query('SELECT id, name FROM kategorien');

    if (content.length === 0) {
      return res.status(404).send('Inhalt nicht gefunden.');
    }

    res.render('pages/cms/content', {
      content: content[0],
      categories,
      headerTitle: 'Inhalt bearbeiten',
    });
  } catch (error) {
    console.error('Fehler beim Laden des Bearbeitungsformulars:', error);
    res.status(500).send('Fehler beim Laden des Bearbeitungsformulars.');
  }
};

const updateContent = async (req, res) => {
  const { id, title, description, price, category } = req.body;
  const file = req.files?.image;

  try {
    let imageUrl;
    if (file) {
      imageUrl = `/uploads/${Date.now()}_${file.name}`;
      await file.mv(path.join(__dirname, '../../public', imageUrl));
    }

    const [result] = await db.query(
      `
      UPDATE inserate
      SET titel = ?, beschreibung = ?, preis = ?, kategorie_id = ?, 
          titelbild_url = COALESCE(?, titelbild_url), pruefung = 0, status='wartend'
      WHERE id = ?
      `,
      [title, description, price, category, imageUrl, id]
    );
    console.log('Update-Ergebnis:', result);
    res.redirect('/content'); // Zurück zur Content-Seite
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Inhalts:', error);
    res.status(500).send('Fehler beim Aktualisieren des Inhalts.');
  }
};

async function setContentVisible(req, res) {
  const contentId = req.params.id;

  console.log('Empfangene Content-ID:', contentId); // Debugging-Log

  if (!contentId || isNaN(contentId)) {
    console.error('Ungültige Content-ID:', contentId);
    return res.status(400).send('Ungültige Content-ID.');
  }

  try {
    const [result] = await db.query('SELECT id FROM inserate WHERE id = ?', [contentId]);

    if (result.length === 0) {
      console.error('Inserat nicht gefunden:', contentId);
      return res.status(404).send('Inserat nicht gefunden.');
    }

    await db.query(
      `UPDATE inserate SET status = 'sichtbar', admin_freigabe = 1, pruefung = 1  WHERE id = ?`,
      [contentId]
    );

    console.log(`Content mit ID ${contentId} wurde sichtbar gemacht.`);
    res.redirect('/ecom-product-list'); // Zurück zur Content-Seite
  } catch (error) {
    console.error('Fehler beim Setzen auf "Sichtbar":', error);
    res.status(500).send('Fehler beim Setzen auf "Sichtbar".');
  }
}

async function setContentInvisible(req, res) {
  const contentId = req.params.id; // Die ID wird direkt aus der URL geholt
  const { reason } = req.body;

  if (!contentId || isNaN(contentId)) {
    console.error('Ungültige Content-ID:', contentId);
    return res.status(400).send('Ungültige Content-ID.');
  }

  try {
    const [result] = await db.query('SELECT id FROM inserate WHERE id = ?', [contentId]);

    if (result.length === 0) {
      console.error('Inserat nicht gefunden:', contentId);
      return res.status(404).send('Inserat nicht gefunden.');
    }

    await db.query(
      `UPDATE inserate SET status = 'unsichtbar', admin_freigabe = 0, pruefung = 1 WHERE id = ?`,
      [contentId]
    );

    await db.query(
      `INSERT INTO unsichtbar_gruende (inserat_id, grund) VALUES (?, ?)`,
      [contentId, reason]
    );

    res.redirect('/ecom-product-list'); // Zurück zur Content-Seite
  } catch (error) {
    console.error('Fehler beim Setzen auf "Nicht sichtbar":', error);
    res.status(500).send('Fehler beim Setzen auf "Nicht sichtbar".');
  }
}

async function getInactiveContent(req, res) {
  try {
    const [inactiveContent] = await db.query(`
      SELECT 
        i.id AS inserat_id, 
        i.titel, 
        i.status, 
        ug.grund, 
        ug.erstellt_am AS grund_datum
      FROM inserate i
      LEFT JOIN unsichtbar_gruende ug ON i.id = ug.inserat_id
      WHERE i.status = 'unsichtbar'
        AND ug.erstellt_am = (
          SELECT MAX(erstellt_am)
          FROM unsichtbar_gruende
          WHERE inserat_id = i.id
        )
      ORDER BY ug.erstellt_am DESC
    `);

    // Debugging
    console.log('Abgefragte Inhalte:', inactiveContent);

    // Template rendern
    res.render('pages/cms/email-template', {
      inactiveContent,
      login_user: req.user,
      currentUrl: req.url,
      headerTitle: 'Nicht sichtbare Inserate',
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der inaktiven Inhalte:', error);
    res.status(500).send('Fehler beim Abrufen der inaktiven Inhalte.');
  }
}

const setPruefung = async (req, res) => {
  const inseratId = req.params.id;

  if (!inseratId || isNaN(inseratId)) {
    console.error('Ungültige Inserat-ID:', inseratId);
    return res.status(400).send('Ungültige Inserat-ID.');
  }

  try {
    const [result] = await db.query('SELECT id FROM inserate WHERE id = ?', [inseratId]);

    if (result.length === 0) {
      console.error('Inserat nicht gefunden:', inseratId);
      return res.status(404).send('Inserat nicht gefunden.');
    }

    // Update der Spalte pruefung
    await db.query('UPDATE inserate SET pruefung = 1 WHERE id = ?', [inseratId]);

    res.send({ success: true, message: 'Inserat erfolgreich geprüft.' });
  } catch (error) {
    console.error('Fehler beim Setzen von "pruefung":', error);
    res.status(500).send('Fehler beim Setzen von "pruefung".');
  }
};

async function gepruefteOfflineInserate(req, res) {
  try {
    const [offlineInserate] = await db.query(`
      SELECT 
        i.id AS inserat_id,
        i.titel,
        i.beschreibung,
        i.preis,
        i.titelbild_url,
        k.name AS kategorie_name,
        u.username AS autor
      FROM inserate i
      LEFT JOIN kategorien k ON i.kategorie_id = k.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.pruefung = 1 AND i.status = 'unsichtbar'
      ORDER BY i.erstellt_am DESC
    `);

    res.render('pages/cms/gepruefteOfflineInserate', {
      inserate: offlineInserate,
      login_user: req.user,
      currentUrl: req.url,
      headerTitle: 'Geprüfte Offline-Inserate',
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der geprüften Offline-Inserate:', error);
    res.status(500).send('Fehler beim Abrufen der geprüften Offline-Inserate.');
  }
}

async function gepruefteOnlineInserate(req, res) {
  try {
    const [onlineInserate] = await db.query(`
      SELECT 
        i.id AS inserat_id,
        i.titel,
        i.beschreibung,
        i.preis,
        i.titelbild_url,
        k.name AS kategorie_name,
        u.username AS autor
      FROM inserate i
      LEFT JOIN kategorien k ON i.kategorie_id = k.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.pruefung = 1 AND i.status = 'sichtbar'
      ORDER BY i.erstellt_am DESC
    `);

    res.render('pages/cms/gepruefteOnlineInserate', {
      inserate: onlineInserate,
      login_user: req.user,
      currentUrl: req.url,
      headerTitle: 'Geprüfte Online-Inserate',
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der geprüften Online-Inserate:', error);
    res.status(500).send('Fehler beim Abrufen der geprüften Online-Inserate.');
  }
}

async function getContentWithStats(req, res) {
  try {
    // `userId` aus Cookie auslesen
    const userId = req.cookies.userId;

    if (!userId) {
      console.error("Benutzer-ID nicht im Cookie gefunden.");
      return res.status(401).send("Nicht autorisiert.");
    }

    // Abfrage der Inserate-Statistiken
    const [stats] = await db.query(`
      SELECT 
        SUM(CASE WHEN status = 'sichtbar' THEN 1 ELSE 0 END) AS online_count,
        SUM(CASE WHEN status = 'unsichtbar' THEN 1 ELSE 0 END) AS offline_count,
        SUM(CASE WHEN status = 'wartend' THEN 1 ELSE 0 END) AS pending_count
      FROM inserate
      WHERE user_id = ?
    `, [userId]);

    // Benutzerpaket und Registrierungsdatum abrufen
    const [userInfo] = await db.query(`
      SELECT paket, registrierungsdatum
      FROM users
      WHERE id = ?
    `, [userId]);

    if (!userInfo.length) {
      console.error("Benutzer nicht gefunden.");
      return res.status(404).send("Benutzer nicht gefunden.");
    }

    const paket = userInfo[0]?.paket || 'light'; // Standardpaket: "light"
    const startDatum = new Date(userInfo[0]?.registrierungsdatum);
    const jetzt = new Date();
    const laufzeitTage = 365 - Math.floor((jetzt - startDatum) / (1000 * 60 * 60 * 24));

    // Maximale Anzahl an Online-Inseraten basierend auf dem Paket
    const maxInserate = paket === 'light' ? 15 : paket === 'middle' ? 50 : 'unbegrenzt';

    // Inserate abfragen
    const [content] = await db.query(`
      SELECT 
          i.id AS inserat_id,
          i.titel,
          i.beschreibung,
          i.preis,
          i.titelbild_url,
          i.status,
          GROUP_CONCAT(b.bild_url) AS galeriebilder,
          i.erstellt_am
      FROM 
          inserate i
      LEFT JOIN 
          bilder b ON i.id = b.inserat_id
      WHERE i.user_id = ?
      GROUP BY i.id
      ORDER BY i.erstellt_am DESC;
    `, [userId]);

    res.render('pages/cms/content', {
      login_user: req.user,
      content,
      stats: stats[0],
      laufzeitTage,
      maxInserate,
      currentUrl: req.url,
      headerTitle: 'Content'
    });
  } catch (error) {
    console.error("Fehler beim Abrufen der Inhalte:", error);
    res.status(500).send("Fehler beim Abrufen der Inhalte");
  }
}

async function getProductDetail(req, res) {
  const productId = req.params.id;

  try {
    const [product] = await db.query(
      `
      SELECT 
        i.id AS product_id,
        i.titel AS product_title,
        i.beschreibung AS description,
        i.preis AS price,
        i.titelbild_url AS title_image,
        k.name AS category_name,
        GROUP_CONCAT(b.bild_url) AS gallery_images
      FROM 
        inserate i
      LEFT JOIN 
        kategorien k ON i.kategorie_id = k.id
      LEFT JOIN 
        bilder b ON i.id = b.inserat_id
      WHERE 
        i.id = ?
      GROUP BY 
        i.id
      `,
      [productId]
    );

    if (!product || product.length === 0) {
      return res.status(404).send("Produkt nicht gefunden.");
    }

    res.render("pages/apps/shop/ecom-product-detail", {
      product: product[0],
      login_user: req.user,
      currentUrl: req.url,
      headerTitle: "Produktdetails",
    });
  } catch (error) {
    console.error("Fehler beim Abrufen der Produktdetails:", error);
    res.status(500).send("Fehler beim Abrufen der Produktdetails.");
  }
}

async function getEditProductForm(req, res) {
  const productId = req.params.id;

  try {
    const [products] = await db.query(
      `
      SELECT 
        i.id AS product_id,
        i.titel AS product_title,
        i.beschreibung AS description,
        i.preis AS price,
        i.titelbild_url AS title_image,
        i.kategorie_id AS category_id,
        k.name AS category_name
      FROM 
        inserate i
      LEFT JOIN 
        kategorien k ON i.kategorie_id = k.id
      WHERE 
        i.id = ?
      `,
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).send("Produkt nicht gefunden.");
    }

    const product = products[0];

    // Galeriebilder separat abfragen
    const [galleryImages] = await db.query(
      `
      SELECT 
        b.id AS bilder_id,
        b.bild_url AS bild_url,
        b.sort_order AS sort_order
      FROM 
        bilder b
      WHERE 
        b.inserat_id = ?
      ORDER BY 
        b.sort_order ASC
      `,
      [productId]
    );

    // Kategorien abfragen
    const [categories] = await db.query('SELECT id, name FROM kategorien');

    // Produkt- und Galeriedaten kombinieren
    product.gallery_images = galleryImages;

    // Rendering der Seite
    res.render('pages/apps/shop/product-edit', {
      product,
      categories,
      login_user: req.user,
      currentUrl: req.url,
      headerTitle: 'Produkt bearbeiten',
    });
  } catch (error) {
    console.error("Fehler beim Abrufen des Produkts:", error);
    res.status(500).send("Fehler beim Laden der Produktdaten.");
  }
}

async function updateProduct(req, res) {
  const productId = req.params.id;
  const { title, description, price, category } = req.body;
  const file = req.files?.image;
  const galleryFiles = req.files?.gallery;

  try {
    let titleImageUrl;
    if (file) {
      titleImageUrl = `/uploads/${Date.now()}_${file.name}`;
      await file.mv(path.join(__dirname, '../../public', titleImageUrl));
    }

    await db.query(
      `
      UPDATE inserate
      SET titel = ?, beschreibung = ?, preis = ?, kategorie_id = ?, 
          titelbild_url = COALESCE(?, titelbild_url)
      WHERE id = ?
      `,
      [title, description, price, category, titleImageUrl, productId]
    );

    if (galleryFiles) {
      await db.query('DELETE FROM bilder WHERE inserat_id = ?', [productId]);

      const galleryInsertPromises = [];
      if (Array.isArray(galleryFiles)) {
        galleryFiles.forEach((file) => {
          const galleryPath = `/uploads/${Date.now()}_${file.name}`;
          galleryInsertPromises.push(
            db.query('INSERT INTO bilder (inserat_id, bild_url) VALUES (?, ?)', [productId, galleryPath])
          );
          file.mv(path.join(__dirname, '../../public', galleryPath));
        });
      } else {
        const galleryPath = `/uploads/${Date.now()}_${galleryFiles.name}`;
        galleryInsertPromises.push(
          db.query('INSERT INTO bilder (inserat_id, bild_url) VALUES (?, ?)', [productId, galleryPath])
        );
        galleryFiles.mv(path.join(__dirname, '../../public', galleryPath));
      }
      await Promise.all(galleryInsertPromises);
    }

    res.redirect('/product-detail/' + productId);
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Produkts:", error);
    res.status(500).send("Fehler beim Speichern der Änderungen.");
  }
}

async function updateGalleryOrder(req, res) {
  const { productId, galleryOrder } = req.body;

  if (!productId || !galleryOrder) {
    return res.status(400).send("Fehlende Parameter");
  }

  try {
    for (let i = 0; i < galleryOrder.length; i++) {
      const { id, sort_order } = galleryOrder[i];
      await db.query("UPDATE bilder SET sort_order = ? WHERE id = ? AND inserat_id = ?", [
        sort_order,
        id,
        productId,
      ]);
    }
    res.status(200).send("Reihenfolge erfolgreich aktualisiert");
  } catch (error) {
    console.error("Fehler beim Aktualisieren der Reihenfolge:", error);
    res.status(500).send("Fehler beim Aktualisieren der Reihenfolge");
  }
}

const updateErstelltAm = async (req, res) => {
  const { inserat_id, erstellt_am } = req.body;

  if (!inserat_id || !erstellt_am) {
    return res.status(400).send('Fehlende Parameter.');
  }

  try {
    const query = `
      UPDATE inserate 
      SET erstellt_am = ? 
      WHERE id = ?
    `;
    await db.query(query, [erstellt_am, inserat_id]);

    res.status(200).send({ message: 'Datum erfolgreich aktualisiert.' });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Datums:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
};

const createOrReplaceWerbeanzeige = async (req, res) => {
  const { inserat_id, werbe_typ, startdatum, enddatum, position } = req.body;

  try {
    // Überprüfen, ob die Position bereits existiert
    const [existing] = await db.query(
      `SELECT id FROM werbeanzeigen WHERE position = ?`,
      [position]
    );

    if (existing.length > 0) {
      // Falls die Position existiert, löschen wir die alte Werbeanzeige
      await db.query(`DELETE FROM werbeanzeigen WHERE position = ?`, [position]);
    }

    // Neue Werbeanzeige einfügen
    await db.query(
      `
      INSERT INTO werbeanzeigen (inserat_id, werbe_typ, startdatum, enddatum, position, aktiv)
      VALUES (?, ?, ?, ?, ?, 1)
      `,
      [inserat_id, werbe_typ, startdatum, enddatum, position]
    );

    res.status(201).send({ message: 'Werbeanzeige erstellt oder ersetzt.' });
  } catch (error) {
    console.error('Fehler beim Erstellen der Werbeanzeige:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
};

const insertWerbeanzeige = async (req, res) => {
  const { inserat_id, werbe_typ = 'banner', rubrik, startdatum, enddatum } = req.body;

  const rubrikPositionMap = {
    'Immobilien': 1,
    'Autos': 2,
    'Uhren': 3,
    'Boote': 4,
  };

  const position = rubrikPositionMap[rubrik];

  if (!inserat_id || !werbe_typ || !position) {
    return res.status(400).json({ error: 'Inserat-ID, Werbe-Typ und Position sind erforderlich.' });
  }

  try {
    await db.query(
      'INSERT INTO werbeanzeigen (inserat_id, werbe_typ, position, startdatum, enddatum) VALUES (?, ?, ?, ?, ?)',
      [inserat_id, werbe_typ, position, startdatum, enddatum]
    );
    res.json({ success: 'Werbeanzeige hinzugefügt.' });
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Werbeanzeige:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten.' });
  }
};

const updateWerbeanzeige = async (req, res) => {
  const { werbeanzeige_id, inserat_id, rubrik, startdatum, enddatum } = req.body;

  const rubrikPositionMap = {
    'Immobilien': 1,
    'Autos': 2,
    'Uhren': 3,
    'Boote': 4,
  };

  const position = rubrikPositionMap[rubrik];

  if (!werbeanzeige_id || !inserat_id || !position) {
    return res.status(400).json({ error: 'Werbeanzeige-ID, Inserat-ID und Position sind erforderlich.' });
  }

  try {
    await db.query(
      'UPDATE werbeanzeigen SET inserat_id = ?, position = ?, startdatum = ?, enddatum = ? WHERE id = ?',
      [inserat_id, position, startdatum, enddatum, werbeanzeige_id]
    );
    res.json({ success: 'Werbeanzeige aktualisiert.' });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Werbeanzeige:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten.' });
  }
};

const getWerbeanzeigen = async (req, res) => {
  try {
    const werbeanzeigenQuery = `
      SELECT 
          w.id AS werbeanzeige_id,
          w.inserat_id,
          w.werbe_typ,
          w.startdatum,
          w.enddatum,
          w.position,
          w.aktiv,
          i.titel AS inserat_titel,
          i.titelbild_url
      FROM 
          werbeanzeigen w
      JOIN inserate i ON w.inserat_id = i.id
      WHERE 
          w.werbe_typ = 'banner'
      ORDER BY 
          w.position ASC, w.startdatum DESC;
    `;

    const inserateQuery = `
      SELECT 
          id AS inserat_id, 
          titel AS inserat_titel, 
          titelbild_url 
      FROM 
          inserate
      WHERE 
          pruefung = 1
          AND erstellt_am <= CURDATE();
    `;

    const [werbeanzeigenRows] = await db.query(werbeanzeigenQuery);
    const [inserateRows] = await db.query(inserateQuery);

    const werbeanzeigen = {
      spezial: werbeanzeigenRows,
    };

    res.render('pages/cms/werbeanzeigen', {
      werbeanzeigen,
      inserate: inserateRows,
      login_user: req.user,
      currentUrl: req.url,
      headerTitle: 'Werbeanzeigen',
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Werbeanzeigen:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
};

const removeWerbeanzeige = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM werbeanzeigen WHERE id = ?', [id]);
    res.json({ success: 'Werbeanzeige entfernt.' });
  } catch (error) {
    console.error('Fehler beim Entfernen der Werbeanzeige:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten.' });
  }
};

const getSpezial = async (req, res) => {
  try {
    const spezialQuery = `
      SELECT 
          w.id AS werbeanzeige_id,
          w.inserat_id,
          w.werbe_typ,
          w.startdatum,
          w.enddatum,
          w.position,
          w.aktiv,
          i.titel AS inserat_titel,
          i.titelbild_url
      FROM 
          werbeanzeigen w
      JOIN inserate i ON w.inserat_id = i.id
      WHERE 
          w.werbe_typ = 'spezial'
      ORDER BY 
          w.position ASC, w.startdatum DESC;
    `;

    const inserateQuery = `
      SELECT 
          id AS inserat_id, 
          titel AS inserat_titel, 
          titelbild_url 
      FROM 
          inserate
      WHERE 
          pruefung = 1
          AND erstellt_am <= CURDATE();
    `;

    const [spezialRows] = await db.query(spezialQuery);
    const [inserateRows] = await db.query(inserateQuery);

    console.log('Werbeanzeigen Daten:', spezialRows);
    console.log('Inserate Daten:', inserateRows);

    const werbeanzeigen = {
      spezial: spezialRows,
    };

    res.render('pages/cms/spezial', {
      werbeanzeigen,
      inserate: inserateRows,
      login_user: req.user,
      currentUrl: req.url,
      headerTitle: 'Spezial-Werbeanzeigen',
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Spezial-Werbeanzeigen:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
};

const insertSpezial = async (req, res) => {
  const { inserat_id, startdatum, enddatum, position } = req.body; // Position wird jetzt übergeben

  if (!inserat_id || !startdatum || !enddatum || !position) {
    return res.status(400).json({ error: 'Inserat-ID, Startdatum, Enddatum und Position sind erforderlich.' });
  }

  try {
    const [existingAds] = await db.query(
      'SELECT COUNT(*) AS count FROM werbeanzeigen WHERE werbe_typ = "spezial" AND position = ?',
      [position]
    );

    if (existingAds[0].count > 0) {
      return res.status(400).json({ error: 'Diese Position ist bereits vergeben.' });
    }

    // Neue Werbeanzeige einfügen
    await db.query(
      'INSERT INTO werbeanzeigen (inserat_id, werbe_typ, position, startdatum, enddatum) VALUES (?, ?, ?, ?, ?)',
      [inserat_id, 'spezial', position, startdatum, enddatum]
    );
    res.json({ success: 'Spezial erfolgreich hinzugefügt.' });
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Werbeanzeige:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten.' });
  }
};

const updateSpezial = async (req, res) => {
  const { werbeanzeige_id, inserat_id, position, startdatum, enddatum } = req.body;
  console.log('Empfangene Daten:', {
    werbeanzeige_id,
    inserat_id,
    position,
    startdatum,
    enddatum,
  });

  const numericPosition = parseInt(position, 10);

  if (!werbeanzeige_id || !inserat_id || isNaN(numericPosition)) {
    console.log('Fehlerhafte Daten:', {
      werbeanzeige_id,
      inserat_id,
      numericPosition,
    });
    return res.status(400).json({ error: 'Werbeanzeige-ID, Inserat-ID und Position sind erforderlich.' });
  }

  try {
    // SQL-Update-Abfrage
    const result = await db.query(
      'UPDATE werbeanzeigen SET inserat_id = ?, position = ?, startdatum = ?, enddatum = ? WHERE id = ?',
      [inserat_id, numericPosition, startdatum, enddatum, werbeanzeige_id]
    );
    console.log('Update erfolgreich:', result);
    res.json({ success: 'Spezial erfolgreich aktualisiert.' });
  } catch (error) {
    console.error('Fehler beim Aktualisieren von Spezial:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten.' });
  }
};

const removeSpezial = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM werbeanzeigen WHERE id = ?', [id]);
    res.json({ success: 'Spezial entfernt.' });
  } catch (error) {
    console.error('Fehler beim Entfernen von Spezial:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten.' });
  }
};

const getKatalog = async (req, res) => {
  try {
    const spezialQuery = `
      SELECT 
          w.id AS werbeanzeige_id,
          w.inserat_id,
          w.werbe_typ,
          w.startdatum,
          w.enddatum,
          w.position,
          w.aktiv,
          i.titel AS inserat_titel,
          i.titelbild_url
      FROM 
          werbeanzeigen w
      JOIN inserate i ON w.inserat_id = i.id
      WHERE 
          w.werbe_typ = 'top'
      ORDER BY 
          w.position ASC, w.startdatum DESC;
    `;

    const inserateQuery = `
      SELECT 
          id AS inserat_id, 
          titel AS inserat_titel, 
          titelbild_url 
      FROM 
          inserate
      WHERE 
          pruefung = 1
          AND erstellt_am <= CURDATE();
    `;

    const [spezialRows] = await db.query(spezialQuery);
    const [inserateRows] = await db.query(inserateQuery);

    console.log('Werbeanzeigen Daten:', spezialRows);
    console.log('Inserate Daten:', inserateRows);

    const werbeanzeigen = {
      spezial: spezialRows,
    };

    res.render('pages/cms/topwerbeanzeigen', {
      werbeanzeigen,
      inserate: inserateRows,
      login_user: req.user,
      currentUrl: req.url,
      headerTitle: 'Katalog Werbeanzeigen',
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Spezial-Werbeanzeigen:', error);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
};

const insertKatalog = async (req, res) => {
  const { inserat_id, startdatum, enddatum, position } = req.body; // Position wird jetzt übergeben

  if (!inserat_id || !startdatum || !enddatum || !position) {
    return res.status(400).json({ error: 'Inserat-ID, Startdatum, Enddatum und Position sind erforderlich.' });
  }

  try {
    const [existingAds] = await db.query(
      'SELECT COUNT(*) AS count FROM werbeanzeigen WHERE werbe_typ = "top" AND position = ?',
      [position]
    );

    if (existingAds[0].count > 0) {
      return res.status(400).json({ error: 'Diese Position ist bereits vergeben.' });
    }

    // Neue Werbeanzeige einfügen
    await db.query(
      'INSERT INTO werbeanzeigen (inserat_id, werbe_typ, position, startdatum, enddatum) VALUES (?, ?, ?, ?, ?)',
      [inserat_id, 'top', position, startdatum, enddatum]
    );
    res.json({ success: 'Kataloganzeigen erfolgreich hinzugefügt.' });
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Werbeanzeige:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten.' });
  }
};

const updateKatalog = async (req, res) => {
  const { werbeanzeige_id, inserat_id, position, startdatum, enddatum } = req.body;
  console.log('Empfangene Daten:', {
    werbeanzeige_id,
    inserat_id,
    position,
    startdatum,
    enddatum,
  });

  const numericPosition = parseInt(position, 10);

  if (!werbeanzeige_id || !inserat_id || isNaN(numericPosition)) {
    console.log('Fehlerhafte Daten:', {
      werbeanzeige_id,
      inserat_id,
      numericPosition,
    });
    return res.status(400).json({ error: 'Werbeanzeige-ID, Inserat-ID und Position sind erforderlich.' });
  }

  try {
    // SQL-Update-Abfrage
    const result = await db.query(
      'UPDATE werbeanzeigen SET inserat_id = ?, position = ?, startdatum = ?, enddatum = ? WHERE id = ?',
      [inserat_id, numericPosition, startdatum, enddatum, werbeanzeige_id]
    );
    console.log('Update erfolgreich:', result);
    res.json({ success: 'Spezial erfolgreich aktualisiert.' });
  } catch (error) {
    console.error('Fehler beim Aktualisieren von Spezial:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten.' });
  }
};

const removeKatalog = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM werbeanzeigen WHERE id = ?', [id]);
    res.json({ success: 'Spezial entfernt.' });
  } catch (error) {
    console.error('Fehler beim Entfernen von Spezial:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten.' });
  }
};

async function scrapeHerandoData(req, res) {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Navigiere zur Zielseite
        await page.goto('https://www.herando.com/properties/33379', { waitUntil: 'domcontentloaded' });

        const data = await page.evaluate(() => {
            // Helper-Funktion, um den Text eines Elements zu extrahieren
            const getText = (selector, matchText) => {
                const elements = Array.from(document.querySelectorAll(selector));
                const element = elements.find(el => el.textContent.trim() === matchText);
                return element ? element.nextElementSibling?.textContent.trim() || '' : '';
            };

            // Helper-Funktion, um ein Attribut zu extrahieren
            const getAttribute = (selector, attribute) =>
                document.querySelector(selector)?.getAttribute(attribute) || '';

            // Helper-Funktion, um alle Bilder zu extrahieren
            const getAllImages = () =>
                Array.from(document.querySelectorAll('.photo-link img')).map(img => ({
                    small: img.src,
                    large: img.getAttribute('data-okimage')
                }));

            // Strukturierte Daten sammeln
            return {
                title: document.querySelector('.detail-title h1')?.innerText.trim() || '', // Titel
                price: document.querySelector('.price-container .price')?.innerText.trim() || '', // Preis
                location: {
                    country: document.querySelector('.flag span')?.innerText.trim() || '', // Land
                    city: getText('dl dt', 'Stadt') // Stadt
                },
                basicDetails: {
                    yearBuilt: getText('dl dt', 'Baujahr'), // Baujahr
                    propertyType: getText('dl dt', 'Immobilienart'), // Immobilienart
                    condition: getText('dl dt', 'Objektzustand'), // Zustand
                    heating: getText('dl dt', 'Heizung'), // Heizung
                    energySource: getText('dl dt', 'Energieträger') // Energieträger
                },
                measurements: {
                    landArea: getText('dl dt', 'Grundstücksfläche (m²)'), // Grundstücksfläche
                    livingArea: getText('dl dt', 'Wohnfläche (m²)'), // Wohnfläche
                    rooms: getText('dl dt', 'Zimmer'), // Zimmer
                    bathrooms: getText('dl dt', 'Badezimmer') // Badezimmer
                },
                description: document.querySelector('#original-description p')?.innerText.trim() || '', // Beschreibung
                images: getAllImages(), // Alle Bilder
                seller: {
                    name: document.querySelector('.contact-block .content-h3')?.innerText.trim() || '', // Verkäufername
                    address: document.querySelector('.contact-block p:nth-of-type(1)')?.innerText.trim() || '', // Adresse
                    city: document.querySelector('.contact-block p:nth-of-type(2)')?.innerText.trim() || '', // Stadt
                    website: getAttribute('.contact-block a', 'href') // Verkäuferwebseite
                }
            };
        });

        // Browser schließen
        await browser.close();

        // Daten an die EJS-Datei senden und rendern
        res.render('pages/cms/scrape-herando', {
            login_user: req.user || 'Gast', // Login-Informationen
            currentUrl: req.url, // Aktuelle URL
            headerTitle: 'JSON Immobilie', // Titel der Seite
            data // Gescrapte Daten
        });
    } catch (error) {
        console.error('Fehler beim Abrufen des Contents:', error);
        res.status(500).send('Ein Fehler ist aufgetreten.');
    }
}

async function getWatches(req, res) {
  try {
      const pageParam = parseInt(req.query.page) || 1; // Standardmäßig Seite 1
      const itemsPerPage = 25; // Anzahl der Inserate pro Seite
      const startIndex = (pageParam - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;

      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();

      const baseUrl = "https://www.herando.com/watches/";
      let allWatches = [];

      // Scrap 220 Seiten (oder begrenze es zu Debugging-Zwecken)
      for (let i = 1; i <= 220; i++) {
          await page.goto(`${baseUrl}?p=${i}`, { waitUntil: 'domcontentloaded' });

          const watches = await page.evaluate(() => {
              const watchCards = Array.from(document.querySelectorAll('.offers-item'));
              return watchCards.map(card => ({
                  title: card.querySelector('.offers-item__name')?.innerText.trim() || 'Kein Titel',
                  price: card.querySelector('.offers-item__price')?.innerText.trim() || 'Preis auf Anfrage',
                  location: card.querySelector('.flag span')?.innerText.trim() || 'Unbekannter Standort',
                  imageUrl: card.querySelector('.offers-item__image img')?.src || '',
                  detailPage: 'https://www.herando.com' + card.querySelector('.offers-item__info')?.getAttribute('href')
              }));
          });

          allWatches = allWatches.concat(watches);

          if (i === 5) break; // Begrenzung für schnelles Debugging
      }

      await browser.close();

      // Paginierung anwenden
      const paginatedWatches = allWatches.slice(startIndex, endIndex);

      res.render('pages/cms/admin-watches', {
          watches: paginatedWatches,
          login_user: req.user || 'Gast',
          currentUrl: req.url,
          headerTitle: 'Uhrenübersicht',
          currentPage: pageParam,
          totalPages: Math.ceil(allWatches.length / itemsPerPage),
      });
  } catch (error) {
      console.error("Fehler beim Abrufen der Daten:", error);
      res.status(500).send("Ein Fehler ist aufgetreten.");
  }
}

const { chromium } = require('playwright');
const fs = require('fs');

async function getChronoWatches(req, res) {
  try {
    const { customerId, page = 1 } = req.query;
    if (!customerId) {
      return res.status(400).send("CustomerId wird benötigt.");
    }

    console.log(`CustomerId: ${customerId}, Aktuelle Seite: ${page}`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    });

    const pageInstance = await context.newPage();

    const url = `https://www.chrono24.at/search/index.htm?customerId=${customerId}&dosearch=true&pageSize=120&showpage=${page}`;
    console.log(`Navigiere zu: ${url}`);

    await pageInstance.goto(url, { waitUntil: 'domcontentloaded' });

    const watches = await pageInstance.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.js-article-item-container'));
      return cards.map(card => ({
        title: card.querySelector('.text-bold')?.innerText.trim() || 'Kein Titel',
        price: card.querySelector('.text-bold + div')?.innerText.trim() || 'Preis auf Anfrage',
        imageUrl: card.querySelector('img')?.getAttribute('data-lazy-sweet-spot-master-src') || card.querySelector('img')?.src || 'Kein Bild',
        location: card.querySelector('.js-tooltip')?.getAttribute('data-content') || 'Unbekannter Standort',
        detailPage: 'https://www.chrono24.at' + card.querySelector('a')?.getAttribute('href'),
      }));
    });

    console.log(`Gefundene Uhren: ${watches.length}`);

    const itemsPerPage = 10;
    const totalPages = Math.ceil(watches.length / itemsPerPage);
    console.log(`Berechnete Gesamtseiten: ${totalPages}`);

    // Pagination
    const paginatedWatches = watches.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    // Daten an die Ansicht übergeben
    res.render('pages/cms/chrono-watches', {
      watches: paginatedWatches,
      currentPage: parseInt(page, 10),
      totalPages,
      customerId,
      login_user: req.user || 'Gast', // Login-Informationen
      currentUrl: req.url, // Aktuelle URL
      headerTitle: 'Chrono24 Watches',
    });

    await browser.close();
  } catch (error) {
    console.error("Fehler beim Abrufen der Daten:", error);
    res.status(500).send("Ein Fehler ist aufgetreten.");
  }
}

async function showSimulationForm(req, res) {
  res.render("pages/cms/simulate", {
    login_user: req.user || "Gast",
    currentUrl: req.url,
    headerTitle: "Simuliere Traffic",
    users: 0,
    urls: []
  });
}

//const puppeteer = require('puppeteer');
//const io = require('socket.io'); // WebSocket für Live-Logs

// Simulation starten
async function runSimulation(req, res) {
  const userCount = parseInt(req.body.userCount, 10); // Anzahl der Benutzer
  const urls = req.body.urls
    .split(',')
    .map(url => url.trim())
    .filter(url => url.startsWith('http://') || url.startsWith('https://'));

  if (urls.length === 0) {
    return res.status(400).send('Ungültige URL(s). Bitte gib gültige Links an.');
  }

  console.log(`Starte Simulation mit ${userCount} Benutzern für URLs:`, urls);

  // Puppeteer-Simulation
  try {
    for (let i = 0; i < userCount; i++) {
      const userName = `User${i + 1}`;
      console.log(`Starte Simulation für ${userName}`);

      // Browser öffnen
      const browser = await puppeteer.launch({
        headless: true, // Setze auf false für Debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Funktion zum Warten hinzufügen (Fallback für Puppeteer-Versionen)
      await sleep(2000);

      // Besuche jede URL
      for (const url of urls) {
        try {
          console.log(`${userName} besucht: ${url}`);
          await page.goto(url, { waitUntil: 'networkidle2' });

          // Google Analytics-Event senden
          await page.evaluate(() => {
            if (typeof gtag === 'function') {
              gtag('event', 'page_view', {
                page_title: document.title,
                page_location: window.location.href,
                page_path: window.location.pathname,
              });
              console.log('Google Analytics Page View gesendet.');
            } else {
              console.error('Google Analytics (gtag) ist nicht verfügbar.');
            }
          });

          // Benutzerinteraktionen simulieren
          await page.waitForTimeout(3000); // Warten (3 Sek)
          console.log(`${userName} klickt auf der Seite.`);
          await page.mouse.move(200, 300); // Mausbewegung simulieren
          await page.mouse.click(200, 300); // Klick simulieren
        } catch (err) {
          console.error(`Fehler bei ${url}: ${err.message}`);
        }
      }

      // Browser schließen
      await browser.close();
      console.log(`Simulation für ${userName} abgeschlossen.`);
    }

    res.send('Simulation abgeschlossen.');
  } catch (error) {
    console.error(`Fehler bei der Simulation: ${error.message}`);
    res.status(500).send('Fehler bei der Simulation.');
  }
}

async function simulateMouseMovements(page) {
  const width = await page.evaluate(() => window.innerWidth);
  const height = await page.evaluate(() => window.innerHeight);

  for (let i = 0; i < 10; i++) {
    const x = randomIntFromInterval(0, width);
    const y = randomIntFromInterval(0, height);
    await page.mouse.move(x, y);
    await page.waitForTimeout(randomIntFromInterval(100, 500));
  }
  console.log('Mausbewegungen simuliert.');
}

async function simulateScroll(page) {
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  const scrollStep = Math.ceil(scrollHeight / 5);

  for (let i = 0; i < 5; i++) {
    await page.evaluate((step) => {
      window.scrollBy(0, step);
    }, scrollStep);
    await page.waitForTimeout(randomIntFromInterval(500, 1500));
  }
  console.log('Scrollaktionen simuliert.');
}

async function simulateRandomClick(page) {
  const links = await page.$$eval('a', anchors => anchors.map(anchor => anchor.href));
  const filteredLinks = links.filter(link => link.startsWith('http://') || link.startsWith('https://'));

  if (filteredLinks.length > 0) {
    const randomLink = filteredLinks[Math.floor(Math.random() * filteredLinks.length)];
    console.log(`Zufälliger Klick auf Link: ${randomLink}`);
    try {
      await page.goto(randomLink, { waitUntil: 'networkidle2' });
    } catch (error) {
      console.error(`Fehler beim Navigieren zur Unterseite ${randomLink}: ${error.message}`);
    }
  } else {
    console.log('Keine anklickbaren Links gefunden.');
  }
}

// Hilfsfunktion: Zufällige Zahl innerhalb eines Bereichs
function randomIntFromInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const nutzerSimulation = async (req, res) => {
  const userCount = parseInt(req.body.userCount, 10);
  const urls = req.body.urls
    .split(',')
    .map(url => url.trim())
    .filter(url => url.startsWith('http://') || url.startsWith('https://'));

  if (!userCount || urls.length === 0) {
    console.error('Fehlerhafte Eingabe.');
    return res.status(400).send('Bitte geben Sie eine gültige Nutzeranzahl und mindestens eine gültige URL ein.');
  }

  const scraperApiKey = '8ea43bfa28fa3d1ca6bc195fb6b0166f';
  console.log(`Starte Simulation mit ${userCount} Nutzern für folgende URLs:`, urls);

  try {
    for (let i = 0; i < userCount; i++) {
      const userName = `User${i + 1}`;
      console.log(`\n=== Start der Simulation für ${userName} ===\n`);
      io.emit('log', `=== Start der Simulation für ${userName} ===`);

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // IP-Adresse abrufen
      const ipCheckUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=https://httpbin.org/ip`;
      let userIp = 'Unbekannt';
      try {
        await page.goto(ipCheckUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        const rawResponse = await page.evaluate(() => document.body.innerText);
        const ipInfo = JSON.parse(rawResponse);
        userIp = ipInfo.origin;
        console.log(`${userName} nutzt IP-Adresse: ${userIp}`);
        io.emit('log', `${userName} nutzt IP-Adresse: ${userIp}`);
      } catch (error) {
        console.error(`${userName} Fehler beim Abrufen der IP-Adresse: ${error.message}`);
      }

      // Hauptseite besuchen
      const mainUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(urls[0])}`;
      try {
        await page.goto(mainUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        console.log(`${userName} besucht Hauptseite: ${urls[0]}`);
        io.emit('log', `${userName} besucht Hauptseite: ${urls[0]}`);

        // Cookies akzeptieren
        const cookieAccepted = await (page);
        if (cookieAccepted) {
          console.log(`${userName} hat Cookies akzeptiert.`);
          io.emit('log', `${userName} hat Cookies akzeptiert.`);
        } else {
          console.log(`${userName} konnte die Cookies nicht akzeptieren.`);
          io.emit('log', `${userName} konnte die Cookies nicht akzeptieren.`);
        }

        // Benutzer-Aktivität simulieren
        const totalDuration = 170000; // 170 Sekunden
        const actionInterval = 13000; // 13 Sekunden zwischen Aktionen
        let elapsedTime = 0;

        while (elapsedTime < totalDuration) {
          await new Promise(resolve => setTimeout(resolve, actionInterval));
          elapsedTime += actionInterval;

          // Zufällige Aktion: navigieren oder zur Hauptseite zurückkehren
          const actionType = Math.random() > 0.5 ? 'navigate' : 'return';
          if (actionType === 'navigate') {
            const links = await page.$$eval('a', anchors => anchors.map(a => a.href));
            const filteredLinks = links.filter(link => link.startsWith('http://') || link.startsWith('https://'));

            if (filteredLinks.length > 0) {
              const randomLink = filteredLinks[Math.floor(Math.random() * filteredLinks.length)];
              console.log(`${userName} klickt auf Unterseite: ${randomLink}`);
              io.emit('log', `${userName} klickt auf Unterseite: ${randomLink}`);
              await page.goto(randomLink, { waitUntil: 'networkidle2', timeout: 60000 });
            }
          } else {
            console.log(`${userName} kehrt zur Hauptseite zurück.`);
            io.emit('log', `${userName} kehrt zur Hauptseite zurück.`);
            await page.goto(mainUrl, { waitUntil: 'networkidle2', timeout: 60000 });
          }
        }
      } catch (error) {
        console.error(`${userName} Fehler bei der Simulation: ${error.message}`);
        io.emit('log', `${userName} Fehler bei der Simulation.`);
      }

      await browser.close();
      console.log(`\n=== Simulation für ${userName} abgeschlossen ===\n`);
      io.emit('log', `=== Simulation für ${userName} abgeschlossen ===`);
    }

    res.render('pages/cms/nutzerSimulation', {
      headerTitle: 'Nutzer Simulation',
      login_user: req.user || 'Gast',
      users: userCount,
      urls,
    });
  } catch (error) {
    console.error(`Fehler bei der Simulation: ${error.message}`);
    res.status(500).send('Es ist ein Fehler aufgetreten.');
  }
};

// Funktion zur Cookie-Akzeptanz
//async function acceptCookies(page) {
//  try {
 //   console.log("Versuche, Cookies zu akzeptieren...");
   // await page.waitForSelector('#consentpopup', { timeout: 10000 });
  //  await page.waitForSelector('#consent-all', { timeout: 5000 });
  //  await page.click('#consent-all');
  //  console.log("Cookies erfolgreich akzeptiert.");
  //  return true;
 // } catch (error) {
  //  console.error("Cookies konnten nicht akzeptiert werden:", error.message);
  //  return false;
 // }
//}



const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const SCRAPER_API_KEY = '8ea43bfa28fa3d1ca6bc195fb6b0166f'; // Dein ScraperAPI-Schlüssel
const BASE_DOMAIN = 'https://herando.com'; // Deine feste Domain

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0"
];

let simulationActive = false; // Status der Simulation

const simulatePage = async (req, res) => {
  try {
    const { urls = [], visitorCount, days } = req.body;

    const validUrls = Array.isArray(urls)
      ? urls.map((url) => url.trim()).filter((url) => url.startsWith('/'))
      : [];

    if (validUrls.length === 0 || !visitorCount || isNaN(visitorCount) || visitorCount <= 0 || !days || isNaN(days) || days <= 0) {
      console.log('Ungültige Eingabedaten.');
      return res.status(400).send('Bitte gültige URLs, Besucheranzahl und Tage angeben.');
    }

    const fullUrls = validUrls.map((path) => `${BASE_DOMAIN}${path}`);
    const dailyVisitors = Math.ceil(visitorCount / days);
    console.log(`Simulation gestartet für ${visitorCount} Benutzer über ${days} Tage. Tägliche Besucher: ${dailyVisitors}`);

    await simulateUsersConcurrently(fullUrls, visitorCount, 30);
    simulationActive = true; // Simulation starten

    for (let i = 0; i < days; i++) {
      if (!simulationActive) break; // Stoppen, wenn deaktiviert
      console.log(`Tag ${i + 1} beginnt.`);
      await simulateUsersConcurrently(fullUrls, dailyVisitors, 5);
      console.log(`Tag ${i + 1} abgeschlossen.`);
    }

    simulationActive = false; // Simulation abgeschlossen
    console.log('Simulation vollständig abgeschlossen.');

    res.render('pages/cms/simulate', {
      pageTitle: 'Simulation abgeschlossen',
      trackingId: 'G-BLYK1D0REM',
      pagePath: validUrls[0] || '/simulate',
    });
  } catch (error) {
    console.error('Fehler in simulatePage:', error);
    res.status(500).send('Interner Serverfehler');
  }
};

// Simuliere Benutzer
const simulateUser = async (urls, userNumber) => {
  const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--proxy-server=http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}`,
    ],
  });

  const page = await browser.newPage();

  try {
    await page.setUserAgent(userAgent);
    await page.setViewport({
      width: Math.floor(Math.random() * (1920 - 1024) + 1024),
      height: Math.floor(Math.random() * (1080 - 768) + 768),
    });

    console.log(`Benutzer ${userNumber} startet mit User-Agent: ${userAgent}`);

    // Besuche die Startseite und akzeptiere Cookies
    try {
      console.log(`Benutzer ${userNumber} besucht die Startseite.`);
      await retryNavigation(page, `${BASE_DOMAIN}/`);

      const consentButtonSelector = '#consent-all';
      if (await page.$(consentButtonSelector)) {
        console.log(`Benutzer ${userNumber} akzeptiert Cookies.`);
        await page.click(consentButtonSelector);
        await sleep(2000); // Warte auf Verarbeitung
        console.log(`Benutzer ${userNumber}: Cookie wurde erfolgreich akzeptiert.`);
      } else {
        console.log(`Benutzer ${userNumber}: Kein Cookie-Akzeptieren-Button gefunden.`);
      }
    } catch (error) {
      console.warn(`Cookies konnten von Benutzer ${userNumber} nicht akzeptiert werden:`, error);
    }

    // Besuche die angegebenen URLs
    for (const url of urls) {
      console.log(`Benutzer ${userNumber} besucht: ${url}`);
      try {
        await retryNavigation(page, url);
      } catch {
        console.log(`Fehler beim Laden der URL: ${url}. Überspringe diesen Schritt.`);
        continue;
      }

      // Tracking für die Hauptseite
      const relativePath = new URL(url, BASE_DOMAIN).pathname;
      await page.evaluate((trackingId, relativePath) => {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag() {
          window.dataLayer.push(arguments);
        };
        gtag('config', trackingId, {
          page_path: relativePath,
          client_id: `user_${Math.random().toString(36).substring(7)}`, // Eindeutige Client-ID hinzufügen
          session_id: Date.now(), // Eindeutige Session-ID hinzufügen
        });
      }, 'G-BLYK1D0REM', relativePath);

      // Simuliere Klicks auf Unterlinks
      for (let i = 0; i < 4; i++) {
        await simulateMouseMoves(page);

        const links = await page.$$eval('a', (anchors) => anchors.map((a) => a.href));
        if (links.length > 0) {
          const randomLink = links[Math.floor(Math.random() * links.length)];
          console.log(`Benutzer ${userNumber} klickt auf ${randomLink}`);
          try {
            await retryNavigation(page, randomLink);

            const subRelativePath = new URL(randomLink, BASE_DOMAIN).pathname;
            await page.evaluate((trackingId, subRelativePath) => {
              window.dataLayer = window.dataLayer || [];
              window.gtag = function gtag() {
                window.dataLayer.push(arguments);
              };
              gtag('config', trackingId, {
                page_path: subRelativePath,
                client_id: `user_${Math.random().toString(36).substring(7)}`,
                session_id: Date.now(),
              });
            }, 'G-BLYK1D0REM', subRelativePath);

            await simulateMouseMoves(page);
          } catch {
            console.log(`Fehler beim Laden des Unterlinks: ${randomLink}. Überspringe diesen Schritt.`);
          }
        }

        await sleep(5000); // 5 Sekunden Pause zwischen den Klicks
      }

      console.log(`Benutzer ${userNumber} hat ${url} abgeschlossen.`);
    }
  } catch (error) {
    console.error(`Fehler bei Benutzer ${userNumber}:`, error);
  } finally {
    await browser.close();
  }
};

// Navigation mit Wiederholungslogik
const retryNavigation = async (page, url, maxRetries = 5) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      console.log(`Versuch ${attempt + 1}, URL zu laden: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log(`URL erfolgreich geladen: ${url}`);
      return;
    } catch (error) {
      attempt++;
      console.warn(`Fehler beim Laden von ${url}, versuche erneut... (${attempt}/${maxRetries})`);
      await sleep(3000); // Warte 3 Sekunden vor erneutem Versuch
    }
  }
  throw new Error(`Maximale Versuche erreicht: ${url}`);
};

// Benutzer gleichzeitig simulieren
const simulateUsersConcurrently = async (urls, totalUsers, maxConcurrentUsers = 30) => {
  let activeUsers = 0;
  let currentUser = 0;

  const simulateNextUser = async () => {
    if (currentUser >= totalUsers) return;

    const userNumber = ++currentUser;
    activeUsers++;

    simulateUser(urls, userNumber)
      .then(() => console.log(`Benutzer ${userNumber} abgeschlossen.`))
      .catch((error) => console.error(`Fehler bei Benutzer ${userNumber}:`, error))
      .finally(() => {
        activeUsers--;
        simulateNextUser();
      });
  };

  for (let i = 0; i < Math.min(maxConcurrentUsers, totalUsers); i++) {
    simulateNextUser();
  }

  while (activeUsers > 0 || currentUser < totalUsers) {
    await sleep(1000);
  }

  console.log('Alle Benutzer abgeschlossen.');
};

// Mausbewegungen simulieren
const simulateMouseMoves = async (page) => {
  const width = await page.evaluate(() => window.innerWidth);
  const height = await page.evaluate(() => window.innerHeight);

  for (let i = 0; i < 5; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    await page.mouse.move(x, y);
    await sleep(500); // 500 ms Pause
  }
};

// Schlaf-Funktion
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stopSimulation = (req, res) => {
  simulationActive = false;
  console.log('Simulation wurde gestoppt.');
  res.send('Simulation gestoppt.');
};


const DOMAIN = 'https://herando.com'; // Angepasste Domain
const simulatePageHerando = async (req, res) => {
  if (req.method === "GET") {
    return res.render('pages/cms/simulateHerando', {
      pageTitle: 'Herando Simulation starten',
      trackingIdGA4: 'G-MRE9HYWZ2B',
      trackingIdGTM: 'GTM-TH2RGMD',
      pagePath: '/simulateHerando',
    });
  }

  if (req.method === "POST") {
    try {
      const { urls = [], visitorCount } = req.body;

      const validUrls = Array.isArray(urls)
        ? urls.map((url) => url.trim()).filter((url) => url.startsWith('/'))
        : [];

      if (validUrls.length === 0 || !visitorCount || isNaN(visitorCount) || visitorCount <= 0) {
        return res.status(400).send('Bitte mindestens eine gültige URL und eine Besucheranzahl angeben.');
      }

      const fullUrls = validUrls.map((path) => `${DOMAIN}${path}`);
      console.log(`Simulation gestartet für ${visitorCount} Benutzer auf den folgenden URLs:`, fullUrls);

      const MAX_PARALLEL_USERS = 5;
      let activeUsers = 0;
      let currentIndex = 0;

      const simulateNextUser = async () => {
        if (currentIndex >= visitorCount) return;

        activeUsers++;
        const userNumber = currentIndex + 1;
        currentIndex++;

        simulateUser(fullUrls, userNumber)
          .then(() => {
            console.log(`Benutzer ${userNumber} abgeschlossen.`);
          })
          .catch((error) => {
            console.error(`Fehler bei Benutzer ${userNumber}:`, error);
          })
          .finally(() => {
            activeUsers--;
            simulateNextUser();
          });
      };

      for (let i = 0; i < Math.min(MAX_PARALLEL_USERS, visitorCount); i++) {
        simulateNextUser();
      }

      const waitForCompletion = () => new Promise((resolve) => {
        const checkCompletion = setInterval(() => {
          if (activeUsers === 0 && currentIndex >= visitorCount) {
            clearInterval(checkCompletion);
            resolve();
          }
        }, 500);
      });

      await waitForCompletion();
      console.log('Simulation abgeschlossen.');

      res.render('pages/cms/simulateHerando', {
        pageTitle: 'Simulation abgeschlossen',
        trackingIdGA4: 'G-MRE9HYWZ2B',
        trackingIdGTM: 'GTM-TH2RGMD',
        pagePath: validUrls[0] || '/simulateHerando',
      });
    } catch (error) {
      console.error('Fehler in simulatePageHerando:', error);
      res.status(500).send('Interner Serverfehler');
    }
  }
};





module.exports = { getChronoWatches };

module.exports = { updateErstelltAm };
module.exports = { updateContent };
module.exports = {
  stopSimulation,
  simulatePage,
  saveCategory,
  getCategories,
  deleteCategory,
  editCategory,
  getUnterkategorien,
  insertUnterkategorie,
  updateUnterkategorie,
  deleteUnterkategorie,
  addContent,
  getContent,
  getCategoriesContent,
  getProfile,
  updateProfile,
  getInserate,
  addBlogCategory,
  getBlogCategories,
  addBlogPost,
  getAddBlogPage,
  getBlogs,
  deleteContent,
  editContentForm,
  updateContent,
  setContentVisible,
  setContentInvisible,
  getInactiveContent,
  setPruefung,
  gepruefteOfflineInserate,
  gepruefteOnlineInserate,
  getContentWithStats,
  getProductDetail,
  getEditProductForm,
  updateProduct,
  updateGalleryOrder,
  updateErstelltAm,
  createOrReplaceWerbeanzeige,
  insertWerbeanzeige,
  updateWerbeanzeige,
  getWerbeanzeigen,
  removeWerbeanzeige,
  insertSpezial,
  updateSpezial,
  getSpezial,
  removeSpezial,
  getKatalog, 
  insertKatalog, 
  updateKatalog,
  removeKatalog, 
  scrapeHerandoData,
  getWatches,
  getChronoWatches,
  showSimulationForm,
  runSimulation, 
  nutzerSimulation,
  simulatePageHerando,
};