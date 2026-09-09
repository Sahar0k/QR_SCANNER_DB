-- ============================================================================
-- DDL схемы базы данных системы «Учёт средств измерений (СИ)»
-- Совместимость: SQLite 3 / PostgreSQL (с минимальными правками типов)
-- ============================================================================

-- Включение поддержки внешних ключей в SQLite
PRAGMA foreign_keys = ON;

-- 1. Пользователи системы (операторы, метрологи, руководители, админы)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('operator', 'metrologist', 'supervisor', 'admin')),
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Сотрудники организации (получатели средств измерений)
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    badge_id TEXT NOT NULL UNIQUE,                -- Код пропуска (RFID/QR), например 'CARD:0004928192'
    full_name TEXT NOT NULL,                      -- ФИО сотрудника
    department TEXT NOT NULL,                     -- Подразделение / лаборатория / цех
    phone TEXT,                                   -- Контактный телефон
    email TEXT,                                   -- Электронная почта
    can_borrow INTEGER NOT NULL DEFAULT 1,        -- Флаг «право брать приборы» (1 - разрешено, 0 - запрещено)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска по пропуску и ФИО
CREATE INDEX IF NOT EXISTS idx_employees_badge_id ON employees(badge_id);
CREATE INDEX IF NOT EXISTS idx_employees_full_name ON employees(full_name);

-- 3. Реестр средств измерений (СИ)
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    barcode TEXT NOT NULL UNIQUE,                 -- Штрихкод / QR-код прибора (например, 'DEV:00101')
    name TEXT NOT NULL,                           -- Наименование прибора (напр., 'Анализатор спектра')
    model TEXT NOT NULL,                          -- Модель прибора (напр., 'Rohde & Schwarz FSL6')
    serial_number TEXT NOT NULL,                  -- Заводской / серийный номер
    inventory_number TEXT NOT NULL UNIQUE,        -- Инвентарный номер организации
    status TEXT NOT NULL DEFAULT 'in_stock' 
        CHECK(status IN ('in_stock', 'issued', 'in_verification', 'in_repair', 'decommissioned')),
    location TEXT NOT NULL,                       -- Текущее местонахождение / стеллаж
    last_verification_date DATE,                  -- Дата последней поверки (ГГГГ-ММ-ДД)
    next_verification_date DATE NOT NULL,         -- Дата следующей поверки (ГГГГ-ММ-ДД)
    specs TEXT,                                   -- Основные тех. характеристики
    notes TEXT,                                   -- Примечания
    current_holder_id TEXT,                       -- FK на сотрудника, если прибор выдан
    issued_at DATETIME,                           -- Время выдачи
    expected_return_date DATE,                    -- Плановая дата возврата
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (current_holder_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- Индексы для фильтрации и сканирования
CREATE INDEX IF NOT EXISTS idx_devices_barcode ON devices(barcode);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_next_verification ON devices(next_verification_date);
CREATE INDEX IF NOT EXISTS idx_devices_holder ON devices(current_holder_id);

-- 4. Журнал движений (Movements) — строго APPEND-ONLY!
-- Запрещены операции UPDATE и DELETE для обеспечения юридической и метрологической целостности
CREATE TABLE IF NOT EXISTS movements (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,                      -- Ссылка на прибор
    device_name TEXT NOT NULL,                    -- Денормализация для сохранения исторической точности
    device_barcode TEXT NOT NULL,
    employee_id TEXT,                             -- Ссылка на сотрудника (получателя/возвратившего)
    employee_name TEXT,
    action TEXT NOT NULL CHECK(action IN (
        'issued',                 -- Выдан сотруднику
        'returned',               -- Возвращён на склад
        'relocated',              -- Перемещён (между полками/помещениями)
        'sent_verification',      -- Отправлен в поверку (ЦСМ/Ростест)
        'returned_verification',  -- Возвращён из поверки
        'sent_repair',            -- Направлен в ремонт
        'returned_repair',        -- Возвращён из ремонта
        'decommissioned'          -- Списан
    )),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, -- Точное время операции
    operator TEXT NOT NULL,                       -- Логин или ФИО оператора (кладовщика)
    expected_return DATE,                         -- Ожидаемая дата возврата (при выдаче)
    actual_return DATE,                           -- Фактическая дата (при возврате)
    notes TEXT,                                   -- Заметки / основание / номер акта
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_movements_device_id ON movements(device_id);
CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON movements(timestamp);
CREATE INDEX IF NOT EXISTS idx_movements_action ON movements(action);
CREATE INDEX IF NOT EXISTS idx_movements_employee ON movements(employee_id);

-- Триггеры для защиты журнала от изменений (Append-only защита на уровне СУБД)
CREATE TRIGGER IF NOT EXISTS trg_prevent_movements_update
BEFORE UPDATE ON movements
BEGIN
    SELECT RAISE(FAIL, 'Журнал движений является неизменяемым (append-only): UPDATE запрещен!');
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_movements_delete
BEFORE DELETE ON movements
BEGIN
    SELECT RAISE(FAIL, 'Журнал движений является неизменяемым (append-only): DELETE запрещен!');
END;

-- 5. Сессии инвентаризации
CREATE TABLE IF NOT EXISTS inventory_sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,                          -- Название сессии (напр. «Плановая ревизия склада №1»)
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK(status IN ('draft', 'in_progress', 'completed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    operator TEXT NOT NULL,
    notes TEXT,
    total_expected INTEGER DEFAULT 0,
    total_scanned INTEGER DEFAULT 0,
    total_match INTEGER DEFAULT 0,
    total_missing INTEGER DEFAULT 0,
    total_extra INTEGER DEFAULT 0
);

-- 6. Позиции инвентаризации (детализация сканов и расхождений)
CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    device_id TEXT,
    barcode TEXT NOT NULL,
    device_name TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('match', 'missing', 'extra')),
    scanned_at DATETIME,
    operator TEXT,
    notes TEXT,
    FOREIGN KEY (session_id) REFERENCES inventory_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_session ON inventory_items(session_id);

-- 7. Аппаратные терминалы сбора данных (ESP32-S3 + Waveshare Barcode Scanner)
CREATE TABLE IF NOT EXISTS terminals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ip TEXT,
    port INTEGER DEFAULT 5005,
    mac TEXT,
    last_heartbeat DATETIME,
    rssi INTEGER,
    status TEXT DEFAULT 'offline' CHECK(status IN ('online', 'offline')),
    device_prefix TEXT DEFAULT 'DEV:',
    card_prefix TEXT DEFAULT 'CARD:',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Системные настройки и бизнес-правила
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT
);
