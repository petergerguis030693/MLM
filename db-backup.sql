DROP TABLE IF EXISTS `admin_roles`;

CREATE TABLE
  `admin_roles` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `partnerId` int (11) NOT NULL,
    `role` enum ('admin', 'superadmin', 'moderator') NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `partnerId` (`partnerId`),
    CONSTRAINT `admin_roles_ibfk_1` FOREIGN KEY (`partnerId`) REFERENCES `partners` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 5 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_roles`
--
LOCK TABLES `admin_roles` WRITE;

/*!40000 ALTER TABLE `admin_roles` DISABLE KEYS */;

INSERT INTO
  `admin_roles`
VALUES
  (3, 3, 'admin', '2025-01-29 23:23:23'),
  (4, 4, 'admin', '2025-01-29 23:23:25');

/*!40000 ALTER TABLE `admin_roles` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `admins`
--
DROP TABLE IF EXISTS `admins`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `admins` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `email` varchar(255) NOT NULL,
    `password` varchar(255) NOT NULL,
    `role` enum ('admin', 'super_admin') DEFAULT 'admin',
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `email` (`email`)
  ) ENGINE = InnoDB AUTO_INCREMENT = 5 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--
LOCK TABLES `admins` WRITE;

/*!40000 ALTER TABLE `admins` DISABLE KEYS */;

INSERT INTO
  `admins`
VALUES
  (
    1,
    'Administrator',
    'office@herando.com',
    '$2a$10$zJ8Yb5kD1/8Jz0L5r3nMse.5q2hFvHUa9Jcz0B1d2KIdJ5bB6LxC.',
    'super_admin',
    '2025-01-29 21:56:08'
  ),
  (
    4,
    'Administrator',
    'admin@herando.com',
    '$2b$10$GB0rmF7yYdI2IZy7Rbz8N.zuWBxeJh9ImJ0QSYc9Rjt8CTaUuG.l6',
    'admin',
    '2025-01-29 22:29:11'
  );

/*!40000 ALTER TABLE `admins` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `cards`
--
DROP TABLE IF EXISTS `cards`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `cards` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `partner_id` int (11) NOT NULL,
    `card_type` enum ('debit', 'credit', 'other') NOT NULL,
    `card_holder_name` varchar(255) NOT NULL,
    `created_at` datetime DEFAULT current_timestamp(),
    `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    `swift_code` varchar(11) NOT NULL,
    `iban` varchar(20) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `partner_id` (`partner_id`),
    CONSTRAINT `cards_ibfk_1` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`)
  ) ENGINE = InnoDB AUTO_INCREMENT = 4 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cards`
--
LOCK TABLES `cards` WRITE;

/*!40000 ALTER TABLE `cards` DISABLE KEYS */;

INSERT INTO
  `cards`
VALUES
  (
    2,
    4,
    'debit',
    'PEter G',
    '2025-01-26 13:32:29',
    '2025-01-26 13:32:29',
    '',
    ''
  );

/*!40000 ALTER TABLE `cards` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `commissions`
--
DROP TABLE IF EXISTS `commissions`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `commissions` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `payment_id` int (11) NOT NULL,
    `partner_id` int (11) NOT NULL,
    `level` int (11) NOT NULL,
    `commission_amount` decimal(10, 2) NOT NULL,
    `payout_status` tinyint (1) DEFAULT 0,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `payment_id` (`payment_id`),
    KEY `partner_id` (`partner_id`),
    CONSTRAINT `commissions_ibfk_1` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`),
    CONSTRAINT `commissions_ibfk_2` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`)
  ) ENGINE = InnoDB AUTO_INCREMENT = 40 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commissions`
--
LOCK TABLES `commissions` WRITE;

--
-- Table structure for table `conversations`
--
DROP TABLE IF EXISTS `conversations`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `conversations` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `participant1_id` int (11) NOT NULL,
    `participant2_id` int (11) NOT NULL,
    `created_at` datetime DEFAULT current_timestamp(),
    `last_message_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `participant1_id` (`participant1_id`),
    KEY `participant2_id` (`participant2_id`),
    CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`participant1_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE,
    CONSTRAINT `conversations_ibfk_2` FOREIGN KEY (`participant2_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversations`
--
LOCK TABLES `conversations` WRITE;

/*!40000 ALTER TABLE `conversations` DISABLE KEYS */;

/*!40000 ALTER TABLE `conversations` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `country_commissions`
--
DROP TABLE IF EXISTS `country_commissions`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `country_commissions` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `country` varchar(255) NOT NULL,
    `revenue` decimal(10, 2) NOT NULL,
    `partner_id` int (11) DEFAULT NULL,
    `commission` decimal(10, 2) DEFAULT 0.00,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `partner_id` (`partner_id`),
    CONSTRAINT `country_commissions_ibfk_1` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE SET NULL
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `country_commissions`
--
LOCK TABLES `country_commissions` WRITE;

/*!40000 ALTER TABLE `country_commissions` DISABLE KEYS */;

/*!40000 ALTER TABLE `country_commissions` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `customer_interactions`
--
DROP TABLE IF EXISTS `customer_interactions`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `customer_interactions` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `customer_id` int (11) NOT NULL,
    `interaction_type` enum ('email', 'call', 'purchase') NOT NULL,
    `interaction_date` timestamp NOT NULL DEFAULT current_timestamp(),
    `details` text DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `customer_id` (`customer_id`),
    CONSTRAINT `customer_interactions_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_interactions`
--
LOCK TABLES `customer_interactions` WRITE;

/*!40000 ALTER TABLE `customer_interactions` DISABLE KEYS */;

/*!40000 ALTER TABLE `customer_interactions` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `customers`
--
DROP TABLE IF EXISTS `customers`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `customers` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `partner_id` int (11) NOT NULL,
    `name` varchar(255) NOT NULL,
    `email` varchar(255) NOT NULL,
    `phone` varchar(20) DEFAULT NULL,
    `address` text DEFAULT NULL,
    `status` enum ('lead', 'customer', 'inactive') DEFAULT 'lead',
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `email` (`email`),
    KEY `fk_customers_partners` (`partner_id`),
    CONSTRAINT `fk_customers_partners` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 12 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--
LOCK TABLES `customers` WRITE;

/*!40000 ALTER TABLE `customers` DISABLE KEYS */;

/*!40000 ALTER TABLE `customers` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `incentives`
--
DROP TABLE IF EXISTS `incentives`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `incentives` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `start_date` date NOT NULL,
    `end_date` date NOT NULL,
    `target_revenue` decimal(10, 2) NOT NULL,
    `reward` varchar(255) NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `incentives`
--
LOCK TABLES `incentives` WRITE;

/*!40000 ALTER TABLE `incentives` DISABLE KEYS */;

/*!40000 ALTER TABLE `incentives` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `invoice`
--
DROP TABLE IF EXISTS `invoice`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `invoice` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `partner_id` int (11) NOT NULL,
    `invoice_number` varchar(255) NOT NULL,
    `amount` decimal(10, 2) NOT NULL,
    `tax` decimal(10, 2) NOT NULL,
    `total_amount` decimal(10, 2) NOT NULL,
    `status` enum ('pending', 'paid') DEFAULT 'pending',
    `issued_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `paid_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
    PRIMARY KEY (`id`),
    UNIQUE KEY `invoice_number` (`invoice_number`),
    KEY `partner_id` (`partner_id`),
    CONSTRAINT `invoice_ibfk_1` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice`
--
LOCK TABLES `invoice` WRITE;

/*!40000 ALTER TABLE `invoice` DISABLE KEYS */;

/*!40000 ALTER TABLE `invoice` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `library_files`
--
DROP TABLE IF EXISTS `library_files`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `library_files` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `file_name` varchar(255) NOT NULL,
    `file_path` text NOT NULL,
    `uploaded_by` int (11) NOT NULL,
    `partner_id` int (11) NOT NULL,
    `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `partner_id` (`partner_id`),
    CONSTRAINT `library_files_ibfk_1` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `library_files`
--
LOCK TABLES `library_files` WRITE;

/*!40000 ALTER TABLE `library_files` DISABLE KEYS */;

/*!40000 ALTER TABLE `library_files` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `messages`
--
DROP TABLE IF EXISTS `messages`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `messages` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `sender_id` int (11) NOT NULL,
    `receiver_id` int (11) NOT NULL,
    `subject` varchar(255) DEFAULT 'Kein Betreff',
    `message_content` text NOT NULL,
    `is_read` tinyint (1) DEFAULT 0,
    `sent_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `sender_id` (`sender_id`),
    KEY `receiver_id` (`receiver_id`),
    CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `partners` (`id`),
    CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `partners` (`id`)
  ) ENGINE = InnoDB AUTO_INCREMENT = 5 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--
LOCK TABLES `messages` WRITE;

/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `orders`
--
DROP TABLE IF EXISTS `orders`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `orders` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `partner_id` int (11) NOT NULL,
    `amount` decimal(10, 2) NOT NULL,
    `status` enum (
      'pending',
      'paid',
      'shipped',
      'completed',
      'cancelled'
    ) DEFAULT 'pending',
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    `order_number` int (11) DEFAULT NULL,
    `customer_id` int (11) DEFAULT NULL,
    `product` enum ('Lizenzgebhr', 'Kundenprodukt') NOT NULL DEFAULT 'Lizenzgebhr',
    PRIMARY KEY (`id`),
    KEY `partner_id` (`partner_id`),
    KEY `fk_customer_id` (`customer_id`),
    CONSTRAINT `fk_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 21 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;


/*!40000 ALTER TABLE `orders` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `partner_activities`
--
DROP TABLE IF EXISTS `partner_activities`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `partner_activities` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `partner_id` int (11) NOT NULL,
    `activity_type` varchar(255) NOT NULL,
    `description` text DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `partner_id` (`partner_id`),
    CONSTRAINT `partner_activities_ibfk_1` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partner_activities`
--
LOCK TABLES `partner_activities` WRITE;

/*!40000 ALTER TABLE `partner_activities` DISABLE KEYS */;

/*!40000 ALTER TABLE `partner_activities` ENABLE KEYS */;

UNLOCK TABLES;

-

--
-- Table structure for table `partner_incentives`
--
DROP TABLE IF EXISTS `partner_incentives`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `partner_incentives` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `partner_id` int (11) NOT NULL,
    `incentive_id` int (11) NOT NULL,
    `achieved` tinyint (1) DEFAULT 0,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `partner_id` (`partner_id`),
    KEY `incentive_id` (`incentive_id`),
    CONSTRAINT `partner_incentives_ibfk_1` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE,
    CONSTRAINT `partner_incentives_ibfk_2` FOREIGN KEY (`incentive_id`) REFERENCES `incentives` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partner_incentives`
--
LOCK TABLES `partner_incentives` WRITE;

/*!40000 ALTER TABLE `partner_incentives` DISABLE KEYS */;

/*!40000 ALTER TABLE `partner_incentives` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `partner_links`
--
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partner_links`
--
LOCK TABLES `partner_links` WRITE;

/*!40000 ALTER TABLE `partner_links` DISABLE KEYS */;

/*!40000 ALTER TABLE `partner_links` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `partner_logs`
--
DROP TABLE IF EXISTS `partner_logs`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `partner_logs` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `partner_id` int (11) NOT NULL,
    `action` varchar(255) NOT NULL,
    `old_value` text DEFAULT NULL,
    `new_value` text DEFAULT NULL,
    `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `partner_id` (`partner_id`),
    CONSTRAINT `partner_logs_ibfk_1` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 8 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partner_logs`
--
LOCK TABLES `partner_logs` WRITE;

/*!40000 ALTER TABLE `partner_logs` DISABLE KEYS */;

/*!40000 ALTER TABLE `partner_logs` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `partners`
--
DROP TABLE IF EXISTS `partners`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `partners` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `username` varchar(255) NOT NULL,
    `password` varchar(255) NOT NULL,
    `name` varchar(255) NOT NULL,
    `email` varchar(255) NOT NULL,
    `sponsor_id` int (11) DEFAULT NULL,
    `license_paid` tinyint (1) DEFAULT 0,
    `is_active` tinyint (1) DEFAULT 0,
    `registration_verified` tinyint (1) DEFAULT 0,
    `country` varchar(255) DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `username` (`username`),
    UNIQUE KEY `email` (`email`),
    KEY `sponsor_id` (`sponsor_id`),
    CONSTRAINT `partners_ibfk_1` FOREIGN KEY (`sponsor_id`) REFERENCES `partners` (`id`) ON DELETE SET NULL
  ) ENGINE = InnoDB AUTO_INCREMENT = 36 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partners`
--
LOCK TABLES `partners` WRITE;

/*!40000 ALTER TABLE `partners` DISABLE KEYS */;

INSERT INTO
  `partners`
VALUES
  (
    3,
    'Herando A.S',
    '$2a$12$MA2WnRm8o.xllDJPDksWuu5pSbyfyo3eyRhYFKKeSZpSbFqZz2m1u',
    'Frank Müller, CEO',
    'office@herando.com',
    NULL,
    0,
    1,
    1,
    'Switzerland',
    '2025-01-21 13:05:45'
  ),
  (
    4,
    'Peter Gerguis',
    '$2a$12$ezOmD.ZFqInMjQHO.JiRrOgqh3f4MQAk2EPYU1qH.F6CdxzJqd4tK',
    'Peter Gerguis',
    'peter.gerguis@gmail.com',
    3,
    0,
    1,
    1,
    'Switzerland',
    '2025-01-21 17:35:34'
  );

/*!40000 ALTER TABLE `partners` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `payments`
--
DROP TABLE IF EXISTS `payments`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `payments` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `email` varchar(255) NOT NULL,
    `partner_id` int (11) NOT NULL,
    `amount` decimal(10, 2) NOT NULL,
    `payment_status` enum ('success', 'failed') NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `commission_payout` tinyint (1) DEFAULT 0,
    `commission_payouts` tinyint (1) DEFAULT NULL,
    PRIMARY KEY (`id`)
  ) ENGINE = InnoDB AUTO_INCREMENT = 33 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--
LOCK TABLES `payments` WRITE;

/*!40000 ALTER TABLE `payments` DISABLE KEYS */;

/*!40000 ALTER TABLE `payments` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `payouts`
--
DROP TABLE IF EXISTS `payouts`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `payouts` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `partner_id` int (11) NOT NULL,
    `amount` decimal(10, 2) NOT NULL,
    `status` enum ('pending', 'approved', 'paid', 'failed') DEFAULT 'pending',
    `admin_id` int (11) DEFAULT NULL,
    `requested_at` datetime DEFAULT current_timestamp(),
    `approved_at` datetime DEFAULT NULL,
    `paid_at` datetime DEFAULT NULL,
    `failure_reason` varchar(255) DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `partner_id` (`partner_id`),
    KEY `admin_id` (`admin_id`),
    CONSTRAINT `payouts_ibfk_1` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`),
    CONSTRAINT `payouts_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`)
  ) ENGINE = InnoDB AUTO_INCREMENT = 47 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payouts`
--
LOCK TABLES `payouts` WRITE;

/*!40000 ALTER TABLE `payouts` DISABLE KEYS */;

/*!40000 ALTER TABLE `payouts` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `sales_pipeline`
--
DROP TABLE IF EXISTS `sales_pipeline`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `sales_pipeline` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `customer_id` int (11) NOT NULL,
    `stage` enum ('new', 'contacted', 'proposal', 'won', 'lost') DEFAULT 'new',
    `probability` int (11) DEFAULT 0,
    `expected_revenue` decimal(10, 2) DEFAULT NULL,
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `customer_id` (`customer_id`),
    CONSTRAINT `sales_pipeline_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_pipeline`
--
LOCK TABLES `sales_pipeline` WRITE;

/*!40000 ALTER TABLE `sales_pipeline` DISABLE KEYS */;

/*!40000 ALTER TABLE `sales_pipeline` ENABLE KEYS */;

UNLOCK TABLES;

--
-- Table structure for table `stammdaten`
--
DROP TABLE IF EXISTS `stammdaten`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `stammdaten` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `partner_id` int (11) NOT NULL,
    `firmenname` varchar(255) DEFAULT NULL,
    `rechtsform` enum ('GmbH', 'UG', 'Einzelunternehmer', 'Sonstiges') NOT NULL,
    `umsatzsteuer_id` varchar(50) DEFAULT NULL,
    `strasse_hausnummer` varchar(255) NOT NULL,
    `plz` varchar(10) NOT NULL,
    `ort` varchar(255) NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `partner_id` (`partner_id`),
    CONSTRAINT `stammdaten_ibfk_1` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 14 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stammdaten`
--
LOCK TABLES `stammdaten` WRITE;

UNLOCK TABLES;

--
-- Table structure for table `tasks`
--
DROP TABLE IF EXISTS `tasks`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `tasks` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `customer_id` int (11) NOT NULL,
    `partner_id` int (11) NOT NULL,
    `task_description` text NOT NULL,
    `due_date` date NOT NULL,
    `status` enum ('open', 'in_progress', 'completed') DEFAULT 'open',
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `customer_id` (`customer_id`),
    KEY `partner_id` (`partner_id`),
    CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
    CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 7 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--
LOCK TABLES `tasks` WRITE;


--
-- Table structure for table `uploads_partners`
--
DROP TABLE IF EXISTS `uploads_partners`;

/*!40101 SET @saved_cs_client     = @@character_set_client */;

/*!40101 SET character_set_client = utf8 */;

CREATE TABLE
  `uploads_partners` (
    `id` int (11) NOT NULL AUTO_INCREMENT,
    `partner_id` int (11) NOT NULL,
    `document_type` enum (
      'passport',
      'personalausweis',
      'meldezettel',
      'gewerberegister'
    ) NOT NULL,
    `file_path` varchar(255) NOT NULL,
    `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `status` enum ('pending', 'approved', 'rejected') DEFAULT 'pending',
    `rejection_reason` text DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `partner_id` (`partner_id`),
    CONSTRAINT `uploads_partners_ibfk_1` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 34 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
LOCK TABLES `uploads_partners` WRITE;

