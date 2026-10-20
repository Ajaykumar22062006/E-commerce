-- Migration: 012_create_inventory_movements_table
-- Description: Create stock ledger and movement tracking table for warehouse inventory

CREATE TABLE IF NOT EXISTS inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    change_quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    movement_type ENUM('order_deduction', 'order_cancellation_restore', 'manual_adjustment', 'restock') NOT NULL,
    reference_type ENUM('order', 'admin', 'import', 'system') NOT NULL,
    reference_id VARCHAR(50) DEFAULT NULL,
    reason VARCHAR(255) NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_im_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
