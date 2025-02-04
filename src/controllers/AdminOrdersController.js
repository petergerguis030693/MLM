const db = require('../config/db'); // Verbindung zur Datenbank

const AdminOrdersController = async (req, res) => {
    const userId = req.session.userId;

    try {
        // 🔹 Bestellungen abrufen
        const [orders] = await db.query(`
            SELECT 
                o.id, 
                o.order_number, 
                o.amount, 
                o.status, 
                o.created_at,
                c.name AS customer_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            ORDER BY o.created_at DESC;
        `);

        // 🔹 Bestellstatus (Erfolgreich vs. Storniert)
        const [orderStats] = await db.query(`
            SELECT 
                COUNT(CASE WHEN status = 'completed' THEN 1 END) AS successfulOrders,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelledOrders
            FROM orders;
        `);
        
        const [orderStatss] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%b') AS month, 
                COUNT(*) AS value 
            FROM orders 
            GROUP BY month 
            ORDER BY created_at ASC
        `);

        // 🔹 Gesamtumsatz aus Bestellungen
        const [totalRevenueData] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) AS totalRevenue FROM orders WHERE status = 'completed';
        `);
        const totalRevenue = parseFloat(totalRevenueData[0]?.totalRevenue) || 0;

        // 🔹 Bestellungen pro Monat (für Diagramme)
        const [monthlyOrders] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') AS month, 
                COUNT(*) AS orderCount 
            FROM orders 
            GROUP BY month 
            ORDER BY month ASC;
        `);

        // 🔹 Offene Zahlungen abrufen
        const [pendingPayments] = await db.query(`
            SELECT 
                p.id, 
                p.partner_id, 
                p.amount, 
                p.payment_status, 
                p.created_at,
                pa.name AS partner_name
            FROM payments p
            JOIN partners pa ON p.partner_id = pa.id
            WHERE p.payment_status = 'pending'
            ORDER BY p.created_at DESC;
        `);


        

        // 🔹 Adminrolle abrufen
        const [adminRole] = await db.query(`SELECT role FROM admin_roles WHERE partnerId = ?`, [userId]);
        const userRole = adminRole.length > 0 ? adminRole[0].role : 'partner';

        res.render('pages/admin/orders', {
            headerTitle: 'Bestellverwaltung',
            orders,
            orderStatss,
            successfulOrders: orderStats[0]?.successfulOrders || 0,
            cancelledOrders: orderStats[0]?.cancelledOrders || 0,
            totalRevenue,
            monthlyOrders,
            pendingPayments,
            userRole,
            currentUrl: req.url
        });

    } catch (error) {
        console.error('Fehler im AdminOrdersController:', error.message);
        res.status(500).send('Ein Fehler ist aufgetreten.');
    }
};

// 🔹 Zahlungstatus ändern (AJAX)
const updatePaymentStatus = async (req, res) => {
    const { paymentId, newStatus } = req.body;

    try {
        await db.query(`UPDATE payments SET payment_status = ? WHERE id = ?`, [newStatus, paymentId]);
        return res.json({ success: true, message: "✅ Zahlungsstatus aktualisiert!" });
    } catch (error) {
        console.error("❌ Fehler beim Aktualisieren des Zahlungsstatus:", error.message);
        return res.status(500).json({ success: false, message: "Fehler beim Aktualisieren!" });
    }
};


module.exports = { AdminOrdersController, updatePaymentStatus };
