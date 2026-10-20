-- Migration: 015_create_deliveries_and_vehicles_tables
-- Description: Create delivery_vehicles, deliveries, and delivery_status_history tables for fleet logistics

CREATE TABLE IF NOT EXISTS delivery_vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_number VARCHAR(50) NOT NULL UNIQUE,
    vehicle_type ENUM('mini_truck', 'tipper_truck', 'flatbed_trailer', 'pickup', 'two_wheeler') NOT NULL DEFAULT 'mini_truck',
    capacity_tonnes DECIMAL(5,2) NOT NULL DEFAULT 3.50,
    driver_name VARCHAR(100) DEFAULT NULL,
    driver_phone VARCHAR(20) DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    delivery_number VARCHAR(35) NOT NULL UNIQUE,
    order_id INT NOT NULL UNIQUE,
    delivery_person_id INT DEFAULT NULL,
    vehicle_id INT DEFAULT NULL,
    vehicle_details VARCHAR(150) DEFAULT NULL,
    status ENUM('pending_assignment', 'assigned', 'preparing', 'dispatched', 'out_for_delivery', 'delivered', 'failed', 'rescheduled') NOT NULL DEFAULT 'pending_assignment',
    expected_delivery_date DATE DEFAULT NULL,
    preferred_delivery_date DATE DEFAULT NULL,
    time_slot VARCHAR(60) DEFAULT NULL,
    unloading_preference ENUM('customer_arranged', 'hydraulic_tipper', 'manual_labor', 'crane_handling') NOT NULL DEFAULT 'customer_arranged',
    unloading_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    site_contact_name VARCHAR(100) DEFAULT NULL,
    site_contact_phone VARCHAR(20) DEFAULT NULL,
    site_landmark VARCHAR(150) DEFAULT NULL,
    site_access_instructions TEXT DEFAULT NULL,
    actual_delivery_date DATETIME DEFAULT NULL,
    failure_reason VARCHAR(255) DEFAULT NULL,
    rescheduled_date DATE DEFAULT NULL,
    failure_count INT NOT NULL DEFAULT 0,
    delivery_notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (delivery_person_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (vehicle_id) REFERENCES delivery_vehicles(id) ON DELETE SET NULL,
    INDEX idx_del_status (status),
    INDEX idx_del_person (delivery_person_id),
    INDEX idx_del_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS delivery_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    delivery_id INT NOT NULL,
    from_status VARCHAR(40) DEFAULT NULL,
    to_status VARCHAR(40) NOT NULL,
    notes TEXT DEFAULT NULL,
    reason VARCHAR(255) DEFAULT NULL,
    changed_by_user_id INT DEFAULT NULL,
    changed_by_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_dsh_delivery (delivery_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
