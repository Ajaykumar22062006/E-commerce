# BuildMart — Civil Construction Materials E-Commerce Platform

BuildMart is a production-oriented, full-stack B2B/B2C marketplace for civil construction supplies. The platform enables individual home builders, civil contractors, and infrastructure companies to procure certified cement, TMT steel rebars, bricks, sand, and aggregates directly with transparent pricing, delivery PIN code validation, volume discounts, atomic inventory tracking, and online/COD checkout.

---

## 🏗️ Core Features

### 1. Customer Storefront & Catalog
- **10 Core Civil Categories:** Cement (OPC/PPC), Steel & TMT Rebars (Fe 500D/550D), Bricks & AAC Blocks, Sand & Aggregates, Tiles & Flooring, Paints & Waterproofing, Plumbing, Electrical, Roofing, and Construction Tools.
- **Search & Advanced Filters:** Search by product name, SKU, or brand; filter by category, price range, and stock availability; sort by newest, price, or ratings.
- **Technical Specifications:** Displays IS standard certifications (e.g. IS 269:2015, IS 1786:2008), compressive strengths, dimensions, and packaging units (bags, pieces, tonnes, cubic feet).
- **Volume Tiers:** Automatic discount tiers for bulk purchases (e.g. 50+ bags of cement or 80+ bars of rebar).

### 2. Interactive Civil Engineering Estimators
- **Concrete & Cement Slab Estimator:** Length × Width × Thickness calculation outputting exact 50kg cement bags, cubic feet of M-Sand, and 20mm aggregate required based on mix grade (M20, M25, M15).
- **Steel Rebar Weight Estimator:** Standard IS formula ($W = \frac{D^2}{162.2} \text{ kg/m}$) calculating total weight in kilograms, metric tonnes (MT), and 12-meter bar counts.
- **Brick Masonry Estimator:** Wall surface area and thickness calculation outputting total bricks required including standard 10% on-site wastage allowance.

### 3. Shopping Cart, Pincode Logistics & Checkout
- **Server-Side Price Integrity:** All unit rates, discounts, coupons, and line totals are strictly calculated on the backend using trusted MySQL records.
- **Pincode Logistics Checker:** Validates 6-digit delivery PIN codes against configured delivery corridors, displaying transit days and whether heavy tipper vehicles are allowed on site approach roads.
- **Atomic Stock Row Locking:** Prevents overselling during simultaneous checkouts using transactional `SELECT ... FOR UPDATE` row locks.
- **Tax & Freight Computation:** 18% GST calculation on civil goods, free delivery thresholds (₹5,000+), and coupon redemption (`BUILD10`, `BULKPRO`, `FIRSTBUY`).

### 4. Payments Integration
- **Razorpay Online Payments:** Server-side payment order generation, official checkout integration, and HMAC SHA256 cryptographic signature verification.
- **Cash on Delivery (COD):** Direct site payment option upon material arrival and unloading.
- **Webhook Reconciliation:** Idempotent webhook event handler with duplicate protection stored in MySQL.

### 5. Order Tracking & Stock Reversal
- **Unique Order Numbers:** Format `BM-YYYYMMDD-XXXX`.
- **Order Lifecycle Timeline:** Pending → Confirmed → Processing → Shipped → Delivered.
- **Atomic Order Cancellation:** Automatically restores inventory back to MySQL and writes an audit record in `inventory_movements`.
- **1-Click Reorder:** Instantly repopulates current active cart from past orders subject to stock availability.

### 6. Administrator Command Console
- **Real-Time KPIs:** Live total revenue (from paid & confirmed COD orders), order counts, registered contractors, active products, and low-stock alerts.
- **Order Status Transitions:** Status changes validated on the backend with tracking notes appended to the order history.
- **Inventory Movements Ledger:** Full audit trail tracking every deduction, restock, manual adjustment, or cancellation return with actor, quantity, and reason.
- **Products & RFQ Management:** Full product CRUD and review of contractor bulk quotation inquiries with quoted rate dispatch.

---

## 💻 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, React Router DOM v6, Axios, Lucide Icons, Vanilla CSS Design System |
| **Backend** | Node.js (ES Modules), Express.js, JWT, bcryptjs, Morgan, Helmet, CORS, Express-Validator |
| **Database** | MySQL 8.0, `mysql2/promise` connection pooling, Transactions, ACID Foreign Keys |
| **Payments** | Razorpay SDK & Webhook Verification (HMAC SHA-256) |
| **Testing** | Node Test Runner (`node --test`), Supertest, Integration Test Suites |

---

## 📁 Project Directory Structure

```
BuildMart/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BulkInquiryModal.jsx
│   │   │   ├── ConstructionCalculatorModal.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── ProductCard.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── CartContext.jsx
│   │   │   ├── ToastContext.jsx
│   │   │   └── WishlistContext.jsx
│   │   ├── pages/
│   │   │   ├── AccountPage.jsx
│   │   │   ├── AdminDashboardPage.jsx
│   │   │   ├── CartPage.jsx
│   │   │   ├── CheckoutPage.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── OrderConfirmationPage.jsx
│   │   │   ├── ProductDetailPage.jsx
│   │   │   ├── ProductListingPage.jsx
│   │   │   └── RegisterPage.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   └── razorpay.js
│   │   ├── controllers/
│   │   │   ├── adminController.js
│   │   │   ├── authController.js
│   │   │   ├── cartController.js
│   │   │   ├── categoryController.js
│   │   │   ├── couponController.js
│   │   │   ├── inventoryController.js
│   │   │   ├── orderController.js
│   │   │   ├── paymentController.js
│   │   │   ├── productController.js
│   │   │   └── serviceAreaController.js
│   │   ├── database/
│   │   │   ├── migrate.js
│   │   │   ├── schema.sql
│   │   │   ├── seed.js
│   │   │   └── seedData.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── errorHandler.js
│   │   │   ├── rateLimiter.js
│   │   │   └── validate.js
│   │   ├── routes/
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── orderService.js
│   │   ├── utils/
│   │   │   ├── jwt.js
│   │   │   └── logger.js
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   │   ├── auth.test.js
│   │   ├── cart-order-inventory.test.js
│   │   ├── payments.test.js
│   │   └── products.test.js
│   ├── .env.example
│   └── package.json
├── docs/
│   └── API_DOCUMENTATION.md
├── .gitignore
└── README.md
```

---

## 🚀 Quickstart & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MySQL Server**: 8.0 or higher running on port 3306

---

### 1. Database Setup
Ensure MySQL is running and create the `buildmart` database:
```sql
CREATE DATABASE IF NOT EXISTS buildmart;
```

---

### 2. Backend Setup
Navigate into the server directory:
```bash
cd server
npm install
```

Configure your environment file `server/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=buildmart
DB_CONNECTION_LIMIT=10

JWT_SECRET=buildmart_ultra_secure_jwt_secret_key_2026_xyz
JWT_EXPIRES_IN=7d

RAZORPAY_KEY_ID=rzp_test_buildmartDemoKey
RAZORPAY_KEY_SECRET=buildmartSecretDemo12345
RAZORPAY_WEBHOOK_SECRET=buildmart_webhook_secret_key_xyz
```

Run database migrations to generate all 18 tables:
```bash
npm run migrate
```

Seed realistic civil materials, default admin, contractor, pincodes, and coupons:
```bash
npm run seed
```

Start the backend server:
```bash
npm run dev
# Server will run at http://localhost:5000
```

---

### 3. Frontend Setup
In a new terminal window:
```bash
cd client
npm install
```

Configure client environment file `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=rzp_test_buildmartDemoKey
```

Start Vite React client:
```bash
npm run dev
# Client will run at http://localhost:5173
```

---

## 🧪 Automated Testing

BuildMart includes 24 automated unit and integration tests verifying authentication, product searches, cart volume discounts, database transactions, and Razorpay signature verification.

Run all tests:
```bash
cd server
npm test
```

### Test Coverage Highlights:
- **Authentication**: Customer registration, duplicate email rejection, bcrypt login, JWT retrieval, and role enforcement (customer vs admin).
- **Catalog & Logistics**: Active category counts, search keywords ("TMT", "Cement"), slug detail retrieval with IS specifications, and 6-digit PIN code delivery checks.
- **Cart, Orders & Inventory Consistency**: Adding items, volume discount calculation, promo coupon validation, Cash on Delivery placement, atomic inventory deduction, order cancellation, and stock restoration verification.
- **Payments**: Razorpay order initialization, invalid signature rejection, and test-mode signature verification updating orders to `paid`.

---

## 👥 Default Demo Credentials

For quick local testing and evaluation, one-click demo login buttons are provided on the login page, or you can use:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@buildmart.com` | `Admin@BuildMart2026!` | Full operations, analytics, order status updates & inventory adjustments |
| **Contractor** | `contractor@sharma-constructions.com` | `Contractor@2026!` | Sharma Civil & Infrastructure (GST billing, site deliveries) |
| **Customer** | `customer@example.com` | `Customer@2026!` | Individual home builder |

---

## 📦 Serviceable PIN Codes for Testing

The following delivery areas are seeded with configured logistics and shipping rules:
- **`201301`**: Noida Sector 1-18 Zone (1 day transit, heavy tippers allowed, standard fee ₹180)
- **`110001`**: Connaught Place / Central Delhi (1 day transit, heavy tippers allowed, standard fee ₹200)
- **`560001`**: Bangalore Central (2 days transit, heavy tippers allowed, standard fee ₹250)
- **`400001`**: South Mumbai Core (2 days transit, heavy tippers restricted - small vehicle only)
- **`600001`**: Chennai Port Zone (2 days transit, standard fee ₹240)
- **`500001`**: Hyderabad Central (2 days transit, standard fee ₹220)
- **`700001`**: Kolkata Commercial Core (3 days transit, standard fee ₹300)
- **`999999`**: Non-serviceable PIN code (triggers bulk quote recommendation)

---

## 🎟️ Active Demo Coupons
- **`BUILD10`**: 10% instant discount up to ₹1,500 (Minimum order ₹3,000)
- **`BULKPRO`**: 15% discount for high-volume orders over ₹25,000 (Maximum ₹10,000)
- **`FIRSTBUY`**: Flat ₹500 off on first purchase above ₹2,000

---

## 🚢 Production Deployment Instructions

### 1. Database (Managed MySQL)
- Provision a MySQL 8.0 instance on AWS RDS, PlanetScale, or DigitalOcean Managed Databases.
- Set `NODE_ENV=production` and update connection parameters in the backend environment.
- Run `npm run migrate` and `npm run seed` once to establish baseline schemas.

### 2. Backend (Node.js Host)
- Deploy the `server/` directory to Render, Railway, AWS ECS, or DigitalOcean App Platform.
- Set environment variables (`PORT`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `CLIENT_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
- Configure CORS origins to point to the production frontend domain.

### 3. Frontend (Vercel / Cloudflare Pages / Netlify)
- Deploy the `client/` directory with build command `npm run build` and publish directory `dist`.
- Set `VITE_API_URL` to your production backend API domain (e.g. `https://api.buildmart.com/api`).
- Set `VITE_RAZORPAY_KEY_ID` to your production Razorpay Live Key ID.

---

## 📄 License
This project is licensed under the ISC License.
