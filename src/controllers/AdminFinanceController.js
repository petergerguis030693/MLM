const db = require('../config/db'); // Verbindung zur Datenbank

const AdminFinanceController = async (req, res) => {
    try {
        // 🔹 1️⃣ Gesamtumsatz für den aktuellen Monat & Gesamtzeitraum
        const [totalRevenueData] = await db.query(`
            SELECT 
                COALESCE(SUM(amount), 0) AS monthlyRevenue
            FROM payments
            WHERE payment_status = 'success'
            AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
        `);

        const monthlyRevenue = parseFloat(totalRevenueData[0]?.monthlyRevenue) || 0;
        const targetRevenue = 150000; // Statisches Zielumsatz
        const revenueProgress = Math.min((monthlyRevenue / targetRevenue) * 100, 100).toFixed(2);

        // 🔹 2️⃣ Letzte Zahlungen abrufen
        const [payments] = await db.query(`
            SELECT 
                p.name AS partner_name, 
                pay.amount, 
                pay.payment_status, 
                pay.created_at 
            FROM payments pay
            JOIN partners p ON pay.partner_id = p.id
            ORDER BY pay.created_at DESC
            LIMIT 10;
        `);

        // 🔹 3️⃣ Provisionsübersicht abrufen
        const [commissions] = await db.query(`
            SELECT 
                p.name AS partner_name, 
                SUM(pay.amount) AS total_commission
            FROM payments pay
            JOIN partners p ON pay.partner_id = p.id
            WHERE pay.payment_status = 'success'
            GROUP BY p.id
            ORDER BY total_commission DESC
            LIMIT 10;
        `);

        // 🔹 4️⃣ Zahlungstatus-Übersicht (Erfolgreich vs. Fehlgeschlagen)
        const [paymentStats] = await db.query(`
            SELECT 
                SUM(CASE WHEN payment_status = 'success' THEN amount ELSE 0 END) AS successfulPayments,
                SUM(CASE WHEN payment_status = 'failed' THEN amount ELSE 0 END) AS failedPayments
            FROM payments;
        `);

        const successfulPayments = parseFloat(paymentStats[0]?.successfulPayments) || 0;
        const failedPayments = parseFloat(paymentStats[0]?.failedPayments) || 0;

        console.log("✅ Zahlungsstatus Debugging:");
        console.log("Erfolgreiche Zahlungen:", successfulPayments);
        console.log("Fehlgeschlagene Zahlungen:", failedPayments);

        // 🔹 5️⃣ Ausstehende Zahlungen (offene Rechnungen)
        const [pendingPayments] = await db.query(`
            SELECT 
                p.name AS partner_name, 
                pay.amount, 
                pay.created_at 
            FROM payments pay
            JOIN partners p ON pay.partner_id = p.id
            WHERE pay.payment_status = 'pending'
            ORDER BY pay.created_at ASC;
        `);

        // 🔹 6️⃣ Partner, die eine Auszahlung beantragt haben
        const [payoutRequests] = await db.query(`
            SELECT 
                p.name AS partner_name, 
                po.amount, 
                po.requested_at 
            FROM payouts po
            JOIN partners p ON po.partner_id = p.id
            WHERE po.status = 'pending'
            ORDER BY po.requested_at ASC;
        `);

        const [adminRole] = await db.query(
            'SELECT role FROM admin_roles WHERE partnerId = ?',
            [req.session.userId]
        );

        const userRole = adminRole.length ? adminRole[0].role : 'partner';

        const [financials] = await db.query(`
            SELECT 
                COALESCE(SUM(amount), 0) AS monthlyRevenue,
                150000 AS targetRevenue,
                COALESCE(SUM(amount) / COUNT(DISTINCT partner_id), 0) AS avgRevenuePerPartner,
                COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0) AS pendingInvoices,
                COALESCE(SUM(CASE WHEN payment_status = 'success' THEN amount ELSE 0 END), 0) AS successfulPayments,
                COALESCE(SUM(CASE WHEN payment_status = 'failed' THEN amount ELSE 0 END), 0) AS failedPayments
            FROM payments 
            WHERE created_at >= DATE_FORMAT(NOW(), '%Y-%m-01');
        `);

        const revenueProgresss = (financials[0].monthlyRevenue / financials[0].targetRevenue) * 100;

        // 1️⃣ **Echtzeit-Umsatzstatistiken (Monatlich & Gesamt)**
        const [revenueData] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') AS month,
                COALESCE(SUM(amount), 0) AS revenue
            FROM payments
            WHERE payment_status = 'success'
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12;
        `);

        // Falls keine Daten vorhanden sind, setze revenueData auf ein leeres Array
        if (!revenueData || revenueData.length === 0) {
            revenueData = [{ month: 'Keine Daten', revenue: 0 }];
        }


        // 2️⃣ **Tägliche Neuanmeldungen & Partnerbewegungen**
        const [dailyRegistrations] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d') AS day, 
                COUNT(*) AS registrations 
            FROM partners
            GROUP BY day
            ORDER BY day DESC
            LIMIT 7;
        `);

        // 3️⃣ **Letzte 20 Partneraktivitäten**
        const [recentActivities] = await db.query(`
            SELECT 
                p.name AS partner_name, 
                a.activity_type, 
                a.created_at 
            FROM partner_activities a
            JOIN partners p ON a.partner_id = p.id
            ORDER BY a.created_at DESC
            LIMIT 20;
        `);

        // 4️⃣ **Ausstehende Aufgaben für Admins**
        const [pendingTasks] = await db.query(`
            SELECT 
                d.id, 
                d.partner_id, 
                p.name AS partner_name, 
                d.document_type, 
                d.status, 
                d.uploaded_at
            FROM uploads_partners d
            JOIN partners p ON d.partner_id = p.id
            WHERE d.status = 'pending'
            ORDER BY d.uploaded_at ASC
            LIMIT 10;
        `);


        // Daten an die View übergeben
        res.render('pages/admin/financ', {
            headerTitle: 'Finanzübersicht',
            monthlyRevenue,
            targetRevenue,
            revenueProgress,
            payments,
            commissions,
            successfulPayments,
            failedPayments,
            pendingPayments,
            payoutRequests,
            monthlyRevenue: financials[0].monthlyRevenue,
            targetRevenue: financials[0].targetRevenue,
            revenueProgresss: revenueProgresss.toFixed(2),
            avgRevenuePerPartner: financials[0].avgRevenuePerPartner,
            pendingInvoices: financials[0].pendingInvoices,
            successfulPayments: financials[0].successfulPayments,
            failedPayments: financials[0].failedPayments,
            revenueData,
            dailyRegistrations,
            recentActivities,
            pendingTasks,
            currentUrl: req.url,
            userRole,
            currentUrl: req.url
        });

    } catch (error) {
        console.error('Fehler im AdminFinanceController:', error.message);
        res.status(500).send('Ein Fehler ist aufgetreten.');
    }
};




module.exports = { AdminFinanceController };
