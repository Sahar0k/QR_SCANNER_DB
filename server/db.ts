import {
  Device,
  Employee,
  Department,
  Movement,
  InventorySession,
  InventoryItem,
  Terminal,
  AppSettings,
  User,
  DashboardSummary,
  ScannerDevice
} from '../src/types.js';

export interface DatabaseSchema {
  users: User[];
  devices: Device[];
  employees: Employee[];
  departments?: Department[];
  scanners?: ScannerDevice[];
  movements: Movement[];
  inventorySessions: InventorySession[];
  inventoryItems: InventoryItem[];
  terminals: Terminal[];
  settings: AppSettings;
}

// Helper to format dates YYYY-MM-DD
function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function subDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

const today = new Date();

function repairSeedText<T>(value: T): T {
  const cp1251 = new Map<number, number>();
  const decoder = new TextDecoder('windows-1251');
  for (let byte = 0; byte <= 0xff; byte++) {
    const decoded = decoder.decode(Uint8Array.of(byte));
    const codePoint = decoded.codePointAt(0);
    if (codePoint !== undefined && !cp1251.has(codePoint)) {
      cp1251.set(codePoint, byte);
    }
  }

  const repair = (entry: unknown): unknown => {
    if (typeof entry === 'string') {
      const bytes = Array.from(entry, character => cp1251.get(character.codePointAt(0)!));
      if (bytes.every(byte => byte !== undefined)) {
        const decoded = Buffer.from(bytes as number[]).toString('utf8');
        if (!decoded.includes('\uFFFD') && decoded !== entry) return decoded;
      }
      return entry;
    }
    if (Array.isArray(entry)) return entry.map(repair);
    if (entry && typeof entry === 'object') {
      return Object.fromEntries(
        Object.entries(entry).map(([key, nested]) => [key, repair(nested)]),
      );
    }
    return entry;
  };

  return repair(value) as T;
}

export function createInitialSeed(): DatabaseSchema {
  const users: User[] = [
    { id: 'usr-1', username: 'operator', fullName: 'РЎРёРґРѕСЂРѕРІ Р’РёРєС‚РѕСЂ РњРёС…Р°Р№Р»РѕРІРёС‡ (РљР»Р°РґРѕРІС‰РёРє)', role: 'operator' },
    { id: 'usr-2', username: 'metrologist', fullName: 'РљСѓР·РЅРµС†РѕРІР° Р•Р»РµРЅР° РџР°РІР»РѕРІРЅР° (РњРµС‚СЂРѕР»РѕРі РћР“Рњ)', role: 'metrologist' },
    { id: 'usr-3', username: 'supervisor', fullName: 'РџРµС‚СЂРѕРІ РЎРµСЂРіРµР№ Р’Р»Р°РґРёРјРёСЂРѕРІРёС‡ (РќР°С‡Р°Р»СЊРЅРёРє СѓС‡Р°СЃС‚РєР°)', role: 'supervisor' },
    { id: 'usr-4', username: 'admin', fullName: 'РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ СЃРёСЃС‚РµРјС‹', role: 'admin' },
  ];

  const employees: Employee[] = [
    {
      id: 'emp-1',
      badgeId: 'CARD:0004928192',
      fullName: 'РРІР°РЅРѕРІ РђР»РµРєСЃРµР№ РђР»РµРєСЃР°РЅРґСЂРѕРІРёС‡',
      department: 'РћС‚РґРµР» СЂР°Р·СЂР°Р±РѕС‚РєРё РЎР’Р§ Р°РїРїР°СЂР°С‚СѓСЂС‹',
      phone: '+7 (916) 234-56-78',
      email: 'a.ivanov@company.local',
      canBorrow: true,
      activeBorrowedCount: 1,
      createdAt: '2025-01-10T08:00:00.000Z'
    },
    {
      id: 'emp-2',
      badgeId: 'CARD:0005118274',
      fullName: 'РЎРјРёСЂРЅРѕРІ РљРѕРЅСЃС‚Р°РЅС‚РёРЅ Р’Р°СЃРёР»СЊРµРІРёС‡',
      department: 'РћС‚РґРµР» СЂР°РґРёРѕРёР·РјРµСЂРµРЅРёР№',
      phone: '+7 (926) 888-12-34',
      email: 'k.smirnov@company.local',
      canBorrow: true,
      activeBorrowedCount: 1,
      createdAt: '2025-01-15T09:30:00.000Z'
    },
    {
      id: 'emp-3',
      badgeId: 'CARD:0006291038',
      fullName: 'РљСѓР·РЅРµС†РѕРІР° Р•Р»РµРЅР° РџР°РІР»РѕРІРЅР°',
      department: 'РћС‚РґРµР» РіР»Р°РІРЅРѕРіРѕ РјРµС‚СЂРѕР»РѕРіР° (РћР“Рњ)',
      phone: '+7 (903) 555-77-99',
      email: 'e.kuznetsova@company.local',
      canBorrow: true,
      activeBorrowedCount: 0,
      createdAt: '2025-01-20T10:00:00.000Z'
    },
    {
      id: 'emp-4',
      badgeId: 'CARD:0007829104',
      fullName: 'РќРѕРІРёРєРѕРІ Р”РµРЅРёСЃ РРіРѕСЂРµРІРёС‡',
      department: 'РџСЂРѕРёР·РІРѕРґСЃС‚РІРµРЅРЅР°СЏ РїСЂР°РєС‚РёРєР° (СЃС‚Р°Р¶РµСЂ)',
      phone: '+7 (977) 111-22-33',
      email: 'd.novikov@company.local',
      canBorrow: false, // РўР•РЎРў: РїСЂР°РІРѕ Р±СЂР°С‚СЊ РЎР РѕС‚РѕР·РІР°РЅРѕ
      activeBorrowedCount: 0,
      createdAt: '2025-02-01T11:00:00.000Z'
    },
    {
      id: 'emp-5',
      badgeId: 'CARD:0008392019',
      fullName: 'Р’Р°СЃРёР»СЊРµРІ РџРµС‚СЂ РќРёРєРѕР»Р°РµРІРёС‡',
      department: 'РЎРµРєС‚РѕСЂ РєР»РёРјР°С‚РёС‡РµСЃРєРёС… Рё СЂРµСЃСѓСЂСЃРЅС‹С… РёСЃРїС‹С‚Р°РЅРёР№',
      phone: '+7 (985) 444-90-11',
      email: 'p.vasiliev@company.local',
      canBorrow: true,
      activeBorrowedCount: 0,
      createdAt: '2025-02-10T14:20:00.000Z'
    }
  ];

  const devices: Device[] = [
    {
      id: 'dev-1',
      barcode: 'DEV:00101',
      name: 'РђРЅР°Р»РёР·Р°С‚РѕСЂ СЃРїРµРєС‚СЂР°',
      model: 'Rohde & Schwarz FSL6',
      serialNumber: 'RS-99321',
      inventoryNumber: 'РРќР’-00101',
      status: 'in_stock',
      location: 'РЎРєР»Р°Рґ РЎР, РЎС‚РµР»Р»Р°Р¶ 1, РџРѕР»РєР° Рђ-2',
      lastVerificationDate: subDays(today, 120),
      nextVerificationDate: addDays(today, 245), // РЎ РїРѕРІРµСЂРєРѕР№ РІСЃС‘ РѕС‚Р»РёС‡РЅРѕ
      specs: '9 РєР“С† вЂ” 6 Р“Р“С†, РїРѕР»РѕСЃР° СЂР°Р·СЂРµС€РµРЅРёСЏ 300 Р“С† вЂ” 10 РњР“С†',
      notes: 'РљРѕРјРїР»РµРєС‚: РёР·РјРµСЂРёС‚РµР»СЊРЅС‹Р№ РєР°Р±РµР»СЊ N-type, Р°С‚С‚РµРЅСЋР°С‚РѕСЂ 20 РґР‘',
      createdAt: '2025-01-05T10:00:00.000Z',
      updatedAt: '2025-01-05T10:00:00.000Z'
    },
    {
      id: 'dev-2',
      barcode: 'DEV:00102',
      name: 'РџСЂРµС†РёР·РёРѕРЅРЅС‹Р№ РёСЃС‚РѕС‡РЅРёРє РїРёС‚Р°РЅРёСЏ',
      model: 'Keysight E36313A',
      serialNumber: 'KS-44211',
      inventoryNumber: 'РРќР’-00102',
      status: 'issued', // Р’Р«Р”РђРќ
      location: 'РЎР’Р§ СЃС‚РµРЅРґ в„–4',
      lastVerificationDate: subDays(today, 200),
      nextVerificationDate: addDays(today, 165),
      specs: '3 РєР°РЅР°Р»Р°, 6V/10A, 2x 25V/2A, СЃСѓРјРјР°СЂРЅРѕ 160 Р’С‚',
      notes: 'Р’С‹РґР°РЅ РґР»СЏ РёСЃРїС‹С‚Р°РЅРёР№ СѓСЃРёР»РёС‚РµР»СЏ РјРѕС‰РЅРѕСЃС‚Рё',
      currentHolderId: 'emp-1',
      currentHolderName: 'РРІР°РЅРѕРІ РђР»РµРєСЃРµР№ РђР»РµРєСЃР°РЅРґСЂРѕРІРёС‡',
      issuedAt: subDays(today, 3) + 'T09:15:00.000Z',
      expectedReturnDate: addDays(today, 30),
      createdAt: '2025-01-06T11:00:00.000Z',
      updatedAt: '2025-03-05T09:15:00.000Z'
    },
    {
      id: 'dev-3',
      barcode: 'DEV:00103',
      name: 'РћСЃС†РёР»Р»РѕРіСЂР°С„ С†РёС„СЂРѕРІРѕР№ С„РѕСЃС„РѕСЂРЅС‹Р№',
      model: 'Tektronix TBS2104B',
      serialNumber: 'TK-88192',
      inventoryNumber: 'РРќР’-00103',
      status: 'in_stock',
      location: 'РЎРєР»Р°Рґ РЎР, РЎС‚РµР»Р»Р°Р¶ 1, РџРѕР»РєР° Р‘-1',
      lastVerificationDate: subDays(today, 350),
      nextVerificationDate: addDays(today, 15), // Р’РќРРњРђРќРР•: РїРѕРІРµСЂРєР° С‡РµСЂРµР· 15 РґРЅРµР№ (< 30 РґРЅРµР№)
      specs: '100 РњР“С†, 4 Р°РЅР°Р»РѕРіРѕРІС‹С… РєР°РЅР°Р»Р°, 2 Р“РІС‹Р±/СЃ',
      notes: 'РўСЂРµР±СѓРµС‚СЃСЏ Р·Р°РїР»Р°РЅРёСЂРѕРІР°С‚СЊ РїРѕРІРµСЂРєСѓ РІ С‚РµРєСѓС‰РµРј РјРµСЃСЏС†Рµ',
      createdAt: '2025-01-07T12:00:00.000Z',
      updatedAt: '2025-01-07T12:00:00.000Z'
    },
    {
      id: 'dev-4',
      barcode: 'DEV:00104',
      name: 'РњСѓР»СЊС‚РёРјРµС‚СЂ С†РёС„СЂРѕРІРѕР№ 6.5 СЂР°Р·СЂСЏРґРѕРІ',
      model: 'Fluke 8846A',
      serialNumber: 'FL-11094',
      inventoryNumber: 'РРќР’-00104',
      status: 'in_stock',
      location: 'РЎРєР»Р°Рґ РЎР, Р—РѕРЅР° РєР°СЂР°РЅС‚РёРЅР°/РїРѕРІРµСЂРєРё',
      lastVerificationDate: subDays(today, 375),
      nextVerificationDate: subDays(today, 10), // РўР•РЎРў: РџРћР’Р•Р РљРђ РџР РћРЎР РћР§Р•РќРђ РќРђ 10 Р”РќР•Р™!
      specs: 'РўРѕС‡РЅРѕСЃС‚СЊ 0.0024% DC, РёР·РјРµСЂРµРЅРёРµ С‘РјРєРѕСЃС‚Рё Рё С‚РµРјРїРµСЂР°С‚СѓСЂС‹',
      notes: 'Р’РќРРњРђРќРР•: РЎРІРёРґРµС‚РµР»СЊСЃС‚РІРѕ Рѕ РїРѕРІРµСЂРєРµ РёСЃС‚РµРєР»Рѕ. Р’С‹РґР°С‡Р° Р·Р°РїСЂРµС‰РµРЅР° СЂРµРіР»Р°РјРµРЅС‚РѕРј!',
      createdAt: '2025-01-08T09:00:00.000Z',
      updatedAt: '2025-03-01T08:00:00.000Z'
    },
    {
      id: 'dev-5',
      barcode: 'DEV:00105',
      name: 'Р“РµРЅРµСЂР°С‚РѕСЂ СЃРёРіРЅР°Р»РѕРІ РїСЂРѕРёР·РІРѕР»СЊРЅРѕР№ С„РѕСЂРјС‹',
      model: 'Rigol DG4162',
      serialNumber: 'RG-33910',
      inventoryNumber: 'РРќР’-00105',
      status: 'issued', // Р’Р«Р”РђРќ
      location: 'РЈС‡Р°СЃС‚РѕРє СЂР°РґРёРѕРёР·РјРµСЂРµРЅРёР№, СЃС‚РѕР» 2',
      lastVerificationDate: subDays(today, 180),
      nextVerificationDate: addDays(today, 185),
      specs: '160 РњР“С†, 2 РєР°РЅР°Р»Р°, 500 РњРІС‹Р±/СЃ, 14 Р±РёС‚ Р¦РђРџ',
      notes: 'Р’С‹РґР°РЅ СЃРѕ С€РЅСѓСЂР°РјРё BNC-BNC',
      currentHolderId: 'emp-2',
      currentHolderName: 'РЎРјРёСЂРЅРѕРІ РљРѕРЅСЃС‚Р°РЅС‚РёРЅ Р’Р°СЃРёР»СЊРµРІРёС‡',
      issuedAt: subDays(today, 8) + 'T14:30:00.000Z',
      expectedReturnDate: addDays(today, 30),
      createdAt: '2025-01-09T14:00:00.000Z',
      updatedAt: '2025-03-01T14:30:00.000Z'
    },
    {
      id: 'dev-6',
      barcode: 'DEV:00106',
      name: 'РР·РјРµСЂРёС‚РµР»СЊ РёРјРјРёС‚Р°РЅСЃР° RLC РїСЂРµС†РёР·РёРѕРЅРЅС‹Р№',
      model: 'РњРќРРџР E7-20',
      serialNumber: 'MN-77218',
      inventoryNumber: 'РРќР’-00106',
      status: 'in_verification', // Р’ РџРћР’Р•Р РљР•
      location: 'РћСЂРіР°РЅ РїРѕРІРµСЂРєРё (Р¦РЎРњ)',
      lastVerificationDate: subDays(today, 366),
      nextVerificationDate: addDays(today, 20),
      specs: 'Р”РёР°РїР°Р·РѕРЅ С‡Р°СЃС‚РѕС‚ 25 Р“С† вЂ” 1 РњР“С†, Р±Р°Р·РѕРІР°СЏ РїРѕРіСЂРµС€РЅРѕСЃС‚СЊ 0.1%',
      notes: 'РџРµСЂРµРґР°РЅ РїРѕ РЅР°РєР»Р°РґРЅРѕР№ в„–412 РѕС‚ ' + subDays(today, 5),
      createdAt: '2025-01-11T10:30:00.000Z',
      updatedAt: '2025-03-04T10:30:00.000Z'
    },
    {
      id: 'dev-7',
      barcode: 'DEV:00107',
      name: 'Р§Р°СЃС‚РѕС‚РѕРјРµСЂ СЌР»РµРєС‚СЂРѕРЅРЅРѕ-СЃС‡РµС‚РЅС‹Р№',
      model: 'Р§3-88',
      serialNumber: 'CH-55102',
      inventoryNumber: 'РРќР’-00107',
      status: 'in_stock',
      location: 'РЎРєР»Р°Рґ РЎР, РЎС‚РµР»Р»Р°Р¶ 2, РџРѕР»РєР° Рђ-1',
      lastVerificationDate: subDays(today, 320),
      nextVerificationDate: addDays(today, 45), // РџРѕРІРµСЂРєР° С‡РµСЂРµР· 45 РґРЅРµР№ (< 60 РґРЅРµР№)
      specs: 'Р”РёР°РїР°Р·РѕРЅ 0.01 Р“С† вЂ” 200 РњР“С† (СЃ РґРµР»РёС‚РµР»РµРј РґРѕ 2.4 Р“Р“С†)',
      notes: 'РџСЂРѕРІРµСЂРµРЅ С‚РµСЂРјРѕСЃС‚Р°С‚РёСЂРѕРІР°РЅРЅС‹Р№ РєРІР°СЂС†РµРІС‹Р№ РіРµРЅРµСЂР°С‚РѕСЂ',
      createdAt: '2025-01-12T15:00:00.000Z',
      updatedAt: '2025-01-12T15:00:00.000Z'
    },
    {
      id: 'dev-8',
      barcode: 'DEV:00108',
      name: 'РњРµРіР°РѕРјРјРµС‚СЂ С†РёС„СЂРѕРІРѕР№ РёСЃРїС‹С‚Р°С‚РµР»СЊРЅС‹Р№',
      model: 'Sonel MIC-2510',
      serialNumber: 'SN-90214',
      inventoryNumber: 'РРќР’-00108',
      status: 'in_repair', // Р’ Р Р•РњРћРќРўР•
      location: 'РњР°СЃС‚РµСЂСЃРєР°СЏ РљРРџРёРђ',
      lastVerificationDate: subDays(today, 90),
      nextVerificationDate: addDays(today, 275),
      specs: 'РСЃРїС‹С‚Р°С‚РµР»СЊРЅРѕРµ РЅР°РїСЂСЏР¶РµРЅРёРµ РґРѕ 2500 Р’, СЃРѕРїСЂРѕС‚РёРІР»РµРЅРёРµ РґРѕ 2 РўРћРј',
      notes: 'Р РµРјРѕРЅС‚: Р·Р°РјРµРЅР° СЂР°Р·СЉРµРјР° Р·Р°С‰РёС‚РЅРѕРіРѕ СЌРєСЂР°РЅР° Guard',
      createdAt: '2025-01-13T16:00:00.000Z',
      updatedAt: '2025-03-02T11:00:00.000Z'
    },
    {
      id: 'dev-9',
      barcode: 'DEV:00109',
      name: 'РњРЅРѕРіРѕС„СѓРЅРєС†РёРѕРЅР°Р»СЊРЅС‹Р№ РєР°Р»РёР±СЂР°С‚РѕСЂ РЎР',
      model: 'Transmille 3000 Series',
      serialNumber: 'TR-10022',
      inventoryNumber: 'РРќР’-00109',
      status: 'in_stock',
      location: 'РЈС‡Р°СЃС‚РѕРє СЌС‚Р°Р»РѕРЅРѕРІ РћР“Рњ, РєРѕРјРЅ. 204',
      lastVerificationDate: subDays(today, 60),
      nextVerificationDate: addDays(today, 305),
      specs: 'Р­С‚Р°Р»РѕРЅ РЅР°РїСЂСЏР¶РµРЅРёСЏ, С‚РѕРєР°, СЃРѕРїСЂРѕС‚РёРІР»РµРЅРёСЏ, РµРјРєРѕСЃС‚Рё Рё С‚РµСЂРјРѕРїР°СЂ',
      notes: 'Р­С‚Р°Р»РѕРЅ 2-РіРѕ СЂР°Р·СЂСЏРґР°, РІС‹РґР°С‡Р° С‚РѕР»СЊРєРѕ СЃРѕС‚СЂСѓРґРЅРёРєР°Рј РћР“Рњ',
      createdAt: '2025-01-14T09:00:00.000Z',
      updatedAt: '2025-01-14T09:00:00.000Z'
    },
    {
      id: 'dev-10',
      barcode: 'DEV:00110',
      name: 'РђРЅР°Р»РёР·Р°С‚РѕСЂ С†РµРїРµР№ РІРµРєС‚РѕСЂРЅС‹Р№',
      model: 'Planar 804/1 (Copper Mountain)',
      serialNumber: 'CM-67291',
      inventoryNumber: 'РРќР’-00110',
      status: 'decommissioned', // РЎРџРРЎРђРќ
      location: 'РђСЂС…РёРІ / РЈС‚РёР»РёР·Р°С†РёСЏ',
      lastVerificationDate: '2023-05-12',
      nextVerificationDate: '2024-05-12',
      specs: '100 РєР“С† вЂ” 8 Р“Р“С†, 2 РїРѕСЂС‚Р°, 50 РћРј',
      notes: 'РЎРїРёСЃР°РЅ РїРѕ Р°РєС‚Сѓ С‚РµС…РЅРёС‡РµСЃРєРѕРіРѕ СЃРѕСЃС‚РѕСЏРЅРёСЏ в„–14/24 РѕС‚ 15.11.2024',
      createdAt: '2024-01-10T10:00:00.000Z',
      updatedAt: '2024-11-15T10:00:00.000Z'
    }
  ];

  // 20 realistic movements showing complete history
  const movements: Movement[] = [
    {
      id: 'mov-01',
      deviceId: 'dev-1',
      deviceName: 'РђРЅР°Р»РёР·Р°С‚РѕСЂ СЃРїРµРєС‚СЂР° Rohde & Schwarz FSL6',
      deviceBarcode: 'DEV:00101',
      employeeId: 'emp-1',
      employeeName: 'РРІР°РЅРѕРІ РђР»РµРєСЃРµР№ РђР»РµРєСЃР°РЅРґСЂРѕРІРёС‡',
      action: 'issued',
      timestamp: subDays(today, 60) + 'T08:30:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      expectedReturn: subDays(today, 55),
      notes: 'Р”Р»СЏ РєР°Р»РёР±СЂРѕРІРєРё РїСЂРёРµРјРЅРѕРіРѕ С‚СЂР°РєС‚Р°'
    },
    {
      id: 'mov-02',
      deviceId: 'dev-1',
      deviceName: 'РђРЅР°Р»РёР·Р°С‚РѕСЂ СЃРїРµРєС‚СЂР° Rohde & Schwarz FSL6',
      deviceBarcode: 'DEV:00101',
      employeeId: 'emp-1',
      employeeName: 'РРІР°РЅРѕРІ РђР»РµРєСЃРµР№ РђР»РµРєСЃР°РЅРґСЂРѕРІРёС‡',
      action: 'returned',
      timestamp: subDays(today, 55) + 'T17:00:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      actualReturn: subDays(today, 55),
      notes: 'Р’РѕР·РІСЂР°С‚ РІ РїРѕР»РЅРѕР№ РєРѕРјРїР»РµРєС‚РЅРѕСЃС‚Рё, Р·Р°РјРµС‡Р°РЅРёР№ РЅРµС‚'
    },
    {
      id: 'mov-03',
      deviceId: 'dev-2',
      deviceName: 'РџСЂРµС†РёР·РёРѕРЅРЅС‹Р№ РёСЃС‚РѕС‡РЅРёРє РїРёС‚Р°РЅРёСЏ Keysight E36313A',
      deviceBarcode: 'DEV:00102',
      employeeId: 'emp-2',
      employeeName: 'РЎРјРёСЂРЅРѕРІ РљРѕРЅСЃС‚Р°РЅС‚РёРЅ Р’Р°СЃРёР»СЊРµРІРёС‡',
      action: 'issued',
      timestamp: subDays(today, 45) + 'T09:10:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      expectedReturn: subDays(today, 40),
      notes: 'РџРёС‚Р°РЅРёРµ РјР°РєРµС‚Р° СЃРёРЅС‚РµР·Р°С‚РѕСЂР°'
    },
    {
      id: 'mov-04',
      deviceId: 'dev-2',
      deviceName: 'РџСЂРµС†РёР·РёРѕРЅРЅС‹Р№ РёСЃС‚РѕС‡РЅРёРє РїРёС‚Р°РЅРёСЏ Keysight E36313A',
      deviceBarcode: 'DEV:00102',
      employeeId: 'emp-2',
      employeeName: 'РЎРјРёСЂРЅРѕРІ РљРѕРЅСЃС‚Р°РЅС‚РёРЅ Р’Р°СЃРёР»СЊРµРІРёС‡',
      action: 'returned',
      timestamp: subDays(today, 40) + 'T16:20:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      actualReturn: subDays(today, 40),
      notes: 'Р’РѕР·РІСЂР°С‚ РЅР° СЃС‚РµР»Р»Р°Р¶ 1'
    },
    {
      id: 'mov-05',
      deviceId: 'dev-3',
      deviceName: 'РћСЃС†РёР»Р»РѕРіСЂР°С„ С†РёС„СЂРѕРІРѕР№ С„РѕСЃС„РѕСЂРЅС‹Р№ Tektronix TBS2104B',
      deviceBarcode: 'DEV:00103',
      employeeId: 'emp-5',
      employeeName: 'Р’Р°СЃРёР»СЊРµРІ РџРµС‚СЂ РќРёРєРѕР»Р°РµРІРёС‡',
      action: 'issued',
      timestamp: subDays(today, 35) + 'T11:00:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      expectedReturn: subDays(today, 25),
      notes: 'РўРµСЂРјРѕРєР»РёРјР°С‚РёС‡РµСЃРєРёРµ РёСЃРїС‹С‚Р°РЅРёСЏ Р±Р»РѕРєР° РїРёС‚Р°РЅРёСЏ'
    },
    {
      id: 'mov-06',
      deviceId: 'dev-3',
      deviceName: 'РћСЃС†РёР»Р»РѕРіСЂР°С„ С†РёС„СЂРѕРІРѕР№ С„РѕСЃС„РѕСЂРЅС‹Р№ Tektronix TBS2104B',
      deviceBarcode: 'DEV:00103',
      employeeId: 'emp-5',
      employeeName: 'Р’Р°СЃРёР»СЊРµРІ РџРµС‚СЂ РќРёРєРѕР»Р°РµРІРёС‡',
      action: 'returned',
      timestamp: subDays(today, 25) + 'T15:45:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      actualReturn: subDays(today, 25),
      notes: 'Р’РѕР·РІСЂР°С‰РµРЅ Р±РµР· РїРѕРІСЂРµР¶РґРµРЅРёР№, 4 С‰СѓРїР° РїСЂРѕРІРµСЂРµРЅС‹'
    },
    {
      id: 'mov-07',
      deviceId: 'dev-6',
      deviceName: 'РР·РјРµСЂРёС‚РµР»СЊ РёРјРјРёС‚Р°РЅСЃР° RLC РїСЂРµС†РёР·РёРѕРЅРЅС‹Р№ РњРќРРџР E7-20',
      deviceBarcode: 'DEV:00106',
      employeeId: 'emp-3',
      employeeName: 'РљСѓР·РЅРµС†РѕРІР° Р•Р»РµРЅР° РџР°РІР»РѕРІРЅР°',
      action: 'sent_verification',
      timestamp: subDays(today, 24) + 'T10:00:00.000Z',
      operator: 'РљСѓР·РЅРµС†РѕРІР° Р•.Рџ.',
      notes: 'РћС‚РїСЂР°РІР»РµРЅ РІ РѕСЂРіР°РЅ РїРѕРІРµСЂРєРё (Р¦РЎРњ) РЅР° РїРµСЂРёРѕРґРёС‡РµСЃРєСѓСЋ РїРѕРІРµСЂРєСѓ'
    },
    {
      id: 'mov-08',
      deviceId: 'dev-7',
      deviceName: 'Р§Р°СЃС‚РѕС‚РѕРјРµСЂ СЌР»РµРєС‚СЂРѕРЅРЅРѕ-СЃС‡РµС‚РЅС‹Р№ Р§3-88',
      deviceBarcode: 'DEV:00107',
      action: 'relocated',
      timestamp: subDays(today, 20) + 'T14:15:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      notes: 'РџРµСЂРµРјРµС‰РµРЅ СЃ РІСЂРµРјРµРЅРЅРѕРіРѕ СЃС‚РѕР»Р° РЅР° СЃС‚РµР»Р»Р°Р¶ 2, РїРѕР»РєР° Рђ-1'
    },
    {
      id: 'mov-09',
      deviceId: 'dev-8',
      deviceName: 'РњРµРіР°РѕРјРјРµС‚СЂ С†РёС„СЂРѕРІРѕР№ РёСЃРїС‹С‚Р°С‚РµР»СЊРЅС‹Р№ Sonel MIC-2510',
      deviceBarcode: 'DEV:00108',
      action: 'sent_repair',
      timestamp: subDays(today, 18) + 'T11:30:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      notes: 'РќРµРёСЃРїСЂР°РІРЅРѕСЃС‚СЊ РєР»РµРјРјС‹ Guard, РѕС„РѕСЂРјР»РµРЅ РЅР°СЂСЏРґ РІ РјР°СЃС‚РµСЂСЃРєСѓСЋ'
    },
    {
      id: 'mov-10',
      deviceId: 'dev-4',
      deviceName: 'РњСѓР»СЊС‚РёРјРµС‚СЂ С†РёС„СЂРѕРІРѕР№ 6.5 СЂР°Р·СЂСЏРґРѕРІ Fluke 8846A',
      deviceBarcode: 'DEV:00104',
      employeeId: 'emp-1',
      employeeName: 'РРІР°РЅРѕРІ РђР»РµРєСЃРµР№ РђР»РµРєСЃР°РЅРґСЂРѕРІРёС‡',
      action: 'issued',
      timestamp: subDays(today, 16) + 'T09:00:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      expectedReturn: subDays(today, 12),
      notes: 'Р”Рѕ РёСЃС‚РµС‡РµРЅРёСЏ СЃСЂРѕРєР° РїРѕРІРµСЂРєРё РѕСЃС‚Р°РІР°Р»РѕСЃСЊ 6 РґРЅРµР№'
    },
    {
      id: 'mov-11',
      deviceId: 'dev-4',
      deviceName: 'РњСѓР»СЊС‚РёРјРµС‚СЂ С†РёС„СЂРѕРІРѕР№ 6.5 СЂР°Р·СЂСЏРґРѕРІ Fluke 8846A',
      deviceBarcode: 'DEV:00104',
      employeeId: 'emp-1',
      employeeName: 'РРІР°РЅРѕРІ РђР»РµРєСЃРµР№ РђР»РµРєСЃР°РЅРґСЂРѕРІРёС‡',
      action: 'returned',
      timestamp: subDays(today, 12) + 'T17:30:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      actualReturn: subDays(today, 12),
      notes: 'Р’РѕР·РІСЂР°С‰РµРЅ РЅР° СЃРєР»Р°Рґ, РЅР°РїСЂР°РІР»РµРЅ РІ Р·РѕРЅСѓ РєР°СЂР°РЅС‚РёРЅР° РґР»СЏ РїРѕРІРµСЂРєРё'
    },
    {
      id: 'mov-12',
      deviceId: 'dev-9',
      deviceName: 'РњРЅРѕРіРѕС„СѓРЅРєС†РёРѕРЅР°Р»СЊРЅС‹Р№ РєР°Р»РёР±СЂР°С‚РѕСЂ РЎР Transmille 3000 Series',
      deviceBarcode: 'DEV:00109',
      action: 'returned_verification',
      timestamp: subDays(today, 11) + 'T13:00:00.000Z',
      operator: 'РљСѓР·РЅРµС†РѕРІР° Р•.Рџ.',
      notes: 'РџРѕР»СѓС‡РµРЅРѕ СЃРІРёРґРµС‚РµР»СЊСЃС‚РІРѕ Рѕ РїРѕРІРµСЂРєРµ в„–РЎ-РњРђ/12-01-2025/1109, РіРѕРґРµРЅ 12 РјРµСЃ.'
    },
    {
      id: 'mov-13',
      deviceId: 'dev-1',
      deviceName: 'РђРЅР°Р»РёР·Р°С‚РѕСЂ СЃРїРµРєС‚СЂР° Rohde & Schwarz FSL6',
      deviceBarcode: 'DEV:00101',
      employeeId: 'emp-2',
      employeeName: 'РЎРјРёСЂРЅРѕРІ РљРѕРЅСЃС‚Р°РЅС‚РёРЅ Р’Р°СЃРёР»СЊРµРІРёС‡',
      action: 'issued',
      timestamp: subDays(today, 10) + 'T08:45:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      expectedReturn: subDays(today, 7),
      notes: 'РР·РјРµСЂРµРЅРёРµ С„Р°Р·РѕРІС‹С… С€СѓРјРѕРІ РіРµРЅРµСЂР°С‚РѕСЂР°'
    },
    {
      id: 'mov-14',
      deviceId: 'dev-1',
      deviceName: 'РђРЅР°Р»РёР·Р°С‚РѕСЂ СЃРїРµРєС‚СЂР° Rohde & Schwarz FSL6',
      deviceBarcode: 'DEV:00101',
      employeeId: 'emp-2',
      employeeName: 'РЎРјРёСЂРЅРѕРІ РљРѕРЅСЃС‚Р°РЅС‚РёРЅ Р’Р°СЃРёР»СЊРµРІРёС‡',
      action: 'returned',
      timestamp: subDays(today, 7) + 'T16:00:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      actualReturn: subDays(today, 7),
      notes: 'Р’РѕР·РІСЂР°С‰РµРЅ Р±РµР· Р·Р°РјРµС‡Р°РЅРёР№'
    },
    {
      id: 'mov-15',
      deviceId: 'dev-5',
      deviceName: 'Р“РµРЅРµСЂР°С‚РѕСЂ СЃРёРіРЅР°Р»РѕРІ РїСЂРѕРёР·РІРѕР»СЊРЅРѕР№ С„РѕСЂРјС‹ Rigol DG4162',
      deviceBarcode: 'DEV:00105',
      employeeId: 'emp-2',
      employeeName: 'РЎРјРёСЂРЅРѕРІ РљРѕРЅСЃС‚Р°РЅС‚РёРЅ Р’Р°СЃРёР»СЊРµРІРёС‡',
      action: 'issued',
      timestamp: subDays(today, 8) + 'T14:30:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      expectedReturn: subDays(today, 1),
      notes: 'РЎС‚РµРЅРґРѕРІР°СЏ РѕС‚Р»Р°РґРєР° С†РёС„СЂРѕРІРѕРіРѕ РґРµРјРѕРґСѓР»СЏС‚РѕСЂР°'
    },
    {
      id: 'mov-16',
      deviceId: 'dev-2',
      deviceName: 'РџСЂРµС†РёР·РёРѕРЅРЅС‹Р№ РёСЃС‚РѕС‡РЅРёРє РїРёС‚Р°РЅРёСЏ Keysight E36313A',
      deviceBarcode: 'DEV:00102',
      employeeId: 'emp-1',
      employeeName: 'РРІР°РЅРѕРІ РђР»РµРєСЃРµР№ РђР»РµРєСЃР°РЅРґСЂРѕРІРёС‡',
      action: 'issued',
      timestamp: subDays(today, 3) + 'T09:15:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      expectedReturn: addDays(today, 4),
      notes: 'РЎС‚РµРЅРґ РЎР’Р§ СѓСЃРёР»РёС‚РµР»СЏ РјРѕС‰РЅРѕСЃС‚Рё'
    },
    {
      id: 'mov-17',
      deviceId: 'dev-7',
      deviceName: 'Р§Р°СЃС‚РѕС‚РѕРјРµСЂ СЌР»РµРєС‚СЂРѕРЅРЅРѕ-СЃС‡РµС‚РЅС‹Р№ Р§3-88',
      deviceBarcode: 'DEV:00107',
      employeeId: 'emp-5',
      employeeName: 'Р’Р°СЃРёР»СЊРµРІ РџРµС‚СЂ РќРёРєРѕР»Р°РµРІРёС‡',
      action: 'issued',
      timestamp: subDays(today, 3) + 'T10:00:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      expectedReturn: subDays(today, 2),
      notes: 'РљРѕРЅС‚СЂРѕР»СЊ СЃС‚Р°Р±РёР»СЊРЅРѕСЃС‚Рё С‚РµСЂРјРѕСЃС‚Р°С‚Р°'
    },
    {
      id: 'mov-18',
      deviceId: 'dev-7',
      deviceName: 'Р§Р°СЃС‚РѕС‚РѕРјРµСЂ СЌР»РµРєС‚СЂРѕРЅРЅРѕ-СЃС‡РµС‚РЅС‹Р№ Р§3-88',
      deviceBarcode: 'DEV:00107',
      employeeId: 'emp-5',
      employeeName: 'Р’Р°СЃРёР»СЊРµРІ РџРµС‚СЂ РќРёРєРѕР»Р°РµРІРёС‡',
      action: 'returned',
      timestamp: subDays(today, 2) + 'T17:15:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      actualReturn: subDays(today, 2),
      notes: 'Р’РѕР·РІСЂР°С‚ РЅР° СЃС‚РµР»Р»Р°Р¶ 2'
    },
    {
      id: 'mov-19',
      deviceId: 'dev-3',
      deviceName: 'РћСЃС†РёР»Р»РѕРіСЂР°С„ С†РёС„СЂРѕРІРѕР№ С„РѕСЃС„РѕСЂРЅС‹Р№ Tektronix TBS2104B',
      deviceBarcode: 'DEV:00103',
      action: 'relocated',
      timestamp: subDays(today, 1) + 'T11:00:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      notes: 'РџРѕРґРіРѕС‚РѕРІРєР° Рє РїРµСЂРёРѕРґРёС‡РµСЃРєРѕР№ РїРѕРІРµСЂРєРµ (РїРѕРІРµСЂРєР° С‡РµСЂРµР· 15 РґРЅ)'
    },
    {
      id: 'mov-20',
      deviceId: 'dev-10',
      deviceName: 'РђРЅР°Р»РёР·Р°С‚РѕСЂ С†РµРїРµР№ РІРµРєС‚РѕСЂРЅС‹Р№ Planar 804/1',
      deviceBarcode: 'DEV:00110',
      action: 'decommissioned',
      timestamp: '2024-11-15T10:00:00.000Z',
      operator: 'РљСѓР·РЅРµС†РѕРІР° Р•.Рџ.',
      notes: 'Р’С‹С…РѕРґ РёР· СЃС‚СЂРѕСЏ РЎР’Р§-Р±Р»РѕРєР° Р±РµР· РІРѕР·РјРѕР¶РЅРѕСЃС‚Рё РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёСЏ. РђРєС‚ СЃРїРёСЃР°РЅРёСЏ СѓС‚РІРµСЂР¶РґРµРЅ.'
    }
  ];

  const inventorySessions: InventorySession[] = [
    {
      id: 'inv-1',
      title: 'Р“РѕРґРѕРІР°СЏ РїР»Р°РЅРѕРІР°СЏ РёРЅРІРµРЅС‚Р°СЂРёР·Р°С†РёСЏ СЃРєР»Р°РґР° РЎР в„–1',
      status: 'completed',
      createdAt: subDays(today, 60) + 'T09:00:00.000Z',
      closedAt: subDays(today, 60) + 'T16:30:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.',
      notes: 'Р’СЃРµ РїСЂРёР±РѕСЂС‹ СЃРєР»Р°РґР° РїСЂРѕРІРµСЂРµРЅС‹, СЂР°СЃС…РѕР¶РґРµРЅРёР№ РЅРµ РІС‹СЏРІР»РµРЅРѕ',
      totalExpected: 9,
      totalScanned: 9,
      totalMatch: 9,
      totalMissing: 0,
      totalExtra: 0
    }
  ];

  const inventoryItems: InventoryItem[] = [
    {
      id: 'inv-item-1',
      sessionId: 'inv-1',
      deviceId: 'dev-1',
      barcode: 'DEV:00101',
      deviceName: 'РђРЅР°Р»РёР·Р°С‚РѕСЂ СЃРїРµРєС‚СЂР° Rohde & Schwarz FSL6',
      model: 'Rohde & Schwarz FSL6',
      status: 'match',
      scannedAt: subDays(today, 60) + 'T09:12:00.000Z',
      operator: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.'
    }
  ];

  const terminals: Terminal[] = [
    {
      id: 'term-1',
      name: 'РўРµСЂРјРёРЅР°Р» РєР»Р°РґРѕРІС‰РёРєР° ESP32-S3 (РћСЃРЅРѕРІРЅРѕР№ СЃРєР»Р°Рґ)',
      ip: '192.168.1.145',
      port: 5005,
      mac: 'E0:5A:1B:4F:92:80',
      lastHeartbeat: new Date(Date.now() - 2000).toISOString(),
      rssi: -62,
      status: 'online',
      devicePrefix: 'DEV:',
      cardPrefix: 'CARD:'
    }
  ];

  const departments: Department[] = [
    { id: 'dept-1', name: 'РћС‚РґРµР» СЂР°Р·СЂР°Р±РѕС‚РєРё РЎР’Р§ Р°РїРїР°СЂР°С‚СѓСЂС‹', code: 'РћР‘Р -РЎР’Р§', headName: 'РРІР°РЅРѕРІ Рђ.Рђ.', description: 'Р Р°Р·СЂР°Р±РѕС‚РєР° РЎР’Р§ РїСЂРёС‘РјРЅРёРєРѕРІ Рё РїРµСЂРµРґР°С‚С‡РёРєРѕРІ' },
    { id: 'dept-2', name: 'Р›Р°Р±РѕСЂР°С‚РѕСЂРёСЏ СЂР°РґРёРѕРёР·РјРµСЂРµРЅРёР№', code: 'Р›РђР‘-Р Р', headName: 'РЎРјРёСЂРЅРѕРІ Рљ.Р’.', description: 'РџСЂРѕРІРµРґРµРЅРёРµ СЂР°РґРёРѕРёР·РјРµСЂРµРЅРёР№ Рё РїРѕРІРµСЂРєРё РѕР±РѕСЂСѓРґРѕРІР°РЅРёСЏ' },
    { id: 'dept-3', name: 'РћС‚РґРµР» РіР»Р°РІРЅРѕРіРѕ РјРµС‚СЂРѕР»РѕРіР° (РћР“Рњ)', code: 'РћР“Рњ', headName: 'РљСѓР·РЅРµС†РѕРІР° Р•.Рџ.', description: 'РњРµС‚СЂРѕР»РѕРіРёС‡РµСЃРєРѕРµ РѕР±РµСЃРїРµС‡РµРЅРёРµ РїСЂРѕРёР·РІРѕРґСЃС‚РІР°' },
    { id: 'dept-4', name: 'Р¦РµС… СЃР±РѕСЂРєРё в„–2', code: 'Р¦РЎ-2', headName: 'РЎРёРґРѕСЂРѕРІ Р’.Рњ.', description: 'РЎР±РѕСЂРєР° СЂР°РґРёРѕСЌР»РµРєС‚СЂРѕРЅРЅС‹С… Р±Р»РѕРєРѕРІ' },
    { id: 'dept-5', name: 'РСЃРїС‹С‚Р°С‚РµР»СЊРЅС‹Р№ С†РµРЅС‚СЂ', code: 'РР¦', headName: 'РџРµС‚СЂРѕРІ РЎ.Р’.', description: 'РљР»РёРјР°С‚РёС‡РµСЃРєРёРµ Рё РІРёР±СЂР°С†РёРѕРЅРЅС‹Рµ РёСЃРїС‹С‚Р°РЅРёСЏ РЎР' }
  ];

  const settings: AppSettings = {
    blockExpiredVerification: true,
    blockIssueOnExpiredVerification: true,
    blockIssueOnNoBorrowRights: true,
    defaultReturnDays: 7,
    duplicateWindowMs: 350,
    duplicateScanWindowMs: 350,
    udpPort: 5005,
    heartbeatTimeoutSec: 6,
    terminalTimeoutSeconds: 6,
    autoPrintQr: false,
    wifiSsid: '1235',
    wifiPassword: '63336333',
    pcIp: '192.168.137.1',
    scannerIp: '192.168.137.100',
    scannerPrefix: 'SCAN:'
  };

  const scanners: ScannerDevice[] = [
    {
      id: 'scn-1',
      name: 'РћСЃРЅРѕРІРЅРѕР№ Р±РµСЃРїСЂРѕРІРѕРґРЅРѕР№ СЃРєР°РЅРµСЂ в„–1',
      type: 'network_scanner',
      identifier: '192.168.137.100',
      location: 'РЎРєР»Р°Рґ РЎР / Р—РѕРЅР° РІС‹РґР°С‡Рё',
      status: 'active',
      addedAt: '2025-01-10T08:00:00.000Z'
    },
    {
      id: 'scn-2',
      name: 'РЎРєР°РЅРµСЂ Р»Р°Р±РѕСЂР°С‚РѕСЂРёРё РїРѕРІРµСЂРєРё в„–2',
      type: 'usb_keyboard',
      identifier: 'USB-HID-02',
      location: 'РЎРµРєС†РёСЏ РїРѕРІРµСЂРєРё РћР“Рњ',
      status: 'active',
      addedAt: '2025-01-15T09:00:00.000Z'
    }
  ];

  return repairSeedText({
    users,
    devices,
    employees,
    departments,
    scanners,
    movements,
    inventorySessions,
    inventoryItems,
    terminals,
    settings
  });
}


export { Database, db } from './db-pg.js';
