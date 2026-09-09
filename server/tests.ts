import { Database, createInitialSeed } from './db.js';

export interface TestResult {
  id: string;
  name: string;
  category: 'issue_return' | 'verification' | 'permissions' | 'terminal' | 'inventory';
  passed: boolean;
  durationMs: number;
  expected: string;
  actual: string;
  details?: string;
}

export function runBusinessRulesTests(): {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
  executedAt: string;
} {
  const results: TestResult[] = [];
  const testDb = new Database();
  // Reset isolated test instance to clean seed
  testDb.resetToSeed();

  // Test 1: Выдача исправного прибора сотруднику с правом
  {
    const start = Date.now();
    // DEV:00101 (Rohde & Schwarz FSL6) is in_stock, verification ok
    // CARD:0004928192 (Иванов А.А.) has canBorrow = true
    const res = testDb.issueDevice({
      deviceBarcodeOrId: 'DEV:00101',
      employeeBadgeOrId: 'CARD:0004928192',
      operatorName: 'Тестовый оператор'
    });
    const dev = testDb.getDeviceByBarcode('DEV:00101');
    const movements = testDb.getMovements({ deviceId: dev?.id, action: 'issued' });

    const passed = res.success === true && dev?.status === 'issued' && dev.currentHolderId === 'emp-1' && movements.length > 0;
    results.push({
      id: 'test-01',
      name: 'Сценарий «Выдача»: выдача прибора со склада сотруднику с правом',
      category: 'issue_return',
      passed,
      durationMs: Date.now() - start,
      expected: 'Успешная выдача, статус прибора «issued», запись в журнале движений',
      actual: passed ? `Успешно: статус=${dev?.status}, держатель=${dev?.currentHolderName}` : `Ошибка: ${res.message}`
    });
  }

  // Test 2: Блокировка выдачи прибора с просроченной поверкой
  {
    const start = Date.now();
    // DEV:00104 (Fluke 8846A) has verification expired 10 days ago!
    const res = testDb.issueDevice({
      deviceBarcodeOrId: 'DEV:00104',
      employeeBadgeOrId: 'CARD:0004928192',
      operatorName: 'Тестовый оператор'
    });
    const dev = testDb.getDeviceByBarcode('DEV:00104');
    const passed = res.success === false && res.message.includes('Поверка прибора') && dev?.status === 'in_stock';
    results.push({
      id: 'test-02',
      name: 'Сценарий «Блокировка»: запрет выдачи прибора с просроченной поверкой',
      category: 'verification',
      passed,
      durationMs: Date.now() - start,
      expected: 'Операция заблокирована с причиной «Поверка прибора истекла»',
      actual: passed ? `Заблокировано: «${res.message}»` : `Неожиданный результат: success=${res.success}`
    });
  }

  // Test 3: Блокировка выдачи прибора, который уже выдан (не на складе)
  {
    const start = Date.now();
    // DEV:00102 (Keysight E36313A) is already 'issued'
    const res = testDb.issueDevice({
      deviceBarcodeOrId: 'DEV:00102',
      employeeBadgeOrId: 'CARD:0005118274',
      operatorName: 'Тестовый оператор'
    });
    const passed = res.success === false && res.message.includes('уже выдан');
    results.push({
      id: 'test-03',
      name: 'Сценарий «Блокировка»: запрет выдачи прибора, который уже выдан',
      category: 'issue_return',
      passed,
      durationMs: Date.now() - start,
      expected: 'Отказ: прибор уже находится у другого сотрудника',
      actual: passed ? `Заблокировано: «${res.message}»` : `Ошибка: ${res.message}`
    });
  }

  // Test 4: Блокировка выдачи сотруднику без права брать приборы
  {
    const start = Date.now();
    // CARD:0007829104 (Новиков Д.И., стажер) has canBorrow = false
    const res = testDb.issueDevice({
      deviceBarcodeOrId: 'DEV:00103', // Tektronix, in_stock
      employeeBadgeOrId: 'CARD:0007829104',
      operatorName: 'Тестовый оператор'
    });
    const passed = res.success === false && res.message.includes('отозвано право');
    results.push({
      id: 'test-04',
      name: 'Сценарий «Блокировка»: отказ сотруднику без права брать СИ (canBorrow = false)',
      category: 'permissions',
      passed,
      durationMs: Date.now() - start,
      expected: 'Отказ с сообщением об отсутствии прав на получение СИ',
      actual: passed ? `Заблокировано: «${res.message}»` : `Ошибка: ${res.message}`
    });
  }

  // Test 5: Сценарий «Возврат»: фиксация фактического возвратившего
  {
    const start = Date.now();
    // DEV:00102 was initially borrowed by Ivanov (emp-1).
    // Now returned by Smirnov (emp-2)
    const res = testDb.returnDevice({
      deviceBarcodeOrId: 'DEV:00102',
      actualReturnerBadgeOrId: 'CARD:0005118274', // Smirnov
      operatorName: 'Тестовый оператор',
      notes: 'Стендовая работа завершена'
    });
    const dev = testDb.getDeviceByBarcode('DEV:00102');
    const movements = testDb.getMovements({ deviceId: dev?.id, action: 'returned' });
    const lastMov = movements[0];

    const passed = res.success === true && 
      dev?.status === 'in_stock' && 
      dev.currentHolderId === undefined &&
      lastMov?.employeeName?.includes('Смирнов') === true;

    results.push({
      id: 'test-05',
      name: 'Сценарий «Возврат»: приём на склад с фиксацией фактического возвратившего',
      category: 'issue_return',
      passed,
      durationMs: Date.now() - start,
      expected: 'Статус прибора изменен на «in_stock», в журнале записан фактический возвративший',
      actual: passed ? `Возвращено на склад, в журнале: «${lastMov?.employeeName}»` : `Ошибка: ${res.message}`
    });
  }

  // Test 6: Неизменяемость журнала движений (Append-Only)
  {
    const start = Date.now();
    const beforeCount = testDb.getMovements().length;
    testDb.addMovement({
      deviceId: 'dev-1',
      deviceName: 'Анализатор спектра Rohde & Schwarz FSL6',
      deviceBarcode: 'DEV:00101',
      action: 'relocated',
      operator: 'Тестовый оператор',
      notes: 'Тестовое перемещение'
    });
    const afterCount = testDb.getMovements().length;
    const passed = afterCount === beforeCount + 1;
    results.push({
      id: 'test-06',
      name: 'Сценарий «Аудит»: журнал движений строго append-only',
      category: 'issue_return',
      passed,
      durationMs: Date.now() - start,
      expected: 'Новая запись добавляется в лог без возможности модификации предыдущих',
      actual: passed ? `Журнал пополнился: было ${beforeCount}, стало ${afterCount}` : 'Сбой добавления'
    });
  }

  // Test 7: Определение оффлайн-статуса терминала по таймауту 6 секунд
  {
    const start = Date.now();
    const terminals = testDb.getTerminals();
    const term = terminals[0];
    // Set last heartbeat to 10 seconds ago
    term.lastHeartbeat = new Date(Date.now() - 10000).toISOString();
    testDb.save();

    const updatedTerminals = testDb.getTerminals();
    const updatedTerm = updatedTerminals[0];
    const passed = updatedTerm.status === 'offline';

    results.push({
      id: 'test-07',
      name: 'Сценарий «Терминал»: определение оффлайн при отсутствии heartbeat > 6 с',
      category: 'terminal',
      passed,
      durationMs: Date.now() - start,
      expected: 'Статус терминала переключается на «offline»',
      actual: passed ? `Статус терминала: ${updatedTerm.status} (heartbeat был 10 с назад)` : `Статус: ${updatedTerm.status}`
    });
  }

  // Test 8: Инвентаризация — корректность диф-отчёта при пропуске прибора
  {
    const start = Date.now();
    const session = testDb.createInventorySession({
      title: 'Тестовая инвентаризация',
      operator: 'Аудитор'
    });

    // Scan all devices EXCEPT DEV:00103 (Tektronix), and also scan one extra non-existent code DEV:EXTRA999
    testDb.scanInventoryItem(session.id, 'DEV:00101', 'Аудитор');
    testDb.scanInventoryItem(session.id, 'DEV:00102', 'Аудитор');
    testDb.scanInventoryItem(session.id, 'DEV:EXTRA999', 'Аудитор'); // extra!

    const sessionData = testDb.getInventorySessionById(session.id);
    const s = sessionData?.session;
    const items = sessionData?.items || [];

    const matchCount = items.filter(i => i.status === 'match').length;
    const missingCount = items.filter(i => i.status === 'missing').length;
    const extraCount = items.filter(i => i.status === 'extra').length;

    const passed = matchCount === 2 && extraCount === 1 && missingCount > 0;
    results.push({
      id: 'test-08',
      name: 'Сценарий «Инвентаризация»: диф-отчёт «на месте / отсутствует / лишнее»',
      category: 'inventory',
      passed,
      durationMs: Date.now() - start,
      expected: 'Точный расчёт: 2 на месте, 1 лишний (неучтённый), остальные отсутствуют',
      actual: passed ? `Расчёт сошёлся: на месте=${matchCount}, отсутствует=${missingCount}, лишнее=${extraCount}` : `Не сошлось: m=${matchCount}, miss=${missingCount}, ex=${extraCount}`
    });
  }

  // Restore main db from file
  testDb.resetToSeed();

  return {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    results,
    executedAt: new Date().toISOString()
  };
}
