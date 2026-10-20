-- Migration: 005_create_delivery_service_areas_table
-- Description: Create delivery serviceable PIN code zones and freight rules

CREATE TABLE IF NOT EXISTS delivery_service_areas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    postal_code VARCHAR(10) NOT NULL UNIQUE,
    area_name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    is_serviceable TINYINT(1) NOT NULL DEFAULT 1,
    estimated_days INT NOT NULL DEFAULT 2,
    heavy_vehicle_allowed TINYINT(1) NOT NULL DEFAULT 1,
    standard_shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 250.00,
    free_delivery_threshold DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_service_pincode (postal_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
