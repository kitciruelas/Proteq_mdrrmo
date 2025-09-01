-- Add sample general users for testing incident reports
-- Password for all users is 'user123' (hashed with bcrypt)

INSERT INTO general_users (first_name, last_name, email, password, user_type, status, created_at, updated_at) VALUES
('Juan', 'Dela Cruz', 'juan.delacruz@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1, NOW(), NOW()),
('Maria', 'Santos', 'maria.santos@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1, NOW(), NOW()),
('Pedro', 'Garcia', 'pedro.garcia@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1, NOW(), NOW()),
('Ana', 'Reyes', 'ana.reyes@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1, NOW(), NOW()),
('Luis', 'Torres', 'luis.torres@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1, NOW(), NOW()),
('Carmen', 'Lopez', 'carmen.lopez@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1, NOW(), NOW()),
('Roberto', 'Mendoza', 'roberto.mendoza@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1, NOW(), NOW()),
('Isabel', 'Cruz', 'isabel.cruz@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1, NOW(), NOW()),
('Fernando', 'Ortiz', 'fernando.ortiz@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1, NOW(), NOW()),
('Lucia', 'Vargas', 'lucia.vargas@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1, NOW(), NOW());

-- Note: The password for all users is 'user123'
