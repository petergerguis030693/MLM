const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Speicherort für temporäre Dateien
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/temp');

    // Überprüfen, ob der Ordner existiert, und erstellen, falls nicht
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true }); // Erstellt auch übergeordnete Ordner
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// Datei-Filter: Nur bestimmte Typen zulassen
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Datei akzeptieren
  } else {
    cb(new Error('Ungültiger Dateityp. Nur PDF, JPEG und PNG sind erlaubt.'), false); // Datei ablehnen
  }
};

// Multer-Instance mit Speicher und Filter
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1000 * 1024 * 1024, // 1000 MB maximale Dateigröße
  },
});

module.exports = upload;
