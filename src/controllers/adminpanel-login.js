// logic/adminpanel-login.js
const bcrypt = require('bcrypt'); // Für Passwort-Hashing
const db = require('../config/db'); // Verbindung zur Datenbank

const adminLogin = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('pages/authentication/page-login', {
            layout: false,
            message: { status: false, text: 'Fehler!' }
        });
    }

    try {
        const [admin] = await db.query('SELECT id, email, password, name FROM admins WHERE email = ?', [username]);
        
        if (admin.length === 0) {
            return res.render('pages/authentication/page-login', {
                layout: false,
                message: { status: false, text: 'Fehler!' }
            });
        }

        const isMatch = await bcrypt.compare(password, admin[0].password);
        
        if (!isMatch) {
            return res.render('pages/authentication/admin-login', {
                layout: false,
                message: { status: false, text: 'Login fehlgeschlagen: Falsches Passwort.' },
            });
        }
        
        req.session.adminId = admin[0].id;
        req.session.adminName = admin[0].name;
        
        return res.render('pages/dashboard/index-2');
    } catch (error) {
        console.error(error);
        return res.render('pages/authentication/page-login', {
            layout: false,
            message: { status: false, text: 'Fehler!' }
        });
    }
};

const adminLogout = (req) => {
    return new Promise((resolve) => {
        req.session.destroy(() => {
            resolve();
        });
    });
};

module.exports = { adminLogin, adminLogout };
