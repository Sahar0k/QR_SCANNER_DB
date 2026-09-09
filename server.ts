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
  const server = http.createServer(app);

  // Setup WebSocket server on path /ws
  const wss = new WebSocketServer({ server, path: '/ws' });
  terminalBridge.attachWebSocketServer(wss);

  wss.on('connection', (ws) => {
    // Send initial handshake and terminal status
    const terminals = db.getTerminals();
    ws.send(JSON.stringify({
      type: 'INIT',
      payload: {
        terminals,
        settings: db.getSettings()
      }
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'SIMULATE_PACKET') {
          terminalBridge.processPacket(data.raw, data.remoteIp || '127.0.0.1');
        }
      } catch (err) {
        console.error('WS message parse error:', err);
      }
    });
  });

  // Start UDP server for ESP32-S3 terminal
  terminalBridge.startUdpServer(db.getSettings().udpPort || 5005);

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
  app.get('/api/users', (req, res) => {
    res.json(db.getUsers());
  });

  // Dashboard summary
  app.get('/api/dashboard/summary', (req, res) => {
    try {
      const summary = db.getDashboardSummary();
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Code inspection / validation (for scanner Master wizard)
  app.post('/api/operations/validate-code', (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Код не передан' });

    const clean = String(code).trim();
    const employee = db.getEmployeeByBadge(clean);
    const device = db.getDeviceByBarcode(clean);

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
  app.post('/api/operations/issue', (req, res) => {
    const { deviceBarcodeOrId, employeeBadgeOrId, operatorName, expectedReturnDate, notes } = req.body;
    const result = db.issueDevice({
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
  app.post('/api/operations/return', (req, res) => {
    const { deviceBarcodeOrId, actualReturnerBadgeOrId, operatorName, notes, newLocation } = req.body;
    const result = db.returnDevice({
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
  app.get('/api/devices', (req, res) => {
    const { status, search, location } = req.query;
    let list = db.getDevices();

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

  app.get('/api/devices/:id', (req, res) => {
    const dev = db.getDeviceById(req.params.id);
    if (!dev) return res.status(404).json({ error: 'Прибор не найден' });
    res.json(dev);
  });

  app.post('/api/devices', (req, res) => {
    try {
      const newDev = db.createDevice(req.body);
      res.status(201).json(newDev);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/devices/:id', (req, res) => {
    const updated = db.updateDevice(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Прибор не найден' });
    res.json(updated);
  });

  app.delete('/api/devices/:id', (req, res) => {
    const success = db.deleteDevice(req.params.id);
    if (!success) return res.status(404).json({ error: 'Прибор не найден' });
    res.json({ success: true });
  });

  // Export devices as CSV
  app.get('/api/devices/export/csv', (req, res) => {
    const list = db.getDevices();
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
  app.post('/api/devices/import', (req, res) => {
    try {
      const items: any[] = req.body.items;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Ожидается массив приборов' });
      }

      let imported = 0;
      items.forEach(item => {
        if (item.name && item.barcode && item.inventoryNumber) {
          db.createDevice({
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
      });

      res.json({ success: true, count: imported });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Employees CRUD
  app.get('/api/employees', (req, res) => {
    res.json(db.getEmployees());
  });

  app.get('/api/employees/:id', (req, res) => {
    const emp = db.getEmployeeById(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Сотрудник не найден' });
    res.json(emp);
  });

  app.post('/api/employees', (req, res) => {
    try {
      const newEmp = db.createEmployee(req.body);
      res.status(201).json(newEmp);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/employees/:id', (req, res) => {
    const updated = db.updateEmployee(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Сотрудник не найден' });
    res.json(updated);
  });

  app.delete('/api/employees/:id', (req, res) => {
    const success = db.deleteEmployee(req.params.id);
    if (!success) return res.status(404).json({ error: 'Сотрудник не найден' });
    res.json({ success: true });
  });

  // Departments API
  app.get('/api/departments', (req, res) => {
    res.json(db.getDepartments());
  });

  app.post('/api/departments', (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Название отдела обязательно' });
    const newDept = db.addDepartment({ name: name.trim() });
    res.status(201).json(newDept);
  });

  app.put('/api/departments/:id', (req, res) => {
    const { name } = req.body;
    const updated = db.updateDepartment(req.params.id, { name });
    if (!updated) return res.status(404).json({ error: 'Отдел не найден' });
    res.json(updated);
  });

  app.delete('/api/departments/:id', (req, res) => {
    const success = db.deleteDepartment(req.params.id);
    if (!success) return res.status(404).json({ error: 'Отдел не найден' });
    res.json({ success: true });
  });

  // Scanners API
  app.get('/api/scanners', (req, res) => {
    res.json(db.getScanners());
  });

  app.post('/api/scanners', (req, res) => {
    const { name, type, identifier, location, status } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Название сканера обязательно' });
    const newScanner = db.addScanner({
      name: name.trim(),
      type: type || 'usb_keyboard',
      identifier: identifier || 'USB Scanner',
      location: location || 'Склад',
      status: status || 'active'
    });
    res.status(201).json(newScanner);
  });

  app.delete('/api/scanners/:id', (req, res) => {
    const success = db.deleteScanner(req.params.id);
    if (!success) return res.status(404).json({ error: 'Сканер не найден' });
    res.json({ success: true });
  });

  // Export employees as CSV
  app.get('/api/employees/export/csv', (req, res) => {
    const list = db.getEmployees();
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
  app.get('/api/movements', (req, res) => {
    const { deviceId, employeeId, action, startDate, endDate } = req.query;
    const list = db.getMovements({
      deviceId: deviceId ? String(deviceId) : undefined,
      employeeId: employeeId ? String(employeeId) : undefined,
      action: action && action !== 'all' ? String(action) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined
    });
    res.json(list);
  });

  app.get('/api/movements/export/csv', (req, res) => {
    const list = db.getMovements();
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
  app.get('/api/inventory/sessions', (req, res) => {
    res.json(db.getInventorySessions());
  });

  app.post('/api/inventory/sessions', (req, res) => {
    const { title, operator, notes } = req.body;
    const session = db.createInventorySession({ title, operator, notes });
    res.status(201).json(session);
  });

  app.get('/api/inventory/sessions/:id', (req, res) => {
    const data = db.getInventorySessionById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Сессия не найдена' });
    res.json(data);
  });

  app.post('/api/inventory/sessions/:id/scan', (req, res) => {
    try {
      const { barcode, operator } = req.body;
      const result = db.scanInventoryItem(req.params.id, barcode, operator);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/inventory/sessions/:id/complete', (req, res) => {
    try {
      const { operator } = req.body;
      const result = db.completeInventorySession(req.params.id, operator);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Terminals & Hardware Simulation
  app.get('/api/terminals', (req, res) => {
    res.json(db.getTerminals());
  });

  app.get('/api/terminal/status', (req, res) => {
    const terminals = db.getTerminals();
    const primary = terminals[0];
    if (!primary) return res.status(404).json({ error: 'Терминал не найден' });
    res.json(primary);
  });

  app.post('/api/terminal/ping', (req, res) => {
    const settings = db.getSettings();
    const terminals = db.getTerminals();
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
  app.get('/api/scanners', (req, res) => {
    res.json(db.getScanners());
  });

  app.post('/api/scanners', (req, res) => {
    const { name, type, identifier, location, status } = req.body;
    if (!name || !identifier) {
      return res.status(400).json({ error: 'Имя и идентификатор сканера обязательны' });
    }
    const created = db.addScanner({
      name: String(name),
      type: type || 'network_scanner',
      identifier: String(identifier),
      location: location ? String(location) : 'Склад СИ',
      status: status || 'active'
    });
    res.status(201).json(created);
  });

  app.put('/api/scanners/:id', (req, res) => {
    const updated = db.updateScanner(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Сканер не найден' });
    res.json(updated);
  });

  app.delete('/api/scanners/:id', (req, res) => {
    const ok = db.deleteScanner(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Сканер не найден' });
    res.json({ success: true });
  });

  app.get('/api/terminal/logs', (req, res) => {
    res.json(terminalBridge.getPacketLogs());
  });

  app.post('/api/terminal/simulate', (req, res) => {
    const { packet, remoteIp } = req.body;
    if (!packet) return res.status(400).json({ error: 'Пакет не передан' });

    const event = terminalBridge.processPacket(String(packet), remoteIp || '127.0.0.1 (UI-Simulator)');
    res.json({
      success: true,
      processedEvent: event
    });
  });

  app.put('/api/terminals/:id', (req, res) => {
    const updated = db.updateTerminal(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Терминал не найден' });
    res.json(updated);
  });

  // Reports
  app.get('/api/reports/on-hand', (req, res) => {
    const devices = db.getDevices().filter(d => d.status === 'issued');
    const nowStr = new Date().toISOString().split('T')[0];
    const enriched = devices.map(d => ({
      ...d,
      isOverdue: d.expectedReturnDate ? d.expectedReturnDate < nowStr : false
    }));
    res.json(enriched);
  });

  app.get('/api/reports/verification-schedule', (req, res) => {
    const devices = db.getDevices().filter(d => d.status !== 'decommissioned');
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
  app.post('/api/auth/login', (req, res) => {
    const { password, role } = req.body;
    const cleanPwd = (password || '').trim().toLowerCase();
    const cleanRole = (role || '').trim().toLowerCase();

    // Check for admin login
    if (cleanRole === 'admin' || cleanPwd === 'admin') {
      const user = db.getUsers().find(u => u.role === 'admin') || {
        id: 'usr-4',
        username: 'admin',
        fullName: 'Администратор системы',
        role: 'admin' as const
      };
      return res.json({
        success: true,
        user,
        token: 'admin-session-token'
      });
    }

    // Check for metrologist login
    if (cleanRole === 'metrologist' || cleanPwd === 'metrolog' || cleanPwd === '1234' || cleanPwd === '') {
      const user = db.getUsers().find(u => u.role === 'metrologist') || {
        id: 'usr-2',
        username: 'metrologist',
        fullName: 'Кузнецова Елена Павловна (Метролог ОГМ)',
        role: 'metrologist' as const
      };
      return res.json({
        success: true,
        user,
        token: 'metrolog-session-token'
      });
    }

    return res.status(401).json({ success: false, error: 'Неверный пароль. Пароль метролога: metrolog, администратора: admin' });
  });

  // Settings & Backups
  app.get('/api/settings', (req, res) => {
    res.json(db.getSettings());
  });

  const saveSettingsHandler = (req: express.Request, res: express.Response) => {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  };
  app.put('/api/settings', saveSettingsHandler);
  app.post('/api/settings', saveSettingsHandler);

  const backupExportHandler = (req: express.Request, res: express.Response) => {
    const data = db.backupJson();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="metrology_backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.send(data);
  };
  app.get('/api/backup/export', backupExportHandler);
  app.get('/api/database/backup', backupExportHandler);

  const backupRestoreHandler = (req: express.Request, res: express.Response) => {
    let jsonContent: string | null = null;
    if (typeof req.body === 'string') {
      jsonContent = req.body;
    } else if (req.body.backupJson) {
      jsonContent = typeof req.body.backupJson === 'string' ? req.body.backupJson : JSON.stringify(req.body.backupJson);
    } else if (req.body.devices && req.body.employees) {
      jsonContent = JSON.stringify(req.body);
    }

    if (!jsonContent) return res.status(400).json({ error: 'Данные бэкапа не переданы или имеют неверный формат' });
    const success = db.restoreJson(jsonContent);
    if (!success) return res.status(400).json({ error: 'Неверная структура резервной копии' });
    res.json({ success: true, message: 'База данных успешно восстановлена' });
  };
  app.post('/api/backup/restore', backupRestoreHandler);
  app.post('/api/database/restore', backupRestoreHandler);

  const resetSeedHandler = (req: express.Request, res: express.Response) => {
    const fresh = db.resetToSeed();
    res.json({ success: true, message: 'База данных сброшена к исходным эталонным данным' });
  };
  app.post('/api/backup/reset-seed', resetSeedHandler);
  app.post('/api/database/reset', resetSeedHandler);

  // Automated Tests Runner Endpoint
  app.get('/api/tests/run', (req, res) => {
    const results = runBusinessRulesTests();
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
