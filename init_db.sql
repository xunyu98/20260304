-- 数据库初始化脚本
-- 用于手动创建数据库和表结构

-- 创建数据库
CREATE DATABASE IF NOT EXISTS user_db 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

USE user_db;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    password VARCHAR(64) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 说明：
-- 1. 程序启动时会自动执行此脚本
-- 2. 默认管理员账号（admin / admin123）会在程序启动时自动创建
-- 3. 如需手动初始化，可运行：mysql -u root -p < init_db.sql
