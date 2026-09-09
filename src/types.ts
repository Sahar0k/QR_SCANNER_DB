export type Role = 'operator' | 'metrologist' | 'supervisor' | 'admin';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  avatar?: string;
}

export type DeviceStatus = 
  | 'in_stock'           // На складе
  | 'issued'             // Выдан
  | 'in_verification'    // В поверке
  | 'in_repair'          // В ремонте
  | 'decommissioned';    // Списан

export interface Device {
  id: string;
  barcode: string;                  // e.g. DEV:00101 or 460123456001
  name: string;                     // e.g. Анализатор спектра
  model: string;                    // e.g. Rohde & Schwarz FSL6
  serialNumber: string;             // e.g. RS-99321
  inventoryNumber: string;          // e.g. ИНВ-00101
  status: DeviceStatus;
  location: string;                 // e.g. Склад СИ, стеллаж 2, полка А
  lastVerificationDate?: string;    // YYYY-MM-DD
  nextVerificationDate: string;     // YYYY-MM-DD
  specs?: string;                   // e.g. 9 кГц - 6 ГГц
  notes?: string;
  currentHolderId?: string;
  currentHolderName?: string;
  issuedAt?: string;
  expectedReturnDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScannerDevice {
  id: string;
  name: string;
  type: 'usb_keyboard' | 'rfid_udp' | 'com_port' | 'network_scanner';
  identifier: string;
  location: string;
  status: 'active' | 'inactive';
  addedAt: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  headName?: string;
  description?: string;
  createdAt?: string;
  employeeCount?: number;
}

export interface Employee {
  id: string;
  badgeId: string;                  // e.g. CARD:0004928192 or 0004928192
  fullName: string;
  department: string;
  phone: string;
  email?: string;
  canBorrow: boolean;               // Право брать приборы
  activeBorrowedCount?: number;
  createdAt: string;
}

export type MovementAction = 
  | 'issued'
  | 'returned'
  | 'relocated'
  | 'sent_verification'
  | 'returned_verification'
  | 'sent_repair'
  | 'returned_repair'
  | 'decommissioned';

export interface Movement {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceBarcode: string;
  employeeId?: string;
  employeeName?: string;
  action: MovementAction;
  timestamp: string;
  operator: string;
  expectedReturn?: string;
  actualReturn?: string;
  notes?: string;
}

export type InventorySessionStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';

export interface InventorySession {
  id: string;
  title: string;
  status: InventorySessionStatus;
  createdAt: string;
  closedAt?: string;
  operator: string;
  notes?: string;
  totalExpected: number;
  totalScanned: number;
  totalMatch: number;
  totalMissing: number;
  totalExtra: number;
}

export type InventoryItemStatus = 'match' | 'missing' | 'extra';

export interface InventoryItem {
  id: string;
  sessionId: string;
  deviceId?: string;
  barcode: string;
  deviceName: string;
  model: string;
  status: InventoryItemStatus;
  scannedAt?: string;
  operator?: string;
  notes?: string;
}

export interface Terminal {
  id: string;
  name: string;
  ip: string;
  port: number;
  mac: string;
  lastHeartbeat: string;
  rssi: number;
  status: 'online' | 'offline';
  devicePrefix: string;
  cardPrefix: string;
}

export interface AppSettings {
  blockExpiredVerification: boolean;
  blockIssueOnExpiredVerification?: boolean;
  blockIssueOnNoBorrowRights?: boolean;
  defaultReturnDays: number;
  duplicateWindowMs: number;
  duplicateScanWindowMs?: number;
  udpPort: number;
  heartbeatTimeoutSec: number;
  terminalTimeoutSeconds?: number;
  autoPrintQr: boolean;
  wifiSsid?: string;
  wifiPassword?: string;
  pcIp?: string;
  scannerIp?: string;
  scannerPrefix?: string;
}

export type SystemSettings = AppSettings;

export interface DashboardSummary {
  counts: {
    total: number;
    inStock: number;
    issued: number;
    inVerification: number;
    inRepair: number;
    decommissioned: number;
  };
  terminal: {
    isOnline: boolean;
    lastHeartbeat?: string;
    rssi: number;
    secondsSinceHeartbeat: number;
  };
  verificationAlerts: {
    expiredCount: number;
    in30DaysCount: number;
    in60DaysCount: number;
    in90DaysCount: number;
    items: Array<{
      device: Device;
      daysRemaining: number;
      isExpired: boolean;
    }>;
  };
  recentMovements: Movement[];
  overdueLoans: Array<{
    device: Device;
    employeeName: string;
    expectedReturnDate: string;
    daysOverdue: number;
  }>;
}

export interface TerminalPacket {
  type: 'SCAN' | 'HEARTBEAT' | 'DEV' | 'CARD';
  raw: string;
  code?: string;
  rssi?: number;
  timestamp: string;
  remoteIp?: string;
}

export type TerminalPacketLog = TerminalPacket;

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  device?: Device;
  employee?: Employee;
}

export interface AcceptanceTestResult {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  message?: string;
  details?: any;
}
