import fs from 'fs';
import path from 'path';
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

interface DatabaseSchema {
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

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'metrology_db.json');

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

export function createInitialSeed(): DatabaseSchema {
  const users: User[] = [
    { id: 'usr-1', username: 'operator', fullName: 'Сидоров Виктор Михайлович (Кладовщик)', role: 'operator' },
    { id: 'usr-2', username: 'metrologist', fullName: 'Кузнецова Елена Павловна (Метролог ОГМ)', role: 'metrologist' },
    { id: 'usr-3', username: 'supervisor', fullName: 'Петров Сергей Владимирович (Начальник участка)', role: 'supervisor' },
    { id: 'usr-4', username: 'admin', fullName: 'Администратор системы', role: 'admin' },
  ];

  const employees: Employee[] = [
    {
      id: 'emp-1',
      badgeId: 'CARD:0004928192',
      fullName: 'Иванов Алексей Александрович',
      department: 'Отдел разработки СВЧ аппаратуры',
      phone: '+7 (916) 234-56-78',
      email: 'a.ivanov@company.local',
      canBorrow: true,
      activeBorrowedCount: 1,
      createdAt: '2025-01-10T08:00:00.000Z'
    },
    {
      id: 'emp-2',
      badgeId: 'CARD:0005118274',
      fullName: 'Смирнов Константин Васильевич',
      department: 'Отдел радиоизмерений',
      phone: '+7 (926) 888-12-34',
      email: 'k.smirnov@company.local',
      canBorrow: true,
      activeBorrowedCount: 1,
      createdAt: '2025-01-15T09:30:00.000Z'
    },
    {
      id: 'emp-3',
      badgeId: 'CARD:0006291038',
      fullName: 'Кузнецова Елена Павловна',
      department: 'Отдел главного метролога (ОГМ)',
      phone: '+7 (903) 555-77-99',
      email: 'e.kuznetsova@company.local',
      canBorrow: true,
      activeBorrowedCount: 0,
      createdAt: '2025-01-20T10:00:00.000Z'
    },
    {
      id: 'emp-4',
      badgeId: 'CARD:0007829104',
      fullName: 'Новиков Денис Игоревич',
      department: 'Производственная практика (стажер)',
      phone: '+7 (977) 111-22-33',
      email: 'd.novikov@company.local',
      canBorrow: false, // ТЕСТ: право брать СИ отозвано
      activeBorrowedCount: 0,
      createdAt: '2025-02-01T11:00:00.000Z'
    },
    {
      id: 'emp-5',
      badgeId: 'CARD:0008392019',
      fullName: 'Васильев Петр Николаевич',
      department: 'Сектор климатических и ресурсных испытаний',
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
      name: 'Анализатор спектра',
      model: 'Rohde & Schwarz FSL6',
      serialNumber: 'RS-99321',
      inventoryNumber: 'ИНВ-00101',
      status: 'in_stock',
      location: 'Склад СИ, Стеллаж 1, Полка А-2',
      lastVerificationDate: subDays(today, 120),
      nextVerificationDate: addDays(today, 245), // С поверкой всё отлично
      specs: '9 кГц — 6 ГГц, полоса разрешения 300 Гц — 10 МГц',
      notes: 'Комплект: измерительный кабель N-type, аттенюатор 20 дБ',
      createdAt: '2025-01-05T10:00:00.000Z',
      updatedAt: '2025-01-05T10:00:00.000Z'
    },
    {
      id: 'dev-2',
      barcode: 'DEV:00102',
      name: 'Прецизионный источник питания',
      model: 'Keysight E36313A',
      serialNumber: 'KS-44211',
      inventoryNumber: 'ИНВ-00102',
      status: 'issued', // ВЫДАН
      location: 'СВЧ стенд №4',
      lastVerificationDate: subDays(today, 200),
      nextVerificationDate: addDays(today, 165),
      specs: '3 канала, 6V/10A, 2x 25V/2A, суммарно 160 Вт',
      notes: 'Выдан для испытаний усилителя мощности',
      currentHolderId: 'emp-1',
      currentHolderName: 'Иванов Алексей Александрович',
      issuedAt: subDays(today, 3) + 'T09:15:00.000Z',
      expectedReturnDate: addDays(today, 30),
      createdAt: '2025-01-06T11:00:00.000Z',
      updatedAt: '2025-03-05T09:15:00.000Z'
    },
    {
      id: 'dev-3',
      barcode: 'DEV:00103',
      name: 'Осциллограф цифровой фосфорный',
      model: 'Tektronix TBS2104B',
      serialNumber: 'TK-88192',
      inventoryNumber: 'ИНВ-00103',
      status: 'in_stock',
      location: 'Склад СИ, Стеллаж 1, Полка Б-1',
      lastVerificationDate: subDays(today, 350),
      nextVerificationDate: addDays(today, 15), // ВНИМАНИЕ: поверка через 15 дней (< 30 дней)
      specs: '100 МГц, 4 аналоговых канала, 2 Гвыб/с',
      notes: 'Требуется запланировать поверку в текущем месяце',
      createdAt: '2025-01-07T12:00:00.000Z',
      updatedAt: '2025-01-07T12:00:00.000Z'
    },
    {
      id: 'dev-4',
      barcode: 'DEV:00104',
      name: 'Мультиметр цифровой 6.5 разрядов',
      model: 'Fluke 8846A',
      serialNumber: 'FL-11094',
      inventoryNumber: 'ИНВ-00104',
      status: 'in_stock',
      location: 'Склад СИ, Зона карантина/поверки',
      lastVerificationDate: subDays(today, 375),
      nextVerificationDate: subDays(today, 10), // ТЕСТ: ПОВЕРКА ПРОСРОЧЕНА НА 10 ДНЕЙ!
      specs: 'Точность 0.0024% DC, измерение ёмкости и температуры',
      notes: 'ВНИМАНИЕ: Свидетельство о поверке истекло. Выдача запрещена регламентом!',
      createdAt: '2025-01-08T09:00:00.000Z',
      updatedAt: '2025-03-01T08:00:00.000Z'
    },
    {
      id: 'dev-5',
      barcode: 'DEV:00105',
      name: 'Генератор сигналов произвольной формы',
      model: 'Rigol DG4162',
      serialNumber: 'RG-33910',
      inventoryNumber: 'ИНВ-00105',
      status: 'issued', // ВЫДАН
      location: 'Участок радиоизмерений, стол 2',
      lastVerificationDate: subDays(today, 180),
      nextVerificationDate: addDays(today, 185),
      specs: '160 МГц, 2 канала, 500 Мвыб/с, 14 бит ЦАП',
      notes: 'Выдан со шнурами BNC-BNC',
      currentHolderId: 'emp-2',
      currentHolderName: 'Смирнов Константин Васильевич',
      issuedAt: subDays(today, 8) + 'T14:30:00.000Z',
      expectedReturnDate: addDays(today, 30),
      createdAt: '2025-01-09T14:00:00.000Z',
      updatedAt: '2025-03-01T14:30:00.000Z'
    },
    {
      id: 'dev-6',
      barcode: 'DEV:00106',
      name: 'Измеритель иммитанса RLC прецизионный',
      model: 'МНИПИ E7-20',
      serialNumber: 'MN-77218',
      inventoryNumber: 'ИНВ-00106',
      status: 'in_verification', // В ПОВЕРКЕ
      location: 'Орган поверки (ЦСМ)',
      lastVerificationDate: subDays(today, 366),
      nextVerificationDate: addDays(today, 20),
      specs: 'Диапазон частот 25 Гц — 1 МГц, базовая погрешность 0.1%',
      notes: 'Передан по накладной №412 от ' + subDays(today, 5),
      createdAt: '2025-01-11T10:30:00.000Z',
      updatedAt: '2025-03-04T10:30:00.000Z'
    },
    {
      id: 'dev-7',
      barcode: 'DEV:00107',
      name: 'Частотомер электронно-счетный',
      model: 'Ч3-88',
      serialNumber: 'CH-55102',
      inventoryNumber: 'ИНВ-00107',
      status: 'in_stock',
      location: 'Склад СИ, Стеллаж 2, Полка А-1',
      lastVerificationDate: subDays(today, 320),
      nextVerificationDate: addDays(today, 45), // Поверка через 45 дней (< 60 дней)
      specs: 'Диапазон 0.01 Гц — 200 МГц (с делителем до 2.4 ГГц)',
      notes: 'Проверен термостатированный кварцевый генератор',
      createdAt: '2025-01-12T15:00:00.000Z',
      updatedAt: '2025-01-12T15:00:00.000Z'
    },
    {
      id: 'dev-8',
      barcode: 'DEV:00108',
      name: 'Мегаомметр цифровой испытательный',
      model: 'Sonel MIC-2510',
      serialNumber: 'SN-90214',
      inventoryNumber: 'ИНВ-00108',
      status: 'in_repair', // В РЕМОНТЕ
      location: 'Мастерская КИПиА',
      lastVerificationDate: subDays(today, 90),
      nextVerificationDate: addDays(today, 275),
      specs: 'Испытательное напряжение до 2500 В, сопротивление до 2 ТОм',
      notes: 'Ремонт: замена разъема защитного экрана Guard',
      createdAt: '2025-01-13T16:00:00.000Z',
      updatedAt: '2025-03-02T11:00:00.000Z'
    },
    {
      id: 'dev-9',
      barcode: 'DEV:00109',
      name: 'Многофункциональный калибратор СИ',
      model: 'Transmille 3000 Series',
      serialNumber: 'TR-10022',
      inventoryNumber: 'ИНВ-00109',
      status: 'in_stock',
      location: 'Участок эталонов ОГМ, комн. 204',
      lastVerificationDate: subDays(today, 60),
      nextVerificationDate: addDays(today, 305),
      specs: 'Эталон напряжения, тока, сопротивления, емкости и термопар',
      notes: 'Эталон 2-го разряда, выдача только сотрудникам ОГМ',
      createdAt: '2025-01-14T09:00:00.000Z',
      updatedAt: '2025-01-14T09:00:00.000Z'
    },
    {
      id: 'dev-10',
      barcode: 'DEV:00110',
      name: 'Анализатор цепей векторный',
      model: 'Planar 804/1 (Copper Mountain)',
      serialNumber: 'CM-67291',
      inventoryNumber: 'ИНВ-00110',
      status: 'decommissioned', // СПИСАН
      location: 'Архив / Утилизация',
      lastVerificationDate: '2023-05-12',
      nextVerificationDate: '2024-05-12',
      specs: '100 кГц — 8 ГГц, 2 порта, 50 Ом',
      notes: 'Списан по акту технического состояния №14/24 от 15.11.2024',
      createdAt: '2024-01-10T10:00:00.000Z',
      updatedAt: '2024-11-15T10:00:00.000Z'
    }
  ];

  // 20 realistic movements showing complete history
  const movements: Movement[] = [
    {
      id: 'mov-01',
      deviceId: 'dev-1',
      deviceName: 'Анализатор спектра Rohde & Schwarz FSL6',
      deviceBarcode: 'DEV:00101',
      employeeId: 'emp-1',
      employeeName: 'Иванов Алексей Александрович',
      action: 'issued',
      timestamp: subDays(today, 60) + 'T08:30:00.000Z',
      operator: 'Сидоров В.М.',
      expectedReturn: subDays(today, 55),
      notes: 'Для калибровки приемного тракта'
    },
    {
      id: 'mov-02',
      deviceId: 'dev-1',
      deviceName: 'Анализатор спектра Rohde & Schwarz FSL6',
      deviceBarcode: 'DEV:00101',
      employeeId: 'emp-1',
      employeeName: 'Иванов Алексей Александрович',
      action: 'returned',
      timestamp: subDays(today, 55) + 'T17:00:00.000Z',
      operator: 'Сидоров В.М.',
      actualReturn: subDays(today, 55),
      notes: 'Возврат в полной комплектности, замечаний нет'
    },
    {
      id: 'mov-03',
      deviceId: 'dev-2',
      deviceName: 'Прецизионный источник питания Keysight E36313A',
      deviceBarcode: 'DEV:00102',
      employeeId: 'emp-2',
      employeeName: 'Смирнов Константин Васильевич',
      action: 'issued',
      timestamp: subDays(today, 45) + 'T09:10:00.000Z',
      operator: 'Сидоров В.М.',
      expectedReturn: subDays(today, 40),
      notes: 'Питание макета синтезатора'
    },
    {
      id: 'mov-04',
      deviceId: 'dev-2',
      deviceName: 'Прецизионный источник питания Keysight E36313A',
      deviceBarcode: 'DEV:00102',
      employeeId: 'emp-2',
      employeeName: 'Смирнов Константин Васильевич',
      action: 'returned',
      timestamp: subDays(today, 40) + 'T16:20:00.000Z',
      operator: 'Сидоров В.М.',
      actualReturn: subDays(today, 40),
      notes: 'Возврат на стеллаж 1'
    },
    {
      id: 'mov-05',
      deviceId: 'dev-3',
      deviceName: 'Осциллограф цифровой фосфорный Tektronix TBS2104B',
      deviceBarcode: 'DEV:00103',
      employeeId: 'emp-5',
      employeeName: 'Васильев Петр Николаевич',
      action: 'issued',
      timestamp: subDays(today, 35) + 'T11:00:00.000Z',
      operator: 'Сидоров В.М.',
      expectedReturn: subDays(today, 25),
      notes: 'Термоклиматические испытания блока питания'
    },
    {
      id: 'mov-06',
      deviceId: 'dev-3',
      deviceName: 'Осциллограф цифровой фосфорный Tektronix TBS2104B',
      deviceBarcode: 'DEV:00103',
      employeeId: 'emp-5',
      employeeName: 'Васильев Петр Николаевич',
      action: 'returned',
      timestamp: subDays(today, 25) + 'T15:45:00.000Z',
      operator: 'Сидоров В.М.',
      actualReturn: subDays(today, 25),
      notes: 'Возвращен без повреждений, 4 щупа проверены'
    },
    {
      id: 'mov-07',
      deviceId: 'dev-6',
      deviceName: 'Измеритель иммитанса RLC прецизионный МНИПИ E7-20',
      deviceBarcode: 'DEV:00106',
      employeeId: 'emp-3',
      employeeName: 'Кузнецова Елена Павловна',
      action: 'sent_verification',
      timestamp: subDays(today, 24) + 'T10:00:00.000Z',
      operator: 'Кузнецова Е.П.',
      notes: 'Отправлен в орган поверки (ЦСМ) на периодическую поверку'
    },
    {
      id: 'mov-08',
      deviceId: 'dev-7',
      deviceName: 'Частотомер электронно-счетный Ч3-88',
      deviceBarcode: 'DEV:00107',
      action: 'relocated',
      timestamp: subDays(today, 20) + 'T14:15:00.000Z',
      operator: 'Сидоров В.М.',
      notes: 'Перемещен с временного стола на стеллаж 2, полка А-1'
    },
    {
      id: 'mov-09',
      deviceId: 'dev-8',
      deviceName: 'Мегаомметр цифровой испытательный Sonel MIC-2510',
      deviceBarcode: 'DEV:00108',
      action: 'sent_repair',
      timestamp: subDays(today, 18) + 'T11:30:00.000Z',
      operator: 'Сидоров В.М.',
      notes: 'Неисправность клеммы Guard, оформлен наряд в мастерскую'
    },
    {
      id: 'mov-10',
      deviceId: 'dev-4',
      deviceName: 'Мультиметр цифровой 6.5 разрядов Fluke 8846A',
      deviceBarcode: 'DEV:00104',
      employeeId: 'emp-1',
      employeeName: 'Иванов Алексей Александрович',
      action: 'issued',
      timestamp: subDays(today, 16) + 'T09:00:00.000Z',
      operator: 'Сидоров В.М.',
      expectedReturn: subDays(today, 12),
      notes: 'До истечения срока поверки оставалось 6 дней'
    },
    {
      id: 'mov-11',
      deviceId: 'dev-4',
      deviceName: 'Мультиметр цифровой 6.5 разрядов Fluke 8846A',
      deviceBarcode: 'DEV:00104',
      employeeId: 'emp-1',
      employeeName: 'Иванов Алексей Александрович',
      action: 'returned',
      timestamp: subDays(today, 12) + 'T17:30:00.000Z',
      operator: 'Сидоров В.М.',
      actualReturn: subDays(today, 12),
      notes: 'Возвращен на склад, направлен в зону карантина для поверки'
    },
    {
      id: 'mov-12',
      deviceId: 'dev-9',
      deviceName: 'Многофункциональный калибратор СИ Transmille 3000 Series',
      deviceBarcode: 'DEV:00109',
      action: 'returned_verification',
      timestamp: subDays(today, 11) + 'T13:00:00.000Z',
      operator: 'Кузнецова Е.П.',
      notes: 'Получено свидетельство о поверке №С-МА/12-01-2025/1109, годен 12 мес.'
    },
    {
      id: 'mov-13',
      deviceId: 'dev-1',
      deviceName: 'Анализатор спектра Rohde & Schwarz FSL6',
      deviceBarcode: 'DEV:00101',
      employeeId: 'emp-2',
      employeeName: 'Смирнов Константин Васильевич',
      action: 'issued',
      timestamp: subDays(today, 10) + 'T08:45:00.000Z',
      operator: 'Сидоров В.М.',
      expectedReturn: subDays(today, 7),
      notes: 'Измерение фазовых шумов генератора'
    },
    {
      id: 'mov-14',
      deviceId: 'dev-1',
      deviceName: 'Анализатор спектра Rohde & Schwarz FSL6',
      deviceBarcode: 'DEV:00101',
      employeeId: 'emp-2',
      employeeName: 'Смирнов Константин Васильевич',
      action: 'returned',
      timestamp: subDays(today, 7) + 'T16:00:00.000Z',
      operator: 'Сидоров В.М.',
      actualReturn: subDays(today, 7),
      notes: 'Возвращен без замечаний'
    },
    {
      id: 'mov-15',
      deviceId: 'dev-5',
      deviceName: 'Генератор сигналов произвольной формы Rigol DG4162',
      deviceBarcode: 'DEV:00105',
      employeeId: 'emp-2',
      employeeName: 'Смирнов Константин Васильевич',
      action: 'issued',
      timestamp: subDays(today, 8) + 'T14:30:00.000Z',
      operator: 'Сидоров В.М.',
      expectedReturn: subDays(today, 1),
      notes: 'Стендовая отладка цифрового демодулятора'
    },
    {
      id: 'mov-16',
      deviceId: 'dev-2',
      deviceName: 'Прецизионный источник питания Keysight E36313A',
      deviceBarcode: 'DEV:00102',
      employeeId: 'emp-1',
      employeeName: 'Иванов Алексей Александрович',
      action: 'issued',
      timestamp: subDays(today, 3) + 'T09:15:00.000Z',
      operator: 'Сидоров В.М.',
      expectedReturn: addDays(today, 4),
      notes: 'Стенд СВЧ усилителя мощности'
    },
    {
      id: 'mov-17',
      deviceId: 'dev-7',
      deviceName: 'Частотомер электронно-счетный Ч3-88',
      deviceBarcode: 'DEV:00107',
      employeeId: 'emp-5',
      employeeName: 'Васильев Петр Николаевич',
      action: 'issued',
      timestamp: subDays(today, 3) + 'T10:00:00.000Z',
      operator: 'Сидоров В.М.',
      expectedReturn: subDays(today, 2),
      notes: 'Контроль стабильности термостата'
    },
    {
      id: 'mov-18',
      deviceId: 'dev-7',
      deviceName: 'Частотомер электронно-счетный Ч3-88',
      deviceBarcode: 'DEV:00107',
      employeeId: 'emp-5',
      employeeName: 'Васильев Петр Николаевич',
      action: 'returned',
      timestamp: subDays(today, 2) + 'T17:15:00.000Z',
      operator: 'Сидоров В.М.',
      actualReturn: subDays(today, 2),
      notes: 'Возврат на стеллаж 2'
    },
    {
      id: 'mov-19',
      deviceId: 'dev-3',
      deviceName: 'Осциллограф цифровой фосфорный Tektronix TBS2104B',
      deviceBarcode: 'DEV:00103',
      action: 'relocated',
      timestamp: subDays(today, 1) + 'T11:00:00.000Z',
      operator: 'Сидоров В.М.',
      notes: 'Подготовка к периодической поверке (поверка через 15 дн)'
    },
    {
      id: 'mov-20',
      deviceId: 'dev-10',
      deviceName: 'Анализатор цепей векторный Planar 804/1',
      deviceBarcode: 'DEV:00110',
      action: 'decommissioned',
      timestamp: '2024-11-15T10:00:00.000Z',
      operator: 'Кузнецова Е.П.',
      notes: 'Выход из строя СВЧ-блока без возможности восстановления. Акт списания утвержден.'
    }
  ];

  const inventorySessions: InventorySession[] = [
    {
      id: 'inv-1',
      title: 'Годовая плановая инвентаризация склада СИ №1',
      status: 'completed',
      createdAt: subDays(today, 60) + 'T09:00:00.000Z',
      closedAt: subDays(today, 60) + 'T16:30:00.000Z',
      operator: 'Сидоров В.М.',
      notes: 'Все приборы склада проверены, расхождений не выявлено',
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
      deviceName: 'Анализатор спектра Rohde & Schwarz FSL6',
      model: 'Rohde & Schwarz FSL6',
      status: 'match',
      scannedAt: subDays(today, 60) + 'T09:12:00.000Z',
      operator: 'Сидоров В.М.'
    }
  ];

  const terminals: Terminal[] = [
    {
      id: 'term-1',
      name: 'Терминал кладовщика ESP32-S3 (Основной склад)',
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
    { id: 'dept-1', name: 'Отдел разработки СВЧ аппаратуры', code: 'ОБР-СВЧ', headName: 'Иванов А.А.', description: 'Разработка СВЧ приёмников и передатчиков' },
    { id: 'dept-2', name: 'Лаборатория радиоизмерений', code: 'ЛАБ-РИ', headName: 'Смирнов К.В.', description: 'Проведение радиоизмерений и поверки оборудования' },
    { id: 'dept-3', name: 'Отдел главного метролога (ОГМ)', code: 'ОГМ', headName: 'Кузнецова Е.П.', description: 'Метрологическое обеспечение производства' },
    { id: 'dept-4', name: 'Цех сборки №2', code: 'ЦС-2', headName: 'Сидоров В.М.', description: 'Сборка радиоэлектронных блоков' },
    { id: 'dept-5', name: 'Испытательный центр', code: 'ИЦ', headName: 'Петров С.В.', description: 'Климатические и вибрационные испытания СИ' }
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
      name: 'Основной беспроводной сканер №1',
      type: 'network_scanner',
      identifier: '192.168.137.100',
      location: 'Склад СИ / Зона выдачи',
      status: 'active',
      addedAt: '2025-01-10T08:00:00.000Z'
    },
    {
      id: 'scn-2',
      name: 'Сканер лаборатории поверки №2',
      type: 'usb_keyboard',
      identifier: 'USB-HID-02',
      location: 'Секция поверки ОГМ',
      status: 'active',
      addedAt: '2025-01-15T09:00:00.000Z'
    }
  ];

  return {
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
  };
}

export class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureDir();
    this.data = this.load();
  }

  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.devices && parsed.employees) {
          if (!parsed.scanners) {
            parsed.scanners = [
              {
                id: 'scn-1',
                name: 'Основной беспроводной сканер №1',
                type: 'network_scanner',
                identifier: '192.168.137.100',
                location: 'Склад СИ / Зона выдачи',
                status: 'active',
                addedAt: '2025-01-10T08:00:00.000Z'
              }
            ];
          }
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Could not read existing database file, re-seeding:', err);
    }
    const seed = createInitialSeed();
    this.saveDirect(seed);
    return seed;
  }

  private saveDirect(data: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  public save() {
    this.saveDirect(this.data);
  }

  public saveDebounced(delayMs = 10000) {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.saveDirect(this.data);
    }, delayMs);
  }

  public resetToSeed(): DatabaseSchema {
    this.data = createInitialSeed();
    this.save();
    return this.data;
  }

  public backupJson(): string {
    return JSON.stringify(this.data, null, 2);
  }

  public restoreJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.devices && parsed.employees && parsed.movements) {
        this.data = parsed;
        this.save();
        return true;
      }
    } catch (err) {
      console.error('Failed to restore database from JSON:', err);
    }
    return false;
  }

  // --- Users ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  // --- Devices ---
  public getDevices(): Device[] {
    return [...this.data.devices];
  }

  public getDeviceById(id: string): Device | undefined {
    return this.data.devices.find(d => d.id === id);
  }

  public getDeviceByBarcode(barcode: string): Device | undefined {
    const clean = barcode.trim();
    return this.data.devices.find(d => 
      d.barcode.toLowerCase() === clean.toLowerCase() ||
      d.barcode.replace(/^DEV:/i, '').toLowerCase() === clean.replace(/^DEV:/i, '').toLowerCase() ||
      d.serialNumber.toLowerCase() === clean.toLowerCase() ||
      d.inventoryNumber.toLowerCase() === clean.toLowerCase()
    );
  }

  public createDevice(device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>): Device {
    const newDevice: Device = {
      ...device,
      id: `dev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.devices.unshift(newDevice);
    this.save();
    return newDevice;
  }

  public updateDevice(id: string, updates: Partial<Device>): Device | undefined {
    const index = this.data.devices.findIndex(d => d.id === id);
    if (index === -1) return undefined;
    this.data.devices[index] = {
      ...this.data.devices[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.devices[index];
  }

  public deleteDevice(id: string): boolean {
    const index = this.data.devices.findIndex(d => d.id === id);
    if (index === -1) return false;
    this.data.devices.splice(index, 1);
    this.save();
    return true;
  }

  // --- Employees ---
  public getEmployees(): Employee[] {
    // Dynamically calculate active borrowed counts
    return this.data.employees.map(emp => ({
      ...emp,
      activeBorrowedCount: this.data.devices.filter(d => d.currentHolderId === emp.id).length
    }));
  }

  public getEmployeeById(id: string): Employee | undefined {
    const emp = this.data.employees.find(e => e.id === id);
    if (!emp) return undefined;
    return {
      ...emp,
      activeBorrowedCount: this.data.devices.filter(d => d.currentHolderId === emp.id).length
    };
  }

  public getEmployeeByBadge(badge: string): Employee | undefined {
    const clean = badge.trim();
    const emp = this.data.employees.find(e => 
      e.badgeId.toLowerCase() === clean.toLowerCase() ||
      e.badgeId.replace(/^CARD:/i, '').toLowerCase() === clean.replace(/^CARD:/i, '').toLowerCase()
    );
    if (!emp) return undefined;
    return {
      ...emp,
      activeBorrowedCount: this.data.devices.filter(d => d.currentHolderId === emp.id).length
    };
  }

  public createEmployee(emp: Omit<Employee, 'id' | 'createdAt'>): Employee {
    const newEmp: Employee = {
      ...emp,
      id: `emp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    this.data.employees.push(newEmp);
    this.save();
    return newEmp;
  }

  public updateEmployee(id: string, updates: Partial<Employee>): Employee | undefined {
    const index = this.data.employees.findIndex(e => e.id === id);
    if (index === -1) return undefined;
    this.data.employees[index] = {
      ...this.data.employees[index],
      ...updates
    };
    this.save();
    return this.data.employees[index];
  }

  public deleteEmployee(id: string): boolean {
    const index = this.data.employees.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.data.employees.splice(index, 1);
    this.save();
    return true;
  }

  // --- Departments ---
  public getDepartments(): Department[] {
    if (!this.data.departments) {
      this.data.departments = [
        { id: 'dept-1', name: 'Отдел разработки СВЧ аппаратуры', code: 'ОБР-СВЧ', headName: 'Иванов А.А.' },
        { id: 'dept-2', name: 'Лаборатория радиоизмерений', code: 'ЛАБ-РИ', headName: 'Смирнов К.В.' },
        { id: 'dept-3', name: 'Отдел главного метролога (ОГМ)', code: 'ОГМ', headName: 'Кузнецова Е.П.' },
        { id: 'dept-4', name: 'Цех сборки №2', code: 'ЦС-2', headName: 'Сидоров В.М.' },
        { id: 'dept-5', name: 'Испытательный центр', code: 'ИЦ', headName: 'Петров С.В.' }
      ];
      this.save();
    }
    return this.data.departments.map(d => ({
      ...d,
      employeeCount: this.data.employees.filter(e => e.department === d.name).length
    }));
  }

  public addDepartment(dept: Omit<Department, 'id' | 'createdAt'>): Department {
    if (!this.data.departments) this.getDepartments();
    const newDept: Department = {
      ...dept,
      id: `dept-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.data.departments!.push(newDept);
    this.save();
    return newDept;
  }

  public updateDepartment(id: string, updates: Partial<Department>): Department | undefined {
    if (!this.data.departments) this.getDepartments();
    const index = this.data.departments!.findIndex(d => d.id === id);
    if (index === -1) return undefined;
    const oldName = this.data.departments![index].name;
    this.data.departments![index] = {
      ...this.data.departments![index],
      ...updates
    };
    if (updates.name && updates.name !== oldName) {
      this.data.employees.forEach(e => {
        if (e.department === oldName) e.department = updates.name!;
      });
    }
    this.save();
    return this.data.departments![index];
  }

  public deleteDepartment(id: string): boolean {
    if (!this.data.departments) this.getDepartments();
    const index = this.data.departments!.findIndex(d => d.id === id);
    if (index === -1) return false;
    this.data.departments!.splice(index, 1);
    this.save();
    return true;
  }

  // --- Movements (APPEND ONLY) ---
  public getMovements(filters?: {
    deviceId?: string;
    employeeId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Movement[] {
    let list = [...this.data.movements];
    if (filters) {
      if (filters.deviceId) {
        list = list.filter(m => m.deviceId === filters.deviceId);
      }
      if (filters.employeeId) {
        list = list.filter(m => m.employeeId === filters.employeeId);
      }
      if (filters.action) {
        list = list.filter(m => m.action === filters.action);
      }
      if (filters.startDate) {
        list = list.filter(m => m.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        list = list.filter(m => m.timestamp <= filters.endDate!);
      }
    }
    // Sort newest first
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addMovement(movement: Omit<Movement, 'id' | 'timestamp'>): Movement {
    const newMovement: Movement = {
      ...movement,
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.data.movements.unshift(newMovement);
    this.save();
    return newMovement;
  }

  // --- Core Business Logic: Issue Device ---
  public issueDevice(params: {
    deviceBarcodeOrId: string;
    employeeBadgeOrId: string;
    operatorName: string;
    expectedReturnDate?: string;
    notes?: string;
  }): { success: boolean; message: string; movement?: Movement; device?: Device } {
    const device = this.getDeviceById(params.deviceBarcodeOrId) || this.getDeviceByBarcode(params.deviceBarcodeOrId);
    if (!device) {
      return { success: false, message: `Прибор с идентификатором или кодом «${params.deviceBarcodeOrId}» не найден в базе данных.` };
    }

    const employee = this.getEmployeeById(params.employeeBadgeOrId) || this.getEmployeeByBadge(params.employeeBadgeOrId);
    if (!employee) {
      return { success: false, message: `Сотрудник с пропуском/ID «${params.employeeBadgeOrId}» не найден.` };
    }

    // Rule 1: Employee borrowing permission check
    if (!employee.canBorrow) {
      return { 
        success: false, 
        message: `Блокировка: У сотрудника «${employee.fullName}» (${employee.department}) отозвано право брать средства измерений.` 
      };
    }

    // Rule 2: Device status check
    if (device.status !== 'in_stock') {
      const statusLabels: Record<string, string> = {
        issued: `уже выдан сотруднику (${device.currentHolderName || 'неизвестно'})`,
        in_verification: 'находится на поверке/калибровке',
        in_repair: 'находится в ремонте',
        decommissioned: 'списан'
      };
      return {
        success: false,
        message: `Блокировка: Прибор «${device.name}» (${device.inventoryNumber}) не может быть выдан, так как он ${statusLabels[device.status] || device.status}.`
      };
    }

    // Rule 3: Verification expiration check
    if (this.data.settings.blockExpiredVerification) {
      const nowStr = new Date().toISOString().split('T')[0];
      if (device.nextVerificationDate < nowStr) {
        return {
          success: false,
          message: `Блокировка: Поверка прибора «${device.name}» (${device.inventoryNumber}) истекла ${device.nextVerificationDate}! Эксплуатация и выдача запрещены метрологическим регламентом.`
        };
      }
    }

    // Calculate expected return date
    const expectedReturn = params.expectedReturnDate || addDays(new Date(), this.data.settings.defaultReturnDays);

    // Update Device
    device.status = 'issued';
    device.currentHolderId = employee.id;
    device.currentHolderName = employee.fullName;
    device.issuedAt = new Date().toISOString();
    device.expectedReturnDate = expectedReturn;
    device.updatedAt = new Date().toISOString();

    // Log in append-only Movement Journal
    const movement = this.addMovement({
      deviceId: device.id,
      deviceName: `${device.name} ${device.model}`,
      deviceBarcode: device.barcode,
      employeeId: employee.id,
      employeeName: employee.fullName,
      action: 'issued',
      operator: params.operatorName || 'Оператор',
      expectedReturn,
      notes: params.notes || 'Выдача через терминал'
    });

    this.save();
    return {
      success: true,
      message: `Прибор «${device.name} ${device.model}» успешно выдан сотруднику ${employee.fullName}. Срок возврата: до ${expectedReturn}.`,
      movement,
      device
    };
  }

  // --- Core Business Logic: Return Device ---
  public returnDevice(params: {
    deviceBarcodeOrId: string;
    actualReturnerBadgeOrId?: string; // May be different from initial borrower!
    operatorName: string;
    notes?: string;
    newLocation?: string;
  }): { success: boolean; message: string; movement?: Movement; device?: Device } {
    const device = this.getDeviceById(params.deviceBarcodeOrId) || this.getDeviceByBarcode(params.deviceBarcodeOrId);
    if (!device) {
      return { success: false, message: `Прибор «${params.deviceBarcodeOrId}» не найден.` };
    }

    if (device.status !== 'issued') {
      return {
        success: false,
        message: `Предупреждение: Прибор «${device.name}» (${device.inventoryNumber}) числится со статусом «${device.status}» (не выдан).`
      };
    }

    let actualEmployee: Employee | undefined;
    if (params.actualReturnerBadgeOrId) {
      actualEmployee = this.getEmployeeById(params.actualReturnerBadgeOrId) || this.getEmployeeByBadge(params.actualReturnerBadgeOrId);
    }
    const previousHolderName = device.currentHolderName;

    // Update Device state
    device.status = 'in_stock';
    device.currentHolderId = undefined;
    device.currentHolderName = undefined;
    device.issuedAt = undefined;
    device.expectedReturnDate = undefined;
    if (params.newLocation) {
      device.location = params.newLocation;
    }
    device.updatedAt = new Date().toISOString();

    // Movement entry
    const returnerName = actualEmployee ? actualEmployee.fullName : previousHolderName || 'Сотрудник';
    const noteText = [
      params.notes,
      actualEmployee && actualEmployee.fullName !== previousHolderName 
        ? `Возврат произвел: ${actualEmployee.fullName} (брал: ${previousHolderName})` 
        : null
    ].filter(Boolean).join('; ');

    const movement = this.addMovement({
      deviceId: device.id,
      deviceName: `${device.name} ${device.model}`,
      deviceBarcode: device.barcode,
      employeeId: actualEmployee ? actualEmployee.id : undefined,
      employeeName: returnerName,
      action: 'returned',
      operator: params.operatorName || 'Оператор',
      actualReturn: new Date().toISOString().split('T')[0],
      notes: noteText || 'Возврат на склад'
    });

    this.save();
    return {
      success: true,
      message: `Прибор «${device.name} ${device.model}» успешно возвращён на склад.`,
      movement,
      device
    };
  }

  // --- Inventory Sessions ---
  public getInventorySessions(): InventorySession[] {
    return [...this.data.inventorySessions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getInventorySessionById(id: string): { session: InventorySession; items: InventoryItem[] } | undefined {
    const session = this.data.inventorySessions.find(s => s.id === id);
    if (!session) return undefined;
    const items = this.data.inventoryItems.filter(i => i.sessionId === id);
    return { session, items };
  }

  public createInventorySession(params: { title: string; operator: string; notes?: string }): InventorySession {
    const newSession: InventorySession = {
      id: `inv-${Date.now()}`,
      title: params.title || `Инвентаризация от ${new Date().toLocaleDateString('ru-RU')}`,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      operator: params.operator,
      notes: params.notes,
      totalExpected: this.data.devices.length,
      totalScanned: 0,
      totalMatch: 0,
      totalMissing: this.data.devices.length,
      totalExtra: 0
    };
    this.data.inventorySessions.unshift(newSession);

    // Pre-populate missing items for all existing devices
    this.data.devices.forEach(dev => {
      this.data.inventoryItems.push({
        id: `inv-item-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        sessionId: newSession.id,
        deviceId: dev.id,
        barcode: dev.barcode,
        deviceName: dev.name,
        model: dev.model,
        status: 'missing', // initially all expected items are missing until scanned
        notes: `Ожидаемое место: ${dev.location}`
      });
    });

    this.save();
    return newSession;
  }

  public scanInventoryItem(sessionId: string, barcode: string, operator: string): {
    item: InventoryItem;
    status: 'match' | 'extra';
    message: string;
  } {
    const session = this.data.inventorySessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Сессия инвентаризации не найдена');

    const clean = barcode.trim();
    const existingItemIndex = this.data.inventoryItems.findIndex(i => 
      i.sessionId === sessionId && (
        i.barcode.toLowerCase() === clean.toLowerCase() ||
        i.barcode.replace(/^DEV:/i, '').toLowerCase() === clean.replace(/^DEV:/i, '').toLowerCase()
      )
    );

    let item: InventoryItem;
    let status: 'match' | 'extra';

    if (existingItemIndex !== -1) {
      // Expected device found
      status = 'match';
      this.data.inventoryItems[existingItemIndex].status = 'match';
      this.data.inventoryItems[existingItemIndex].scannedAt = new Date().toISOString();
      this.data.inventoryItems[existingItemIndex].operator = operator;
      item = this.data.inventoryItems[existingItemIndex];
    } else {
      // Extra / Unrecorded device!
      status = 'extra';
      const foundDev = this.getDeviceByBarcode(clean);
      item = {
        id: `inv-extra-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        sessionId,
        deviceId: foundDev?.id,
        barcode: clean,
        deviceName: foundDev ? foundDev.name : 'Неучтенный объект / Неизвестный код',
        model: foundDev ? foundDev.model : 'Н/Д',
        status: 'extra',
        scannedAt: new Date().toISOString(),
        operator,
        notes: 'Обнаружен при сканировании, не входил в список ожидаемых на этом складе'
      };
      this.data.inventoryItems.push(item);
    }

    // Recalculate session totals
    const sessionItems = this.data.inventoryItems.filter(i => i.sessionId === sessionId);
    session.totalScanned = sessionItems.filter(i => i.scannedAt).length;
    session.totalMatch = sessionItems.filter(i => i.status === 'match').length;
    session.totalMissing = sessionItems.filter(i => i.status === 'missing').length;
    session.totalExtra = sessionItems.filter(i => i.status === 'extra').length;

    this.save();
    return {
      item,
      status,
      message: status === 'match' 
        ? `Прибор «${item.deviceName}» подтверждён (на месте)` 
        : `Внимание: Код «${clean}» зафиксирован как лишний/неучтенный`
    };
  }

  public completeInventorySession(sessionId: string, operator: string): InventorySession {
    const session = this.data.inventorySessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Сессия не найдена');
    session.status = 'completed';
    session.closedAt = new Date().toISOString();
    this.save();
    return session;
  }

  // --- Terminals ---
  public getTerminals(): Terminal[] {
    const now = Date.now();
    const timeout = this.data.settings.heartbeatTimeoutSec * 1000;

    // Dynamically update status by heartbeat timestamp
    this.data.terminals.forEach(term => {
      const last = new Date(term.lastHeartbeat).getTime();
      term.status = (now - last) <= timeout ? 'online' : 'offline';
    });

    return this.data.terminals;
  }

  public recordTerminalHeartbeat(rssi: number, ip?: string): Terminal {
    const terminal = this.data.terminals[0];
    terminal.lastHeartbeat = new Date().toISOString();
    terminal.rssi = rssi;
    terminal.status = 'online';
    if (ip) terminal.ip = ip;
    this.saveDebounced(10000);
    return terminal;
  }

  public updateTerminal(id: string, updates: Partial<Terminal>): Terminal | undefined {
    const term = this.data.terminals.find(t => t.id === id);
    if (!term) return undefined;
    Object.assign(term, updates);
    this.save();
    return term;
  }

  // --- Scanners CRUD (1 to N Scanners) ---
  public getScanners(): ScannerDevice[] {
    if (!this.data.scanners) {
      this.data.scanners = [
        {
          id: 'scn-1',
          name: 'Основной беспроводной сканер №1',
          type: 'network_scanner',
          identifier: '192.168.137.100',
          location: 'Склад СИ / Зона выдачи',
          status: 'active',
          addedAt: '2025-01-10T08:00:00.000Z'
        }
      ];
    }
    return this.data.scanners;
  }

  public addScanner(scannerData: Omit<ScannerDevice, 'id' | 'addedAt'>): ScannerDevice {
    const scanners = this.getScanners();
    const newScanner: ScannerDevice = {
      ...scannerData,
      id: `scn-${Date.now()}`,
      addedAt: new Date().toISOString()
    };
    scanners.push(newScanner);
    this.save();
    return newScanner;
  }

  public updateScanner(id: string, updates: Partial<ScannerDevice>): ScannerDevice | undefined {
    const scanners = this.getScanners();
    const scn = scanners.find(s => s.id === id);
    if (!scn) return undefined;
    Object.assign(scn, updates);
    this.save();
    return scn;
  }

  public deleteScanner(id: string): boolean {
    const scanners = this.getScanners();
    const index = scanners.findIndex(s => s.id === id);
    if (index === -1) return false;
    scanners.splice(index, 1);
    this.save();
    return true;
  }

  // --- Settings ---
  public getSettings(): AppSettings {
    return { ...this.data.settings };
  }

  public updateSettings(updates: Partial<AppSettings>): AppSettings {
    this.data.settings = {
      ...this.data.settings,
      ...updates
    };
    this.save();
    return this.data.settings;
  }

  // --- Dashboard Summary ---
  public getDashboardSummary(): DashboardSummary {
    const now = new Date();
    const nowStr = now.toISOString().split('T')[0];
    const in30DaysStr = addDays(now, 30);
    const in60DaysStr = addDays(now, 60);
    const in90DaysStr = addDays(now, 90);

    const devices = this.data.devices;
    const counts = {
      total: devices.length,
      inStock: devices.filter(d => d.status === 'in_stock').length,
      issued: devices.filter(d => d.status === 'issued').length,
      inVerification: devices.filter(d => d.status === 'in_verification').length,
      inRepair: devices.filter(d => d.status === 'in_repair').length,
      decommissioned: devices.filter(d => d.status === 'decommissioned').length
    };

    const terminal = this.data.terminals[0];
    const lastHeartbeatTime = new Date(terminal.lastHeartbeat).getTime();
    const secondsSinceHeartbeat = Math.floor((Date.now() - lastHeartbeatTime) / 1000);
    const isOnline = secondsSinceHeartbeat <= this.data.settings.heartbeatTimeoutSec;

    // Verification alerts
    const alerts: DashboardSummary['verificationAlerts']['items'] = [];
    let expiredCount = 0;
    let in30DaysCount = 0;
    let in60DaysCount = 0;
    let in90DaysCount = 0;

    devices.forEach(d => {
      if (d.status === 'decommissioned') return;
      const targetDate = new Date(d.nextVerificationDate).getTime();
      const diffDays = Math.ceil((targetDate - now.getTime()) / (1000 * 60 * 60 * 24));

      if (d.nextVerificationDate < nowStr) {
        expiredCount++;
        alerts.push({ device: d, daysRemaining: diffDays, isExpired: true });
      } else if (d.nextVerificationDate <= in30DaysStr) {
        in30DaysCount++;
        alerts.push({ device: d, daysRemaining: diffDays, isExpired: false });
      } else if (d.nextVerificationDate <= in60DaysStr) {
        in60DaysCount++;
      } else if (d.nextVerificationDate <= in90DaysStr) {
        in90DaysCount++;
      }
    });

    // Overdue loans
    const overdueLoans: DashboardSummary['overdueLoans'] = [];
    devices.forEach(d => {
      if (d.status === 'issued' && d.expectedReturnDate && d.expectedReturnDate < nowStr) {
        const diffDays = Math.ceil((now.getTime() - new Date(d.expectedReturnDate).getTime()) / (1000 * 60 * 60 * 24));
        overdueLoans.push({
          device: d,
          employeeName: d.currentHolderName || 'Сотрудник',
          expectedReturnDate: d.expectedReturnDate,
          daysOverdue: diffDays
        });
      }
    });

    return {
      counts,
      terminal: {
        isOnline,
        lastHeartbeat: terminal.lastHeartbeat,
        rssi: terminal.rssi,
        secondsSinceHeartbeat
      },
      verificationAlerts: {
        expiredCount,
        in30DaysCount,
        in60DaysCount,
        in90DaysCount,
        items: alerts.sort((a, b) => a.daysRemaining - b.daysRemaining)
      },
      recentMovements: this.getMovements().slice(0, 10),
      overdueLoans
    };
  }
}

export const db = new Database();
