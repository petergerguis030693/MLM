const db = require('../config/db'); // Verbindung zur Datenbank

const AdminDashboardController = async (req, res) => {
    try {
        // 1️⃣ Neue Partner abrufen (letzten 10)
        const [newPartners] = await db.query(`
            SELECT id, name, email, created_at 
            FROM partners 
            ORDER BY created_at DESC 
            LIMIT 10;
        `);

        // 2️⃣ Alle Partner mit direkten und indirekten Partnern + Umsatz abrufen
        const [allPartners] = await db.query(`
            SELECT 
                p.id, p.name, p.email, p.created_at,
                COALESCE((SELECT COUNT(*) FROM partners WHERE sponsor_id = p.id), 0) AS direct_partners,
                COALESCE((SELECT COUNT(*) FROM partners WHERE sponsor_id IN 
                    (SELECT id FROM partners WHERE sponsor_id = p.id)), 0) AS indirect_partners,
                COALESCE((SELECT SUM(amount) FROM payments WHERE partner_id = p.id AND payment_status = 'success'), 0) AS direct_revenue,
                COALESCE((SELECT SUM(amount) FROM payments WHERE partner_id IN 
                    (SELECT id FROM partners WHERE sponsor_id = p.id) 
                    AND payment_status = 'success'), 0) AS indirect_revenue
            FROM partners p;
        `);

        // 3️⃣ Gesamtzahl der Partner berechnen
        const totalDirectPartners = allPartners.reduce((sum, p) => sum + (p.direct_partners || 0), 0);
        const totalIndirectPartners = allPartners.reduce((sum, p) => sum + (p.indirect_partners || 0), 0);
        const totalPartners = allPartners.length;

        // 4️⃣ Zahlungen der Partner abrufen
        const [payments] = await db.query(`
            SELECT p.name, 
                   COALESCE(pay.amount, 0) AS amount, 
                   pay.payment_status, 
                   pay.created_at 
            FROM payments pay
            JOIN partners p ON pay.partner_id = p.id
            ORDER BY pay.created_at DESC
            LIMIT 10;
        `);

        // 5️⃣ Umsatzstatistik abrufen
        const [financials] = await db.query(`
            SELECT 
                COALESCE(SUM(amount), 0) AS monthly_revenue,
                COALESCE((SELECT SUM(amount) FROM payouts WHERE status = 'paid' AND requested_at >= DATE_FORMAT(NOW(), '%Y-%m-01')), 0) AS total_payouts
            FROM payments 
            WHERE payment_status = 'success' 
            AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01');
        `);

        const monthlyRevenue = parseFloat(financials[0]?.monthly_revenue) || 0;
        const totalPayouts = parseFloat(financials[0]?.total_payouts) || 0;
        const companyProfit = monthlyRevenue - totalPayouts;
        const targetRevenue = 150000; // Zielumsatz pro Monat
        const revenueProgress = Math.min((monthlyRevenue / targetRevenue) * 100, 100).toFixed(2);

        // 6️⃣ Umsatzentwicklung der letzten 6 Monate abrufen
        const [revenueDataResult] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') AS month,
                COALESCE(SUM(amount), 0) AS revenue
            FROM payments
            WHERE payment_status = 'success'
            GROUP BY month
            ORDER BY month ASC;
        `);

        // Sicherstellen, dass Werte existieren (falls leer: Standardwerte setzen)
        const revenueMonths = revenueDataResult.length > 0 ? revenueDataResult.map(row => row.month) : ['2025-01'];
        const revenueData = revenueDataResult.length > 0 ? revenueDataResult.map(row => parseFloat(row.revenue)) : [0];

        console.log("📊 Umsatzentwicklung - Monate:", revenueMonths);
        console.log("💰 Umsatzentwicklung - Beträge:", revenueData);

        // 7️⃣ Partnerentwicklung der letzten 6 Monate abrufen
        const [partnerGrowthResult] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') AS month,
                COUNT(*) AS partner_count
            FROM partners
            GROUP BY month
            ORDER BY month ASC;
        `);

        const partnerMonths = partnerGrowthResult.length > 0 ? partnerGrowthResult.map(row => row.month) : ['2025-01'];
        const partnerData = partnerGrowthResult.length > 0 ? partnerGrowthResult.map(row => row.partner_count) : [0];

        console.log("👥 Partnerentwicklung - Monate:", partnerMonths);
        console.log("📈 Partnerentwicklung - Anzahl:", partnerData);

        // 8️⃣ Gesamtumsatz berechnen
        const [totalRevenueData] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) AS total_revenue FROM payments WHERE payment_status = 'success';
        `);
        const totalRevenue = parseFloat(totalRevenueData[0]?.total_revenue) || 0;

        // 9️⃣ Partner mit Stammdaten abrufen
        const [partnerDetails] = await db.query(`
            SELECT 
                p.id, p.name, p.email, 
                COALESCE(s.firmenname, 'Keine Angabe') AS firmenname,
                COALESCE(s.rechtsform, 'Keine Angabe') AS rechtsform, 
                COALESCE(s.umsatzsteuer_id, 'Keine Angabe') AS umsatzsteuer_id, 
                COALESCE(s.strasse_hausnummer, 'Keine Angabe') AS strasse_hausnummer, 
                COALESCE(s.plz, 'Keine Angabe') AS plz, 
                COALESCE(s.ort, 'Keine Angabe') AS ort 
            FROM partners p
            LEFT JOIN stammdaten s ON p.id = s.partner_id;
        `);

        // 🔟 Admin-Rolle abrufen
        const [adminRole] = await db.query(
            'SELECT role FROM admin_roles WHERE partnerId = ?',
            [req.session.userId]
        );
        const userRole = adminRole.length ? adminRole[0].role : 'partner';

        // 🔟.1 Partner-Statistiken abrufen
        const [partnerStats] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM partners) AS total_partners,
                (SELECT COUNT(*) FROM partners WHERE license_paid = 1) AS paid_partners,
                (SELECT COUNT(*) FROM partners WHERE license_paid = 0) AS unpaid_partners
        `);

        const paidPartners = partnerStats[0]?.paid_partners || 0;
        const unpaidPartners = partnerStats[0]?.unpaid_partners || 0;

        // 🛠 **Alle Daten an die View übergeben**
        res.render('pages/admin/admin-dashboard', {
            headerTitle: 'Admin Dashboard',
            newPartners,
            allPartners,
            partnerDetails,
            payments,
            totalDirectPartners,
            totalIndirectPartners,
            totalPartners,
            monthlyRevenue,
            totalPayouts,
            companyProfit,
            totalRevenue,
            targetRevenue,
            revenueProgress,
            revenueMonths,
            revenueData,
            partnerMonths,
            partnerData,
            paidPartners,
            unpaidPartners,
            userRole,
            currentUrl: req.url
        });

    } catch (error) {
        console.error('❌ Fehler im AdminDashboardController:', error.message);
        res.status(500).send('Ein Fehler ist aufgetreten.');
    }
};

module.exports = { AdminDashboardController };
