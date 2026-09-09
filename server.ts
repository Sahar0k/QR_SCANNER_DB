import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { terminalBridge } from './server/terminal-bridge.js';
import { runBusinessRulesTests } from './server/tests.js';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const metrologistPassword = process.env.METROLOGIST_PASSWORD || 'metrolog';
  const engineeringPassword = process.env.ENGINEERING_PASSWORD;
  const engineeringCombination = process.env.ENGINEERING_COMBINATION || 'CTRL_SHIFT_E';
  const metrologistToken = `metrologist-${Math.random().toString(36).slice(2)}`;
  const engineeringToken = `engineering-${Math.random().toString(36).slice(2)}`;
  const server = http.createServer(app);

  // Setup WebSocket server on path /ws
  const wss = new WebSocketServer({ server, path: '/ws' });
  terminalBridge.attachWebSocketServer(wss);

  wss.on('connection', async (ws) => {
    // Send initial handshake and terminal status
    const terminals = await db.getTerminals();
    ws.send(JSON.stringify({
      type: 'INIT',
      payload: {
        terminals,
        settings: await db.getSettings()
      }
    }));

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'SIMULATE_PACKET') {
          await terminalBridge.processPacket(data.raw, data.remoteIp || '127.0.0.1');
        }
      } catch (err) {
        console.error('WS message parse error:', err);
      }
    });
  });

  // Start UDP server for ESP32-S3 terminal
  terminalBridge.startUdpServer((await db.getSettings()).udpPort || 5005);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ==========================================
  // REST API ROUTES
  // ==========================================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'metrology-si-system',
      timestamp: new Date().toISOString()
    });
  });

  // Users & Auth
  app.get('/api/users', async (req, res) => {
    res.json(await db.getUsers());
  });

  // Dashboard summary
  app.get('/api/dashboard/summary', async (req, res) => {
    try {
      const summary = await db.getDashboardSummary();
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Code inspection / validation (for scanner Master wizard)
  app.post('/api/operations/validate-code', async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Код не передан' });

    const clean = String(code).trim();
    const employee = await db.getEmployeeByBadge(clean);
    const device = await db.getDeviceByBarcode(clean);

    if (employee) {
      return res.json({
        type: 'employee',
        data: employee,
        allowedToBorrow: employee.canBorrow,
        statusText: employee.canBorrow ? 'Право брать СИ подтверждено' : 'ВНИМАНИЕ: Право брать СИ отозвано!'
      });
    }

    if (device) {
      const nowStr = new Date().toISOString().split('T')[0];
      const isVerificationExpired = device.nextVerificationDate < nowStr;
      return res.json({
        type: 'device',
        data: device,
        isVerificationExpired,
        isAvailableForIssue: device.status === 'in_stock' && !isVerificationExpired,
        statusText: device.status === 'in_stock' 
          ? (isVerificationExpired ? 'Поверка просрочена!' : 'Готов к выдаче') 
          : `Статус: ${device.status}`
      });
    }

    return res.json({
      type: 'unknown',
      code: clean,
      message: 'Код не найден ни в реестре приборов, ни среди пропусков сотрудников'
    });
  });

  // Issue operation
  app.post('/api/operations/issue', async (req, res) => {
    const { deviceBarcodeOrId, employeeBadgeOrId, operatorName, expectedReturnDate, notes } = req.body;
    const result = await db.issueDevice({
      deviceBarcodeOrId,
      employeeBadgeOrId,
      operatorName,
      expectedReturnDate,
      notes
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Broadcast movement event over WS
    terminalBridge.broadcast({
      type: 'MOVEMENT_LOGGED',
      movement: result.movement,
      device: result.device
    });

    res.json(result);
  });

  // Return operation
  app.post('/api/operations/return', async (req, res) => {
    const { deviceBarcodeOrId, actualReturnerBadgeOrId, operatorName, notes, newLocation } = req.body;
    const result = await db.returnDevice({
      deviceBarcodeOrId,
      actualReturnerBadgeOrId,
      operatorName,
      notes,
      newLocation
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    terminalBridge.broadcast({
      type: 'MOVEMENT_LOGGED',
      movement: result.movement,
      device: result.device
    });

    res.json(result);
  });

  // Devices CRUD
  app.get('/api/devices', async (req, res) => {
    const { status, search, location } = req.query;
    let list = await db.getDevices();

    if (status && status !== 'all') {
      list = list.filter(d => d.status === status);
    }
    if (location) {
      list = list.filter(d => d.location.toLowerCase().includes(String(location).toLowerCase()));
    }
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(d => 
        d.name.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q) ||
        d.serialNumber.toLowerCase().includes(q) ||
        d.inventoryNumber.toLowerCase().includes(q) ||
        d.barcode.toLowerCase().includes(q) ||
        (d.currentHolderName && d.currentHolderName.toLowerCase().includes(q))
      );
    }

    res.json(list);
  });

  app.get('/api/devices/:id', async (req, res) => {
    const dev = await db.getDeviceById(req.params.id);
    if (!dev) return res.status(404).json({ error: 'Прибор не найден' });
    res.json(dev);
  });

  app.post('/api/devices', async (req, res) => {
    try {
      const newDev = await db.createDevice(req.body);
      res.status(201).json(newDev);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/devices/:id', async (req, res) => {
    const updated = await db.updateDevice(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Прибор не найден' });
    res.json(updated);
  });

  app.delete('/api/devices/:id', async (req, res) => {
    const success = await db.deleteDevice(req.params.id);
    if (!success) return res.status(404).json({ error: 'Прибор не найден' });
    res.json({ success: true });
  });

  // Export devices as CSV
  app.get('/api/devices/export/csv', async (req, res) => {
    const list = await db.getDevices();
    const headers = ['ID', 'Штрихкод', 'Наименование', 'Модель', 'Зав. №', 'Инв. №', 'Статус', 'Местоположение', 'Дата след. поверки', 'Текущий держатель', 'Примечания'];
    const rows = list.map(d => [
      d.id,
      `"${d.barcode}"`,
      `"${d.name.replace(/"/g, '""')}"`,
      `"${d.model.replace(/"/g, '""')}"`,
      `"${d.serialNumber}"`,
      `"${d.inventoryNumber}"`,
      d.status,
      `"${d.location.replace(/"/g, '""')}"`,
      d.nextVerificationDate,
      `"${(d.currentHolderName || '').replace(/"/g, '""')}"`,
      `"${(d.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="devices_registry.csv"');
    res.send(csvContent);
  });

  // Import devices from CSV/JSON
  app.post('/api/devices/import', async (req, res) => {
    try {
      const items: any[] = req.body.items;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Ожидается массив приборов' });
      }

      let imported = 0;
      for (const item of items) {
        if (item.name && item.barcode && item.inventoryNumber) {
          await db.createDevice({
            barcode: item.barcode,
            name: item.name,
            model: item.model || 'Н/Д',
            serialNumber: item.serialNumber || 'Б/Н',
            inventoryNumber: item.inventoryNumber,
            status: item.status || 'in_stock',
            location: item.location || 'Склад',
            nextVerificationDate: item.nextVerificationDate || new Date().toISOString().split('T')[0],
            specs: item.specs || '',
            notes: item.notes || 'Импортировано из файла'
          });
          imported++;
        }
      }

      res.json({ success: true, count: imported });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Employees CRUD
  app.get('/api/employees', async (req, res) => {
    res.json(await db.getEmployees());
  });

  app.get('/api/employees/:id', async (req, res) => {
    const emp = await db.getEmployeeById(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Сотрудник не найден' });
    res.json(emp);
  });

  app.post('/api/employees', async (req, res) => {
    try {
      const newEmp = await db.createEmployee(req.body);
      res.status(201).json(newEmp);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/employees/:id', async (req, res) => {
    const updated = await db.updateEmployee(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Сотрудник не найден' });
    res.json(updated);
  });

  app.delete('/api/employees/:id', async (req, res) => {
    const success = await db.deleteEmployee(req.params.id);
    if (!success) return res.status(404).json({ error: 'Сотрудник не найден' });
    res.json({ success: true });
  });

  // Departments API
  app.get('/api/departments', async (req, res) => {
    res.json(await db.getDepartments());
  });

  app.post('/api/departments', async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Название отдела обязательно' });
    const newDept = await db.addDepartment({ name: name.trim() });
    res.status(201).json(newDept);
  });

  app.put('/api/departments/:id', async (req, res) => {
    const { name } = req.body;
    const updated = await db.updateDepartment(req.params.id, { name });
    if (!updated) return res.status(404).json({ error: 'Отдел не найден' });
    res.json(updated);
  });

  app.delete('/api/departments/:id', async (req, res) => {
    const success = await db.deleteDepartment(req.params.id);
    if (!success) return res.status(404).json({ error: 'Отдел не найден' });
    res.json({ success: true });
  });

  // Scanners API
  app.get('/api/scanners', async (req, res) => {
    res.json(await db.getScanners());
  });

  app.post('/api/scanners', async (req, res) => {
    const { name, type, identifier, location, status } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Название сканера обязательно' });
    const newScanner = await db.addScanner({
      name: name.trim(),
      type: type || 'usb_keyboard',
      identifier: identifier || 'USB Scanner',
      location: location || 'Склад',
      status: status || 'active'
    });
    res.status(201).json(newScanner);
  });

  app.delete('/api/scanners/:id', async (req, res) => {
    const success = await db.deleteScanner(req.params.id);
    if (!success) return res.status(404).json({ error: 'Сканер не найден' });
    res.json({ success: true });
  });

  // Export employees as CSV
  app.get('/api/employees/export/csv', async (req, res) => {
    const list = await db.getEmployees();
    const headers = ['ID', 'Код пропуска', 'ФИО', 'Подразделение', 'Телефон', 'Приборов на руках'];
    const rows = list.map(e => [
      e.id,
      `"${e.badgeId || 'Нет метки'}"`,
      `"${e.fullName.replace(/"/g, '""')}"`,
      `"${e.department.replace(/"/g, '""')}"`,
      `"${e.phone}"`,
      e.activeBorrowedCount || 0
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="employees_registry.csv"');
    res.send(csvContent);
  });

  // Movements (APPEND-ONLY journal)
  app.get('/api/movements', async (req, res) => {
    const { deviceId, employeeId, action, startDate, endDate } = req.query;
    const list = await db.getMovements({
      deviceId: deviceId ? String(deviceId) : undefined,
      employeeId: employeeId ? String(employeeId) : undefined,
      action: action && action !== 'all' ? String(action) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined
    });
    res.json(list);
  });

  app.get('/api/movements/export/csv', async (req, res) => {
    const list = await db.getMovements();
    const headers = ['ID', 'Дата и время', 'Прибор', 'Штрихкод', 'Действие', 'Сотрудник', 'Оператор', 'Плановый возврат', 'Фактический возврат', 'Примечания'];
    const rows = list.map(m => [
      m.id,
      m.timestamp,
      `"${m.deviceName.replace(/"/g, '""')}"`,
      `"${m.deviceBarcode}"`,
      m.action,
      `"${(m.employeeName || '').replace(/"/g, '""')}"`,
      `"${m.operator}"`,
      m.expectedReturn || '',
      m.actualReturn || '',
      `"${(m.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="movements_journal.csv"');
    res.send(csvContent);
  });

  // Inventory sessions
  app.get('/api/inventory/sessions', async (req, res) => {
    res.json(await db.getInventorySessions());
  });

  app.post('/api/inventory/sessions', async (req, res) => {
    const { title, operator, notes } = req.body;
    const session = await db.createInventorySession({ title, operator, notes });
    res.status(201).json(session);
  });

  app.get('/api/inventory/sessions/:id', async (req, res) => {
    const data = await db.getInventorySessionById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Сессия не найдена' });
    res.json(data);
  });

  app.post('/api/inventory/sessions/:id/scan', async (req, res) => {
    try {
      const { barcode, operator } = req.body;
      const result = await db.scanInventoryItem(req.params.id, barcode, operator);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/inventory/sessions/:id/complete', async (req, res) => {
    try {
      const { operator } = req.body;
      const result = await db.completeInventorySession(req.params.id, operator);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Terminals & Hardware Simulation
  app.get('/api/terminals', async (req, res) => {
    res.json(await db.getTerminals());
  });

  app.get('/api/terminal/status', async (req, res) => {
    const terminals = await db.getTerminals();
    const primary = terminals[0];
    if (!primary) return res.status(404).json({ error: 'Терминал не найден' });
    res.json(primary);
  });

  app.post('/api/terminal/ping', async (req, res) => {
    const settings = await db.getSettings();
    const terminals = await db.getTerminals();
    const primary = terminals[0];

    const targetIp = req.body.scannerIp || settings.scannerIp || primary?.ip || '192.168.137.100';
    const pcIp = settings.pcIp || '192.168.137.1';
    const udpPort = settings.udpPort || 5005;

    const isOnline = primary ? primary.status === 'online' : false;
    const lastHb = primary ? primary.lastHeartbeat : null;
    const lastSeenSec = lastHb ? Math.round((Date.now() - new Date(lastHb).getTime()) / 1000) : 999;

    res.json({
      success: true,
      targetIp,
      pcIp,
      port: udpPort,
      wifiSsid: settings.wifiSsid || '1235',
      status: isOnline ? 'online' : 'offline',
      lastSeenSecondsAgo: lastSeenSec,
      diagnostics: [
        {
          id: 'firewall',
          title: 'Брандмауэр Windows (Windows Firewall)',
          status: 'warning',
          message: `Убедитесь, что сетевой порт ${udpPort} открыт во входящих правилах брандмауэра на сервере.`
        },
        {
          id: 'pc_ip',
          title: 'IP-адрес ПК / Сервера',
          status: 'info',
          message: `В настройках указан IP ПК: ${pcIp}. Проверьте в консоли Windows командой ipconfig, совпадает ли адрес сети.`
        },
        {
          id: 'wifi_creds',
          title: 'Параметры беспроводной сети',
          status: 'info',
          message: `SSID: "${settings.wifiSsid || '1235'}", Пароль: "${settings.wifiPassword || '63336333'}". Убедитесь, что точка доступа включена.`
        },
        {
          id: 'isolation',
          title: 'Изоляция клиентов Wi-Fi (AP Isolation)',
          status: 'info',
          message: 'В свойствах сети точки доступа не должна быть включена изоляция трафика клиентов.'
        }
      ]
    });
  });

  // Scanners API (1 to N Scanners)
  app.get('/api/scanners', async (req, res) => {
    res.json(await db.getScanners());
  });

  app.post('/api/scanners', async (req, res) => {
    const { name, type, identifier, location, status } = req.body;
    if (!name || !identifier) {
      return res.status(400).json({ error: 'Имя и идентификатор сканера обязательны' });
    }
    const created = await db.addScanner({
      name: String(name),
      type: type || 'network_scanner',
      identifier: String(identifier),
      location: location ? String(location) : 'Склад СИ',
      status: status || 'active'
    });
    res.status(201).json(created);
  });

  app.put('/api/scanners/:id', async (req, res) => {
    const updated = await db.updateScanner(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Сканер не найден' });
    res.json(updated);
  });

  app.delete('/api/scanners/:id', async (req, res) => {
    const ok = await db.deleteScanner(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Сканер не найден' });
    res.json({ success: true });
  });

  app.get('/api/terminal/logs', (req, res) => {
    res.json(terminalBridge.getPacketLogs());
  });

  app.post('/api/terminal/simulate', async (req, res) => {
    const { packet, remoteIp } = req.body;
    if (!packet) return res.status(400).json({ error: 'Пакет не передан' });

    const event = await terminalBridge.processPacket(String(packet), remoteIp || '127.0.0.1 (UI-Simulator)');
    res.json({
      success: true,
      processedEvent: event
    });
  });

  app.put('/api/terminals/:id', async (req, res) => {
    const updated = await db.updateTerminal(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Терминал не найден' });
    res.json(updated);
  });

  // Reports
  app.get('/api/reports/on-hand', async (req, res) => {
    const devices = (await db.getDevices()).filter(d => d.status === 'issued');
    const nowStr = new Date().toISOString().split('T')[0];
    const enriched = devices.map(d => ({
      ...d,
      isOverdue: d.expectedReturnDate ? d.expectedReturnDate < nowStr : false
    }));
    res.json(enriched);
  });

  app.get('/api/reports/verification-schedule', async (req, res) => {
    const devices = (await db.getDevices()).filter(d => d.status !== 'decommissioned');
    const now = new Date();
    const sorted = devices.map(d => {
      const target = new Date(d.nextVerificationDate).getTime();
      const days = Math.ceil((target - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        device: d,
        daysRemaining: days,
        isExpired: days < 0,
        urgency: days < 0 ? 'expired' : days <= 30 ? 'critical_30' : days <= 60 ? 'warning_60' : 'normal'
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);

    res.json(sorted);
  });

  // Auth API
  app.post('/api/auth/login', async (req, res) => {
    const { password } = req.body;
    const cleanPwd = String(password || '').trim();
    if (cleanPwd === metrologistPassword.trim()) {
      const user = (await db.getUsers()).find(u => u.role === 'metrologist') || {
        id: 'usr-2',
        username: 'metrologist',
        fullName: 'Кузнецова Елена Павловна (Метролог ОГМ)',
        role: 'metrologist' as const
      };
      return res.json({
        success: true,
        user,
        token: metrologistToken
      });
    }

    return res.status(401).json({ success: false, error: 'Неверный пароль метролога' });
  });

  app.post('/api/auth/engineering', (req, res) => {
    if (!engineeringPassword) {
      return res.status(503).json({ success: false, error: 'Инженерный доступ не настроен на сервере' });
    }
    const { combination, password } = req.body;
    if (combination !== engineeringCombination || password !== engineeringPassword) {
      return res.status(401).json({ success: false, error: 'Неверная инженерная комбинация или пароль' });
    }
    res.json({ success: true, token: engineeringToken });
  });

  const requireEngineeringAccess = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.header('x-engineering-token') !== engineeringToken) {
      return res.status(403).json({ error: 'Требуется инженерная авторизация' });
    }
    next();
  };

  // Settings & Backups
  app.get('/api/settings', requireEngineeringAccess, async (req, res) => {
    res.json(await db.getSettings());
  });

  const saveSettingsHandler = async (req: express.Request, res: express.Response) => {
    const updated = await db.updateSettings(req.body);
    res.json(updated);
  };
  app.put('/api/settings', requireEngineeringAccess, saveSettingsHandler);
  app.post('/api/settings', requireEngineeringAccess, saveSettingsHandler);

  const backupExportHandler = async (req: express.Request, res: express.Response) => {
    const data = await db.backupJson();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="metrology_backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.send(data);
  };
  app.get('/api/backup/export', requireEngineeringAccess, backupExportHandler);
  app.get('/api/database/backup', requireEngineeringAccess, backupExportHandler);

  const backupRestoreHandler = async (req: express.Request, res: express.Response) => {
    let jsonContent: string | null = null;
    if (typeof req.body === 'string') {
      jsonContent = req.body;
    } else if (req.body.backupJson) {
      jsonContent = typeof req.body.backupJson === 'string' ? req.body.backupJson : JSON.stringify(req.body.backupJson);
    } else if (req.body.devices && req.body.employees) {
      jsonContent = JSON.stringify(req.body);
    }

    if (!jsonContent) return res.status(400).json({ error: 'Данные бэкапа не переданы или имеют неверный формат' });
    const success = await db.restoreJson(jsonContent);
    if (!success) return res.status(400).json({ error: 'Неверная структура резервной копии' });
    res.json({ success: true, message: 'База данных успешно восстановлена' });
  };
  app.post('/api/backup/restore', requireEngineeringAccess, backupRestoreHandler);
  app.post('/api/database/restore', requireEngineeringAccess, backupRestoreHandler);

  const resetSeedHandler = async (req: express.Request, res: express.Response) => {
    await db.resetToSeed();
    res.json({ success: true, message: 'База данных сброшена к исходным эталонным данным' });
  };
  app.post('/api/backup/reset-seed', requireEngineeringAccess, resetSeedHandler);
  app.post('/api/database/reset', requireEngineeringAccess, resetSeedHandler);

  // Automated Tests Runner Endpoint
  app.get('/api/tests/run', async (req, res) => {
    const results = await runBusinessRulesTests();
    res.json(results);
  });

  // ==========================================
  // VITE / STATIC SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Metrology SI System listening on port ${PORT}`);
  });
}

startServer();
