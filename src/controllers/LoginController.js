const bcrypt = require('bcrypt');
const db = require('../config/db');

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('pages/authentication/page-login', {
      layout: false,
      message: { status: false, text: 'Bitte geben Sie sowohl Benutzername als auch Passwort ein.' },
    });
  }

  try {
    const [user] = await db.query(
      'SELECT id, username, email, password, name FROM partners WHERE email = ? OR username = ?',
      [username, username]
    );

    if (user.length === 0) {
      return res.render('pages/authentication/page-login', {
        layout: false,
        message: { status: false, text: 'Login fehlgeschlagen: Benutzer nicht gefunden.' },
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user[0].password);
    if (!isPasswordCorrect) {
      return res.render('pages/authentication/page-login', {
        layout: false,
        message: { status: false, text: 'Login fehlgeschlagen: Falsches Passwort.' },
      });
    }

    // Sitzung setzen
    req.session.userId = user[0].id;
    req.session.partnerName = user[0].name;

    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Login-Fehler:', error);
    return res.render('pages/authentication/page-login', {
      layout: false,
      message: { status: false, text: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' },
    });
  }
};

module.exports = { login };
