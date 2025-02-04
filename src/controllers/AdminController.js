const DataArray = require('../config/constant-array');
const db = require('../config/db'); // Verbindung zur Datenbank

const DashboardController = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/login');
    }

    const userId = req.session.userId;
    const partnerName = req.session.partnerName || 'Partner';

    // Direkte Partner zählen
    const [directResult] = await db.query(`
      SELECT 
        COUNT(*) AS totalDirectPartners,
        SUM(CASE WHEN license_paid = 1 THEN 1 ELSE 0 END) AS paidDirectPartners,
        SUM(CASE WHEN license_paid = 0 THEN 1 ELSE 0 END) AS unpaidDirectPartners
      FROM partners
      WHERE sponsor_id = ?;
    `, [userId]);

    const totalDirectPartners = directResult[0].totalDirectPartners || 0;
    const paidDirectPartners = directResult[0].paidDirectPartners || 0;
    const unpaidDirectPartners = directResult[0].unpaidDirectPartners || 0;

    // Indirekte Partner zählen
    const [indirectResult] = await db.query(`
      WITH RECURSIVE PartnerTree AS (
        SELECT id, sponsor_id, license_paid, 1 AS level
        FROM partners
        WHERE sponsor_id = ?

        UNION ALL

        SELECT p.id, p.sponsor_id, p.license_paid, pt.level + 1
        FROM partners p
        INNER JOIN PartnerTree pt ON p.sponsor_id = pt.id
        WHERE pt.level < 16
      )
      SELECT 
        COUNT(*) AS totalIndirectPartners,
        SUM(CASE WHEN license_paid = 1 THEN 1 ELSE 0 END) AS paidIndirectPartners,
        SUM(CASE WHEN license_paid = 0 THEN 1 ELSE 0 END) AS unpaidIndirectPartners
      FROM PartnerTree
      WHERE level > 1;
    `, [userId]);

    const totalIndirectPartners = indirectResult[0].totalIndirectPartners || 0;
    const paidIndirectPartners = indirectResult[0].paidIndirectPartners || 0;
    const unpaidIndirectPartners = indirectResult[0].unpaidIndirectPartners || 0;

    // Gesamtzahlen berechnen
    const totalPaidPartners = paidDirectPartners + paidIndirectPartners;
    const totalUnpaidPartners = unpaidDirectPartners + unpaidIndirectPartners;
    const totalPartners = totalDirectPartners + totalIndirectPartners;

    // Partneranzahl vom letzten Monat (simulierter Wert oder aus Datenbank holen)
    const [lastMonthResult] = await db.query(`
      SELECT 
        COUNT(*) AS lastMonthTotalPartners
      FROM partners
      WHERE sponsor_id = ? AND created_at BETWEEN DATE_SUB(CURDATE(), INTERVAL 2 MONTH) AND DATE_SUB(CURDATE(), INTERVAL 1 MONTH);
    `, [userId]);

    const lastMonthTotalPartners = lastMonthResult[0].lastMonthTotalPartners || 0;

    // Prozentuale Änderung berechnen
    const percentageChange = lastMonthTotalPartners
      ? (((totalPartners - lastMonthTotalPartners) / lastMonthTotalPartners) * 100).toFixed(2)
      : 0;

    console.log(`
      Partner: ${partnerName} (ID: ${userId})
      - Direkte Partner: Gesamt = ${totalDirectPartners}, Bezahlt = ${paidDirectPartners}, Unbezahlt = ${unpaidDirectPartners}
      - Indirekte Partner: Gesamt = ${totalIndirectPartners}, Bezahlt = ${paidIndirectPartners}, Unbezahlt = ${unpaidIndirectPartners}
      - Gesamt: Bezahlt = ${totalPaidPartners}, Unbezahlte = ${totalUnpaidPartners}, Alle = ${totalPartners}
      - Änderung seit letztem Monat: ${percentageChange}%
    `);

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
            SUM(c.commission_amount) AS totalProvision
          FROM PartnerTree pt
          INNER JOIN commissions c ON pt.id = c.partner_id
          WHERE c.payout_status = 0
          GROUP BY pt.level
          ORDER BY pt.level;
    `, [userId]);

    const provisions = provisionsResult.map(row => ({
      level: row.level,
      totalAmount: parseFloat(row.totalAmount) || 0,
      totalProvision: parseFloat(row.totalProvision) || 0,
    }));

    // Gesamtprovision berechnen
    const totalProvision = provisions.reduce((sum, row) => sum + row.totalProvision, 0);

    console.log(`Provisionen für Partner ${partnerName} (ID: ${userId}):`, provisions);
    console.log(`Gesamtprovision für Auszahlung: ${totalProvision.toFixed(2)} €`);

    const [revenueResult] = await db.query(`
      SELECT SUM(amount) AS totalRevenue
      FROM payments
      WHERE partner_id = ? AND payment_status = 'success';
    `, [userId]);

    // Umsatz auf 0 setzen, wenn kein Umsatz gefunden wurde
    const totalRevenue = revenueResult[0].totalRevenue ? parseFloat(revenueResult[0].totalRevenue) : 0;

    // Zielumsatz (statisch oder dynamisch)
    const targetRevenue = 15000; // Beispiel: Zielumsatz von 15.000 €

    // Fortschritt berechnen
    const progress = Math.min((totalRevenue / targetRevenue) * 100, 100).toFixed(2);

    const [statistics] = await db.query(`
      SELECT 
        COUNT(*) AS totalProjects,
        SUM(CASE WHEN payment_status = 'success' THEN 1 ELSE 0 END) AS onGoing,
        SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) AS unfinished
      FROM payments
      WHERE partner_id = ?;
    `, [userId]);

    const totalProjects = statistics[0].totalProjects || 0;
    const onGoing = statistics[0].onGoing || 0;
    const unfinished = statistics[0].unfinished || 0;

    const completedPercentage = totalProjects > 0 ? ((onGoing / totalProjects) * 100).toFixed(2) : 0;

    const [tasks] = await db.query(`
      SELECT tasks.*, customers.name AS customer_name 
      FROM tasks
      INNER JOIN customers ON tasks.customer_id = customers.id
      WHERE tasks.partner_id = ? AND tasks.status != 'completed'
    `, [userId]);

    // Benutzer-Daten abrufen, falls `req.user` nicht funktioniert
    const [userResult] = await db.execute('SELECT * FROM partners WHERE id = ?', [userId]);

    if (userResult.length === 0) {
      return res.redirect('/login');
    }

    const user = userResult[0];

    console.log("✅ Eingeloggter User:", user);

    const [adminRole] = await db.execute(
      'SELECT role FROM admin_roles WHERE partnerId = ?',
      [user.id]
    );

    const userRole = adminRole.length ? adminRole[0].role : 'partner';

    res.render('pages/dashboard/index', {
      headerTitle: 'Dashboard',
      partnerName,
      totalDirectPartners,   // Gesamtzahl der direkten Partner
      paidDirectPartners,    // Bezahlte direkte Partner
      unpaidDirectPartners,  // Unbezahlte direkte Partner
      totalIndirectPartners, // Gesamtzahl der indirekten Partner
      paidIndirectPartners,  // Bezahlte indirekte Partner
      unpaidIndirectPartners,// Unbezahlte indirekte Partner
      totalPaidPartners,     // Gesamt bezahlte Partner
      totalUnpaidPartners,   // Gesamt unbezahlte Partner
      totalPartners,         // Alle Partner insgesamt
      percentageChange,      // Prozentuale Änderung der Partnerzahl
      provisions, // Provisionsdaten an die View übergeben
      totalProvision, // Gesamtprovision für die View
      totalRevenue: totalRevenue.toFixed(2),
      targetRevenue: targetRevenue.toFixed(2),
      progress, // Fortschritt in Prozent
      totalProjects,
      onGoing,
      unfinished,
      completedPercentage,
      tasks,
      userRole,
      currentUrl: req.url,
    });
  } catch (error) {
    console.error('Fehler im DashboardController:', error.message);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
};

module.exports = { DashboardController };



// ----- ROUTER (routes.js) -----
const express = require('express');
const router = express.Router();
const AdminControllers = require('../controllers/AdminController');
const LoginController = require('../controllers/LoginController');

router.get('/login', (req, res) => {
  res.render('pages/authentication/page-login', { layout: false, message: null });
});
router.post('/login', LoginController.login);

router.get('/dashboard', AdminControllers.DashboardController);

router.get('*', (req, res) => {
  res.status(404).render('pages/error/page-error-404', { layout: false });
});



// project Controller ---------------
const ProjectController = async (req, res) => {
  const url = req.url;
  const data = DataArray.ProjectListArray;
  res.render("project-page", { currentUrl: url, data: data, login_user: req.user, headerTitle: 'Project' });
}

// Contacts Controller ---------------
const ContactController = async (req, res) => {
  const url = req.url;
  const data = DataArray.ContactListArray;
  res.render("contacts", { currentUrl: url, data: data, login_user: req.user, headerTitle: 'Contacts' });
}

module.exports = {
  DashboardController,
  ProjectController,
  ContactController
}
