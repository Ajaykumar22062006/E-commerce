-- Migration: 014_create_bulk_inquiries_table
-- Description: Create B2B contractor & builder bulk material quotation inquiries table

CREATE TABLE IF NOT EXISTS bulk_inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inquiry_number VARCHAR(30) NOT NULL UNIQUE,
    user_id INT DEFAULT NULL,
    customer_name VARCHAR(150) NOT NULL,
    email VARCHAR(191) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    company_name VARCHAR(150) DEFAULT NULL,
    product_id INT NOT NULL,
    estimated_quantity INT NOT NULL,
    unit_of_measure VARCHAR(30) NOT NULL,
    delivery_pincode VARCHAR(10) NOT NULL,
    project_details TEXT DEFAULT NULL,
    status ENUM('submitted', 'in_review', 'quoted', 'rejected', 'fulfilled') NOT NULL DEFAULT 'submitted',
    quoted_price_per_unit DECIMAL(12,2) DEFAULT NULL,
    admin_notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_bi_status (status),
    INDEX idx_bi_number (inquiry_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
