const db = require('../config/db'); // Verbindung zur Datenbank

/**
 * AdminPaymentsController - Verwaltung der Zahlungen im Adminpanel
 */
const AdminPaymentsController = async (req, res) => {
    try {
        // 🔹 1️⃣ Alle Zahlungen abrufen (mit Partnerinfos)
        const [payments] = await db.query(`
            SELECT 
                pay.id, 
                p.name AS partner_name, 
                pay.amount, 
                pay.payment_status, 
                pay.payment_method, 
                pay.created_at
            FROM payments pay
            JOIN partners p ON pay.partner_id = p.id
            ORDER BY pay.created_at DESC
            LIMIT 50;
        `);

        // 🔹 2️⃣ Erfolgreiche & fehlgeschlagene Zahlungen berechnen
        const [paymentStats] = await db.query(`
            SELECT 
                SUM(CASE WHEN payment_status = 'success' THEN amount ELSE 0 END) AS successfulPayments,
                SUM(CASE WHEN payment_status = 'failed' THEN amount ELSE 0 END) AS failedPayments
            FROM payments;
        `);

        const successfulPayments = parseFloat(paymentStats[0]?.successfulPayments) || 0;
        const failedPayments = parseFloat(paymentStats[0]?.failedPayments) || 0;

        // 🔹 3️⃣ Offene Zahlungen abrufen (noch nicht bezahlt)
        const [pendingPayments] = await db.query(`
            SELECT 
                pay.id, 
                p.name AS partner_name, 
                pay.amount, 
                pay.created_at 
            FROM payments pay
            JOIN partners p ON pay.partner_id = p.id
            WHERE pay.payment_status = 'pending'
            ORDER BY pay.created_at ASC;
        `);

        // 🔹 4️⃣ Manuelle Zahlungsfreigabe (nur für Admins)
        const [adminRole] = await db.query(
            'SELECT role FROM admin_roles WHERE partnerId = ?',
            [req.session.userId]
        );
        const userRole = adminRole.length ? adminRole[0].role : 'partner';

        res.render('pages/admin/payments', {
            headerTitle: 'Zahlungsverwaltung',
            payments,
            successfulPayments,
            failedPayments,
            pendingPayments,
            currentUrl: req.url,
            userRole
        });

    } catch (error) {
        console.error('Fehler im AdminPaymentsController:', error.message);
        res.status(500).send('Ein Fehler ist aufgetreten.');
    }
};

module.exports = { AdminPaymentsController };
