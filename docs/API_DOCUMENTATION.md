# BuildMart REST API Documentation

Base URL: `http://localhost:5000/api`

All protected endpoints require an `Authorization` header formatted as:
`Authorization: Bearer <jwt_token>`

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Register a new customer, contractor, or builder account.
- **Request Body:**
  ```json
  {
    "full_name": "Rajesh Sharma",
    "email": "sharma@constructions.com",
    "password": "Password123!",
    "phone": "+91 98111 22334",
    "role": "contractor",
    "company_name": "Sharma Civil & Infrastructure",
    "gstin": "07AAAAA0000A1Z5"
  }
  ```
- **Response:** `201 Created` with user details & JWT session token.

### `POST /api/auth/login`
Authenticate existing user.
- **Request Body:**
  ```json
  {
    "email": "admin@buildmart.com",
    "password": "Admin@BuildMart2026!"
  }
  ```
- **Response:** `200 OK` with user details & JWT session token.

### `GET /api/auth/me` [Protected]
Retrieve profile and saved addresses of the authenticated user.

### `PUT /api/auth/profile` [Protected]
Update name, phone, company, and GSTIN.

### `POST /api/auth/change-password` [Protected]
Change user password.

---

## 2. Product Catalog (`/api/products`)

### `GET /api/products`
Search and filter civil construction catalog.
- **Query Parameters:**
  - `search`: Keyword for name, SKU, brand, or description
  - `category`: Category slug (e.g. `cement`, `steel-tmt-bars`, `bricks-blocks`)
  - `minPrice`: Minimum effective unit price
  - `maxPrice`: Maximum effective unit price
  - `inStock`: `true` to filter out-of-stock items
  - `sortBy`: `newest`, `price_asc`, `price_desc`, `rating`, `name_asc`
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 12)

### `GET /api/products/featured`
Returns top-rated and best-selling construction products for the storefront.

### `GET /api/products/:slug`
Full details of a product including specifications (JSON), multiple photos, and related products.

### `POST /api/products/:id/reviews` [Protected]
Submit a verified customer review (rating 1 to 5, title, comment).

---

## 3. Categories (`/api/categories`)

### `GET /api/categories`
Returns all 10 active civil categories with live product count.

---

## 4. Shopping Cart (`/api/cart`) [Protected]

### `GET /api/cart`
Returns the user's persistent database cart with live stock check, bulk volume discounts, and calculated line totals.

### `POST /api/cart/items`
Add a product or increase quantity in cart.
- **Request Body:**
  ```json
  {
    "product_id": 1,
    "quantity": 5
  }
  ```

### `PUT /api/cart/items/:id`
Update line item quantity.

### `DELETE /api/cart/items/:id`
Remove item from cart.

### `DELETE /api/cart`
Clear cart.

### `POST /api/cart/sync`
Synchronize local guest cart items into database upon login.

---

## 5. Orders & Checkout (`/api/orders`) [Protected]

### `POST /api/orders`
Place a construction order with server-side pricing recalculation, atomic stock deduction, and fraud prevention.
- **Request Body:**
  ```json
  {
    "address_id": 1,
    "payment_method": "cod",
    "coupon_code": "BUILD10",
    "notes": "Gate 2 entry before 9 AM"
  }
  ```
- **Response:** `201 Created` with unique order number (`BM-YYYYMMDD-XXXX`), line items snapshot, 18% GST calculation, and freight charges.

### `GET /api/orders`
Retrieve customer order history.

### `GET /api/orders/:id`
Retrieve full order details with status transition timeline and payment status.

### `POST /api/orders/:id/cancel`
Cancel eligible order and atomically restore warehouse inventory.

### `POST /api/orders/:id/reorder`
Re-add all order items to active cart checking current pricing and stock.

---

## 6. Payments & Razorpay (`/api/payments`)

### `POST /api/payments/razorpay/create-order` [Protected]
Create server-side Razorpay payment order for an existing order.

### `POST /api/payments/razorpay/verify` [Protected]
Verify Razorpay cryptographic signature (HMAC SHA256).

### `POST /api/payments/webhook`
Idempotent Razorpay webhook listener with duplicate event protection.

---

## 7. Delivery Service Areas & PIN Codes (`/api/service-areas`)

### `GET /api/service-areas/check/:pincode`
Check if a postal PIN code is serviceable, transit time, standard shipping charges, and whether heavy commercial tippers are permitted.

---

## 8. Bulk Inquiries & Contractor RFQs (`/api/bulk-inquiries`)

### `POST /api/bulk-inquiries`
Submit high-volume project quotation request with estimated quantity, unit, and delivery PIN code.

### `GET /api/bulk-inquiries/my` [Protected]
View customer's submitted RFQs and quoted rates.

---

## 9. Inventory Management (`/api/inventory`) [Admin Protected]

### `GET /api/inventory`
View live stock levels, low-stock alerts, and out-of-stock items.

### `POST /api/inventory/adjust`
Adjust stock quantity with mandatory audit reason and record in `inventory_movements` ledger.

### `GET /api/inventory/movements`
Full audit trail of all warehouse stock movements.

---

## 10. Administrator Console (`/api/admin`) [Admin Protected]

### `GET /api/admin/dashboard`
Live business metrics (revenue, orders, customers, products, pending dispatches, 7-day sales breakdown).

### `POST /api/admin/products`
Create new material in catalog.

### `PUT /api/admin/products/:id`
Update material price, stock, or specifications.

### `DELETE /api/admin/products/:id`
Deactivate or delete material.

### `GET /api/admin/orders`
Filter, search, and page through all platform orders.

### `PUT /api/admin/orders/:id/status`
Update order status (`confirmed` -> `processing` -> `shipped` -> `delivered` -> `cancelled`) with transition validation.

### `GET /api/admin/bulk-inquiries`
List all contractor RFQs.

### `PUT /api/admin/bulk-inquiries/:id`
Set quoted mill-gate price and update RFQ status.

### `GET /api/admin/customers`
View customer registration details, order counts, and total spend.
