import fs from 'fs';
import path from 'path';
import pg from 'pg';
import type { Pool, PoolClient } from 'pg';
import {
  Device, Employee, Department, Movement, InventorySession, InventoryItem,
  Terminal, AppSettings, User, DashboardSummary, ScannerDevice
} from '../src/types.js';
import { createInitialSeed } from './db.js';
import type { DatabaseSchema } from './db.js';

const { Pool: PgPool } = pg;
const schemaFile = path.resolve(process.cwd(), 'schema.sql');
const legacyFile = path.resolve(process.cwd(), 'data', 'metrology_db.json');
type Options = { pool?: Pool; connectionString?: string };

const date = (v: any) => v == null ? undefined : (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));
const iso = (v: any) => v == null ? undefined : new Date(v).toISOString();
const value = (v?: string) => v || null;
const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const normalizeSeed = (data: Partial<DatabaseSchema>): DatabaseSchema => {
  const defaults = createInitialSeed();
  return { ...defaults, ...data, departments: data.departments || defaults.departments, scanners: data.scanners || defaults.scanners };
};

function device(r: any): Device {
  return { id:r.id, barcode:r.barcode, name:r.name, model:r.model, serialNumber:r.serial_number,
    inventoryNumber:r.inventory_number, status:r.status, location:r.location, lastVerificationDate:date(r.last_verification_date),
    nextVerificationDate:date(r.next_verification_date)!, specs:r.specs || undefined, notes:r.notes || undefined,
    currentHolderId:r.current_holder_id || undefined, currentHolderName:r.current_holder_name || undefined,
    issuedAt:iso(r.issued_at), expectedReturnDate:date(r.expected_return_date), createdAt:iso(r.created_at)!, updatedAt:iso(r.updated_at)! };
}
function employee(r: any): Employee {
  return { id:r.id, badgeId:r.badge_id, fullName:r.full_name, department:r.department, phone:r.phone,
    email:r.email || undefined, canBorrow:Boolean(r.can_borrow), activeBorrowedCount:Number(r.active_borrowed_count || 0), createdAt:iso(r.created_at)! };
}
function movement(r: any): Movement {
  return { id:r.id, deviceId:r.device_id, deviceName:r.device_name, deviceBarcode:r.device_barcode,
    employeeId:r.employee_id || undefined, employeeName:r.employee_name || undefined, action:r.action,
    timestamp:iso(r.timestamp)!, operator:r.operator, expectedReturn:date(r.expected_return), actualReturn:date(r.actual_return), notes:r.notes || undefined };
}
function session(r: any): InventorySession {
  return { id:r.id, title:r.title, status:r.status, createdAt:iso(r.created_at)!, closedAt:iso(r.closed_at),
    operator:r.operator, notes:r.notes || undefined, totalExpected:r.total_expected, totalScanned:r.total_scanned,
    totalMatch:r.total_match, totalMissing:r.total_missing, totalExtra:r.total_extra };
}
function item(r: any): InventoryItem {
  return { id:r.id, sessionId:r.session_id, deviceId:r.device_id || undefined, barcode:r.barcode,
    deviceName:r.device_name, model:r.model, status:r.status, scannedAt:iso(r.scanned_at),
    operator:r.operator || undefined, notes:r.notes || undefined };
}
function terminal(r: any): Terminal {
  return { id:r.id, name:r.name, ip:r.ip, port:r.port, mac:r.mac, lastHeartbeat:iso(r.last_heartbeat) || '',
    rssi:r.rssi, status:r.status, devicePrefix:r.device_prefix, cardPrefix:r.card_prefix };
}
function scanner(r: any): ScannerDevice {
  return { id:r.id, name:r.name, type:r.type, identifier:r.identifier, location:r.location, status:r.status, addedAt:iso(r.added_at)! };
}

export class Database {
  private readonly pool: Pool;
  private readonly ready: Promise<void>;

  constructor(options: Options = {}) {
    if (options.pool) this.pool = options.pool;
    else {
      const url = options.connectionString || process.env.DATABASE_URL;
      if (!url) throw new Error('DATABASE_URL is required. Set it in the environment or inject a PostgreSQL Pool for tests.');
      this.pool = new PgPool({ connectionString:url, max:Number(process.env.DB_POOL_SIZE || 10), idleTimeoutMillis:30000 });
    }
    this.ready = this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.pool.query(await fs.promises.readFile(schemaFile, 'utf8'));
    const count = await this.pool.query<{ count:string }>('SELECT count(*)::text AS count FROM users');
    if (count.rows[0]?.count !== '0') return;
    let seed: DatabaseSchema = createInitialSeed();
    try {
      const parsed = JSON.parse(await fs.promises.readFile(legacyFile, 'utf8'));
      if (parsed.devices && parsed.employees && parsed.movements) seed = normalizeSeed(parsed);
    } catch { /* first installation */ }
    await this.seed(seed);
  }
  private async query(text:string, args:any[] = []) { await this.ready; return this.pool.query(text, args); }
  private async transaction<T>(fn:(c:PoolClient)=>Promise<T>):Promise<T> {
    await this.ready; const c = await this.pool.connect();
    try { await c.query('BEGIN'); const result = await fn(c); await c.query('COMMIT'); return result; }
    catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  }

  private async seed(data: DatabaseSchema, client?: PoolClient): Promise<void> {
    const q = (sql:string, args:any[]) => (client || this.pool).query(sql, args);
    for (const u of data.users || []) await q('INSERT INTO users(id,username,password_hash,full_name,role,avatar,created_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',[u.id,u.username,'',u.fullName,u.role,u.avatar||null,value((u as any).createdAt)||new Date().toISOString()]);
    for (const d of data.departments || []) await q('INSERT INTO departments(id,name,code,head_name,description,created_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[d.id,d.name,d.code||null,d.headName||null,d.description||null,value(d.createdAt)||new Date().toISOString()]);
    for (const e of data.employees || []) await q('INSERT INTO employees(id,badge_id,full_name,department,phone,email,can_borrow,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING',[e.id,e.badgeId,e.fullName,e.department,e.phone||'',e.email||null,e.canBorrow,value(e.createdAt)]);
    for (const d of data.devices || []) await q('INSERT INTO devices(id,barcode,name,model,serial_number,inventory_number,status,location,last_verification_date,next_verification_date,specs,notes,current_holder_id,issued_at,expected_return_date,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT DO NOTHING',[d.id,d.barcode,d.name,d.model,d.serialNumber,d.inventoryNumber,d.status,d.location,value(d.lastVerificationDate),value(d.nextVerificationDate),d.specs||null,d.notes||null,d.currentHolderId||null,value(d.issuedAt),value(d.expectedReturnDate),value(d.createdAt),value(d.updatedAt)]);
    for (const m of data.movements || []) await q('INSERT INTO movements(id,device_id,device_name,device_barcode,employee_id,employee_name,action,timestamp,operator,expected_return,actual_return,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING',[m.id,m.deviceId,m.deviceName,m.deviceBarcode,m.employeeId||null,m.employeeName||null,m.action,value(m.timestamp),m.operator,value(m.expectedReturn),value(m.actualReturn),m.notes||null]);
    for (const s of data.inventorySessions || []) await q('INSERT INTO inventory_sessions(id,title,status,created_at,closed_at,operator,notes,total_expected,total_scanned,total_match,total_missing,total_extra) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING',[s.id,s.title,s.status,value(s.createdAt),value(s.closedAt),s.operator,s.notes||null,s.totalExpected,s.totalScanned,s.totalMatch,s.totalMissing,s.totalExtra]);
    for (const i of data.inventoryItems || []) await q('INSERT INTO inventory_items(id,session_id,device_id,barcode,device_name,model,status,scanned_at,operator,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING',[i.id,i.sessionId,i.deviceId||null,i.barcode,i.deviceName,i.model,i.status,value(i.scannedAt),i.operator||null,i.notes||null]);
    for (const t of data.terminals || []) await q('INSERT INTO terminals(id,name,ip,port,mac,last_heartbeat,rssi,status,device_prefix,card_prefix) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING',[t.id,t.name,t.ip,t.port,t.mac,value(t.lastHeartbeat),t.rssi,t.status,t.devicePrefix,t.cardPrefix]);
    for (const s of data.scanners || []) await q('INSERT INTO scanners(id,name,type,identifier,location,status,added_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',[s.id,s.name,s.type,s.identifier,s.location,s.status,value(s.addedAt)]);
    for (const [k,v] of Object.entries(data.settings || {})) await q('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',[k,JSON.stringify(v)]);
  }

  public async save():Promise<void>{await this.ready;}
  public async saveDebounced(_delay=10000):Promise<void>{await this.ready;}
  public async resetToSeed():Promise<DatabaseSchema>{await this.transaction(async c=>{await c.query('TRUNCATE users,departments,employees,devices,movements,inventory_sessions,inventory_items,terminals,scanners,settings CASCADE');await this.seed(createInitialSeed(),c);return undefined;});return createInitialSeed();}

  private userRow(r:any):User{return{id:r.id,username:r.username,fullName:r.full_name,role:r.role,avatar:r.avatar||undefined};}
  public async getUsers():Promise<User[]>{const {rows}=await this.query('SELECT id,username,full_name,role,avatar FROM users ORDER BY id');return rows.map(r=>this.userRow(r));}
  public async getUserById(id:string):Promise<User|undefined>{const {rows}=await this.query('SELECT id,username,full_name,role,avatar FROM users WHERE id=$1',[id]);return rows[0]?this.userRow(rows[0]):undefined;}

  public async getDevices():Promise<Device[]>{const {rows}=await this.query('SELECT d.*,e.full_name AS current_holder_name FROM devices d LEFT JOIN employees e ON e.id=d.current_holder_id ORDER BY d.id');return rows.map(device);}
  public async getDeviceById(id:string):Promise<Device|undefined>{const {rows}=await this.query('SELECT d.*,e.full_name AS current_holder_name FROM devices d LEFT JOIN employees e ON e.id=d.current_holder_id WHERE d.id=$1',[id]);return rows[0]?device(rows[0]):undefined;}
  public async getDeviceByBarcode(code:string):Promise<Device|undefined>{const {rows}=await this.query("SELECT d.*,e.full_name AS current_holder_name FROM devices d LEFT JOIN employees e ON e.id=d.current_holder_id WHERE lower(d.barcode)=lower($1) OR lower(regexp_replace(d.barcode,'^DEV:','','i'))=lower(regexp_replace($1,'^DEV:','','i')) OR lower(d.serial_number)=lower($1) OR lower(d.inventory_number)=lower($1) LIMIT 1",[code.trim()]);return rows[0]?device(rows[0]):undefined;}
  public async createDevice(d:Omit<Device,'id'|'createdAt'|'updatedAt'>):Promise<Device>{const now=new Date().toISOString();const {rows}=await this.query('INSERT INTO devices(id,barcode,name,model,serial_number,inventory_number,status,location,last_verification_date,next_verification_date,specs,notes,current_holder_id,issued_at,expected_return_date,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *',[newId('dev'),d.barcode,d.name,d.model,d.serialNumber,d.inventoryNumber,d.status,d.location,value(d.lastVerificationDate),value(d.nextVerificationDate),d.specs||null,d.notes||null,d.currentHolderId||null,value(d.issuedAt),value(d.expectedReturnDate),now,now]);return device(rows[0]);}
  public async updateDevice(id:string,u:Partial<Device>):Promise<Device|undefined>{const current=await this.getDeviceById(id);if(!current)return undefined;const d={...current,...u,updatedAt:new Date().toISOString()};const {rows}=await this.query('UPDATE devices SET barcode=$2,name=$3,model=$4,serial_number=$5,inventory_number=$6,status=$7,location=$8,last_verification_date=$9,next_verification_date=$10,specs=$11,notes=$12,current_holder_id=$13,issued_at=$14,expected_return_date=$15,updated_at=$16 WHERE id=$1 RETURNING *',[id,d.barcode,d.name,d.model,d.serialNumber,d.inventoryNumber,d.status,d.location,value(d.lastVerificationDate),value(d.nextVerificationDate),d.specs||null,d.notes||null,d.currentHolderId||null,value(d.issuedAt),value(d.expectedReturnDate),d.updatedAt]);return rows[0]?device(rows[0]):undefined;}
  public async deleteDevice(id:string):Promise<boolean>{const r=await this.query('DELETE FROM devices WHERE id=$1',[id]);return!!r.rowCount;}

  public async getEmployees():Promise<Employee[]>{const {rows}=await this.query('SELECT e.*,count(d.id)::int active_borrowed_count FROM employees e LEFT JOIN devices d ON d.current_holder_id=e.id GROUP BY e.id ORDER BY e.id');return rows.map(employee);}
  public async getEmployeeById(id:string):Promise<Employee|undefined>{const {rows}=await this.query('SELECT e.*,count(d.id)::int active_borrowed_count FROM employees e LEFT JOIN devices d ON d.current_holder_id=e.id WHERE e.id=$1 GROUP BY e.id',[id]);return rows[0]?employee(rows[0]):undefined;}
  public async getEmployeeByBadge(code:string):Promise<Employee|undefined>{const {rows}=await this.query("SELECT e.*,count(d.id)::int active_borrowed_count FROM employees e LEFT JOIN devices d ON d.current_holder_id=e.id WHERE lower(e.badge_id)=lower($1) OR lower(regexp_replace(e.badge_id,'^CARD:','','i'))=lower(regexp_replace($1,'^CARD:','','i')) GROUP BY e.id LIMIT 1",[code.trim()]);return rows[0]?employee(rows[0]):undefined;}
  public async createEmployee(e:Omit<Employee,'id'|'createdAt'>):Promise<Employee>{const {rows}=await this.query('INSERT INTO employees(id,badge_id,full_name,department,phone,email,can_borrow,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[newId('emp'),e.badgeId,e.fullName,e.department,e.phone||'',e.email||null,e.canBorrow,new Date().toISOString()]);return employee(rows[0]);}
  public async updateEmployee(id:string,u:Partial<Employee>):Promise<Employee|undefined>{const old=await this.getEmployeeById(id);if(!old)return undefined;const e={...old,...u};await this.query('UPDATE employees SET badge_id=$2,full_name=$3,department=$4,phone=$5,email=$6,can_borrow=$7 WHERE id=$1',[id,e.badgeId,e.fullName,e.department,e.phone||'',e.email||null,e.canBorrow]);return this.getEmployeeById(id);}
  public async deleteEmployee(id:string):Promise<boolean>{const r=await this.query('DELETE FROM employees WHERE id=$1',[id]);return!!r.rowCount;}

  public async getDepartments():Promise<Department[]>{const {rows}=await this.query('SELECT d.*,count(e.id)::int employee_count FROM departments d LEFT JOIN employees e ON e.department=d.name GROUP BY d.id ORDER BY d.id');return rows.map(r=>({id:r.id,name:r.name,code:r.code||undefined,headName:r.head_name||undefined,description:r.description||undefined,createdAt:iso(r.created_at),employeeCount:r.employee_count}));}
  public async addDepartment(d:Omit<Department,'id'|'createdAt'>):Promise<Department>{const {rows}=await this.query('INSERT INTO departments(id,name,code,head_name,description) VALUES($1,$2,$3,$4,$5) RETURNING *',[newId('dept'),d.name,d.code||null,d.headName||null,d.description||null]);return{ id:rows[0].id,name:rows[0].name,code:rows[0].code||undefined,headName:rows[0].head_name||undefined,description:rows[0].description||undefined,createdAt:iso(rows[0].created_at)};}
  public async updateDepartment(id:string,u:Partial<Department>):Promise<Department|undefined>{return this.transaction(async c=>{const old=await c.query('SELECT name FROM departments WHERE id=$1 FOR UPDATE',[id]);if(!old.rows[0])return undefined;const {rows}=await c.query('UPDATE departments SET name=COALESCE($2,name),code=COALESCE($3,code),head_name=COALESCE($4,head_name),description=COALESCE($5,description) WHERE id=$1 RETURNING *',[id,u.name||null,u.code||null,u.headName||null,u.description||null]);if(u.name&&u.name!==old.rows[0].name)await c.query('UPDATE employees SET department=$1 WHERE department=$2',[u.name,old.rows[0].name]);const r=rows[0];return{id:r.id,name:r.name,code:r.code||undefined,headName:r.head_name||undefined,description:r.description||undefined,createdAt:iso(r.created_at)};});}
  public async deleteDepartment(id:string):Promise<boolean>{const r=await this.query('DELETE FROM departments WHERE id=$1',[id]);return!!r.rowCount;}

  public async getMovements(f?:{deviceId?:string;employeeId?:string;action?:string;startDate?:string;endDate?:string}):Promise<Movement[]>{const where:string[]=[];const args:any[]=[];const add=(key:string,v:any)=>{args.push(v);where.push(`${key}=$${args.length}`)};if(f?.deviceId)add('device_id',f.deviceId);if(f?.employeeId)add('employee_id',f.employeeId);if(f?.action)add('action',f.action);if(f?.startDate){args.push(f.startDate);where.push(`timestamp >= $${args.length}`)}if(f?.endDate){args.push(f.endDate);where.push(`timestamp <= $${args.length}`)}const {rows}=await this.query(`SELECT * FROM movements ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY timestamp DESC`,args);return rows.map(movement);}
  public async addMovement(m:Omit<Movement,'id'|'timestamp'>):Promise<Movement>{const {rows}=await this.query('INSERT INTO movements(id,device_id,device_name,device_barcode,employee_id,employee_name,action,operator,expected_return,actual_return,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',[newId('mov'),m.deviceId,m.deviceName,m.deviceBarcode,m.employeeId||null,m.employeeName||null,m.action,m.operator,value(m.expectedReturn),value(m.actualReturn),m.notes||null]);return movement(rows[0]);}

  public async issueDevice(p:{deviceBarcodeOrId:string;employeeBadgeOrId:string;operatorName:string;expectedReturnDate?:string;notes?:string}):Promise<{success:boolean;message:string;movement?:Movement;device?:Device}> {
    return this.transaction(async c=>{
      const dr=await c.query('SELECT d.* FROM devices d WHERE d.id=$1 OR lower(d.barcode)=lower($1) OR lower(d.serial_number)=lower($1) OR lower(d.inventory_number)=lower($1) LIMIT 1 FOR UPDATE',[p.deviceBarcodeOrId]);
      if(!dr.rows[0])return{success:false,message:`Прибор с идентификатором или кодом «${p.deviceBarcodeOrId}» не найден в базе данных.`};
      const er=await c.query("SELECT e.*,count(d.id)::int active_borrowed_count FROM employees e LEFT JOIN devices d ON d.current_holder_id=e.id WHERE e.id=$1 OR lower(e.badge_id)=lower($1) OR lower(regexp_replace(e.badge_id,'^CARD:','','i'))=lower(regexp_replace($1,'^CARD:','','i')) GROUP BY e.id LIMIT 1 FOR UPDATE",[p.employeeBadgeOrId]);
      if(!er.rows[0])return{success:false,message:`Сотрудник с пропуском/ID «${p.employeeBadgeOrId}» не найден.`};
      const d=device(dr.rows[0]),e=employee(er.rows[0]);
      if (d.currentHolderId) {
        const holder = await c.query('SELECT full_name FROM employees WHERE id=$1', [d.currentHolderId]);
        d.currentHolderName = holder.rows[0]?.full_name;
      }
      if(!e.canBorrow)return{success:false,message:`Блокировка: У сотрудника «${e.fullName}» (${e.department}) отозвано право брать средства измерений.`};
      if(d.status!=='in_stock'){const labels:any={issued:`уже выдан сотруднику (${d.currentHolderName||'неизвестно'})`,in_verification:'находится на поверке/калибровке',in_repair:'находится в ремонте',decommissioned:'списан'};return{success:false,message:`Блокировка: Прибор «${d.name}» (${d.inventoryNumber}) не может быть выдан, так как он ${labels[d.status]||d.status}.`};}
      const st=await c.query("SELECT key,value FROM settings WHERE key IN ('blockExpiredVerification','defaultReturnDays')");
      const settings:any=Object.fromEntries(st.rows.map((r:any)=>[r.key,JSON.parse(r.value)]));
      if(settings.blockExpiredVerification!==false&&d.nextVerificationDate<new Date().toISOString().slice(0,10))return{success:false,message:`Блокировка: Поверка прибора «${d.name}» (${d.inventoryNumber}) истекла ${d.nextVerificationDate}! Эксплуатация и выдача запрещены метрологическим регламентом.`};
      const expected=p.expectedReturnDate||addDays(new Date(),Number(settings.defaultReturnDays||7)),now=new Date().toISOString();
      const ur=await c.query("UPDATE devices SET status='issued',current_holder_id=$2,issued_at=$3,expected_return_date=$4,updated_at=$3 WHERE id=$1 RETURNING *",[d.id,e.id,now,expected]);
      const mr=await c.query("INSERT INTO movements(id,device_id,device_name,device_barcode,employee_id,employee_name,action,operator,expected_return,notes) VALUES($1,$2,$3,$4,$5,$6,'issued',$7,$8,$9) RETURNING *",[newId('mov'),d.id,`${d.name} ${d.model}`,d.barcode,e.id,e.fullName,p.operatorName||'Оператор',expected,p.notes||'Выдача через терминал']);
      return{success:true,message:`Прибор «${d.name} ${d.model}» успешно выдан сотруднику ${e.fullName}. Срок возврата: до ${expected}.`,movement:movement(mr.rows[0]),device:device({...ur.rows[0],current_holder_name:e.fullName})};
    });
  }

  public async returnDevice(p:{deviceBarcodeOrId:string;actualReturnerBadgeOrId?:string;operatorName:string;notes?:string;newLocation?:string}):Promise<{success:boolean;message:string;movement?:Movement;device?:Device}> {
    return this.transaction(async c=>{
      const dr=await c.query('SELECT d.* FROM devices d WHERE d.id=$1 OR lower(d.barcode)=lower($1) OR lower(d.serial_number)=lower($1) OR lower(d.inventory_number)=lower($1) LIMIT 1 FOR UPDATE',[p.deviceBarcodeOrId]);
      if(!dr.rows[0])return{success:false,message:`Прибор «${p.deviceBarcodeOrId}» не найден.`};
      const d=device(dr.rows[0]);
      if (d.currentHolderId) {
        const holder = await c.query('SELECT full_name FROM employees WHERE id=$1', [d.currentHolderId]);
        d.currentHolderName = holder.rows[0]?.full_name;
      }
      if(d.status!=='issued')return{success:false,message:`Предупреждение: Прибор «${d.name}» (${d.inventoryNumber}) числится со статусом «${d.status}» (не выдан).`};
      let e:Employee|undefined;
      if(p.actualReturnerBadgeOrId){const er=await c.query("SELECT e.*,count(d2.id)::int active_borrowed_count FROM employees e LEFT JOIN devices d2 ON d2.current_holder_id=e.id WHERE e.id=$1 OR lower(e.badge_id)=lower($1) OR lower(regexp_replace(e.badge_id,'^CARD:','','i'))=lower(regexp_replace($1,'^CARD:','','i')) GROUP BY e.id LIMIT 1",[p.actualReturnerBadgeOrId]);if(er.rows[0])e=employee(er.rows[0]);}
      const name=e?.fullName||d.currentHolderName||'Сотрудник',note=[p.notes,e&&e.fullName!==d.currentHolderName?`Возврат произвел: ${e.fullName} (брал: ${d.currentHolderName})`:null].filter(Boolean).join('; ');
      const ur=await c.query("UPDATE devices SET status='in_stock',current_holder_id=NULL,issued_at=NULL,expected_return_date=NULL,location=COALESCE($2,location),updated_at=now() WHERE id=$1 RETURNING *",[d.id,p.newLocation||null]);
      const mr=await c.query("INSERT INTO movements(id,device_id,device_name,device_barcode,employee_id,employee_name,action,operator,actual_return,notes) VALUES($1,$2,$3,$4,$5,$6,'returned',$7,current_date,$8) RETURNING *",[newId('mov'),d.id,`${d.name} ${d.model}`,d.barcode,e?.id||null,name,p.operatorName||'Оператор',note||'Возврат на склад']);
      return{success:true,message:`Прибор «${d.name} ${d.model}» успешно возвращён на склад.`,movement:movement(mr.rows[0]),device:device(ur.rows[0])};
    });
  }

  public async getInventorySessions():Promise<InventorySession[]>{const {rows}=await this.query('SELECT * FROM inventory_sessions ORDER BY created_at DESC');return rows.map(session);}
  public async getInventorySessionById(id:string):Promise<{session:InventorySession;items:InventoryItem[]}|undefined>{const [s,i]=await Promise.all([this.query('SELECT * FROM inventory_sessions WHERE id=$1',[id]),this.query('SELECT * FROM inventory_items WHERE session_id=$1 ORDER BY id',[id])]);return s.rows[0]?{session:session(s.rows[0]),items:i.rows.map(item)}:undefined;}
  public async createInventorySession(p:{title:string;operator:string;notes?:string}):Promise<InventorySession>{return this.transaction(async c=>{const ds=await c.query('SELECT * FROM devices');const idv=newId('inv');const sr=await c.query("INSERT INTO inventory_sessions(id,title,status,operator,notes,total_expected,total_missing) VALUES($1,$2,'in_progress',$3,$4,$5,$5) RETURNING *",[idv,p.title||`Инвентаризация от ${new Date().toLocaleDateString('ru-RU')}`,p.operator,p.notes||null,ds.rows.length]);for(const d of ds.rows)await c.query("INSERT INTO inventory_items(id,session_id,device_id,barcode,device_name,model,status,notes) VALUES($1,$2,$3,$4,$5,$6,'missing',$7)",[newId('inv-item'),idv,d.id,d.barcode,d.name,d.model,`Ожидаемое место: ${d.location}`]);return session(sr.rows[0]);});}
  public async scanInventoryItem(sid:string,code:string,operator:string):Promise<{item:InventoryItem;status:'match'|'extra';message:string}>{return this.transaction(async c=>{await c.query('SELECT id FROM inventory_sessions WHERE id=$1 FOR UPDATE',[sid]);const clean=code.trim();const ir=await c.query("SELECT * FROM inventory_items WHERE session_id=$1 AND (lower(barcode)=lower($2) OR lower(regexp_replace(barcode,'^DEV:','','i'))=lower(regexp_replace($2,'^DEV:','','i'))) LIMIT 1 FOR UPDATE",[sid,clean]);let result:InventoryItem,status:'match'|'extra';if(ir.rows[0]){status='match';const r=await c.query("UPDATE inventory_items SET status='match',scanned_at=now(),operator=$2 WHERE id=$1 RETURNING *",[ir.rows[0].id,operator]);result=item(r.rows[0]);}else{status='extra';const d=await c.query("SELECT * FROM devices WHERE lower(barcode)=lower($1) OR lower(regexp_replace(barcode,'^DEV:','','i'))=lower(regexp_replace($1,'^DEV:','','i')) LIMIT 1",[clean]);const x=d.rows[0];const r=await c.query("INSERT INTO inventory_items(id,session_id,device_id,barcode,device_name,model,status,scanned_at,operator,notes) VALUES($1,$2,$3,$4,$5,$6,'extra',now(),$7,$8) RETURNING *",[newId('inv-extra'),sid,x?.id||null,clean,x?.name||'Неучтенный объект / Неизвестный код',x?.model||'Н/Д',operator,'Обнаружен при сканировании, не входил в список ожидаемых на этом складе']);result=item(r.rows[0]);}await c.query("UPDATE inventory_sessions s SET total_scanned=x.scanned,total_match=x.matches,total_missing=x.missing,total_extra=x.extra FROM (SELECT session_id,count(*) FILTER(WHERE scanned_at IS NOT NULL)::int scanned,count(*) FILTER(WHERE status='match')::int matches,count(*) FILTER(WHERE status='missing')::int missing,count(*) FILTER(WHERE status='extra')::int extra FROM inventory_items WHERE session_id=$1 GROUP BY session_id)x WHERE s.id=$1",[sid]);return{item:result,status,message:status==='match'?`Прибор «${result.deviceName}» подтверждён (на месте)`:`Внимание: Код «${clean}» зафиксирован как лишний/неучтенный`};});}
  public async completeInventorySession(id:string,_operator:string):Promise<InventorySession>{const {rows}=await this.query("UPDATE inventory_sessions SET status='completed',closed_at=now() WHERE id=$1 RETURNING *",[id]);if(!rows[0])throw new Error('Сессия не найдена');return session(rows[0]);}

  public async getTerminals():Promise<Terminal[]>{await this.query("UPDATE terminals SET status=CASE WHEN last_heartbeat IS NOT NULL AND now()-last_heartbeat <= make_interval(secs => COALESCE((SELECT (value::jsonb #>> '{}')::int FROM settings WHERE key='heartbeatTimeoutSec'),6)) THEN 'online' ELSE 'offline' END");const {rows}=await this.query('SELECT * FROM terminals ORDER BY id');return rows.map(terminal);}
  public async recordTerminalHeartbeat(rssi:number,ip?:string):Promise<Terminal>{const {rows}=await this.query("UPDATE terminals SET last_heartbeat=now(),rssi=$1,status='online',ip=COALESCE($2,ip),updated_at=now() WHERE id=(SELECT id FROM terminals ORDER BY id LIMIT 1) RETURNING *",[rssi,ip||null]);return terminal(rows[0]);}
  public async setTerminalLastHeartbeatForTests(timestamp:string):Promise<void>{await this.query('UPDATE terminals SET last_heartbeat=$1',[timestamp]);}
  public async updateTerminal(id:string,u:Partial<Terminal>):Promise<Terminal|undefined>{const {rows}=await this.query('UPDATE terminals SET name=COALESCE($2,name),ip=COALESCE($3,ip),port=COALESCE($4,port),mac=COALESCE($5,mac),status=COALESCE($6,status),device_prefix=COALESCE($7,device_prefix),card_prefix=COALESCE($8,card_prefix),updated_at=now() WHERE id=$1 RETURNING *',[id,u.name||null,u.ip||null,u.port||null,u.mac||null,u.status||null,u.devicePrefix||null,u.cardPrefix||null]);return rows[0]?terminal(rows[0]):undefined;}
  public async getScanners():Promise<ScannerDevice[]>{const {rows}=await this.query('SELECT * FROM scanners ORDER BY id');return rows.map(scanner);}
  public async addScanner(s:Omit<ScannerDevice,'id'|'addedAt'>):Promise<ScannerDevice>{const {rows}=await this.query('INSERT INTO scanners(id,name,type,identifier,location,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[newId('scn'),s.name,s.type,s.identifier,s.location,s.status]);return scanner(rows[0]);}
  public async updateScanner(id:string,u:Partial<ScannerDevice>):Promise<ScannerDevice|undefined>{const {rows}=await this.query('UPDATE scanners SET name=COALESCE($2,name),type=COALESCE($3,type),identifier=COALESCE($4,identifier),location=COALESCE($5,location),status=COALESCE($6,status) WHERE id=$1 RETURNING *',[id,u.name||null,u.type||null,u.identifier||null,u.location||null,u.status||null]);return rows[0]?scanner(rows[0]):undefined;}
  public async deleteScanner(id:string):Promise<boolean>{const r=await this.query('DELETE FROM scanners WHERE id=$1',[id]);return!!r.rowCount;}

  public async getSettings():Promise<AppSettings>{const {rows}=await this.query('SELECT key,value FROM settings');return Object.fromEntries(rows.map((r:any)=>{try{return[r.key,JSON.parse(r.value)]}catch{return[r.key,r.value]}})) as AppSettings;}
  public async updateSettings(u:Partial<AppSettings>):Promise<AppSettings>{await this.transaction(async c=>{for(const [k,v] of Object.entries(u))await c.query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',[k,JSON.stringify(v)]);});return this.getSettings();}

  public async backupJson():Promise<string>{
    const [u,d,e,dev,m,s,i,t,sc,st]=await Promise.all([
      this.query('SELECT * FROM users ORDER BY id'),this.query('SELECT * FROM departments ORDER BY id'),this.query('SELECT * FROM employees ORDER BY id'),
      this.query('SELECT d.*,e.full_name current_holder_name FROM devices d LEFT JOIN employees e ON e.id=d.current_holder_id ORDER BY d.id'),
      this.query('SELECT * FROM movements ORDER BY timestamp DESC'),this.query('SELECT * FROM inventory_sessions ORDER BY created_at DESC'),this.query('SELECT * FROM inventory_items ORDER BY id'),
      this.query('SELECT * FROM terminals ORDER BY id'),this.query('SELECT * FROM scanners ORDER BY id'),this.query('SELECT key,value FROM settings')
    ]);
    const parsed=(r:any)=>{try{return JSON.parse(r)}catch{return r}};
    const out:DatabaseSchema={users:u.rows.map((r:any)=>this.userRow(r)),departments:d.rows.map((r:any)=>({id:r.id,name:r.name,code:r.code||undefined,headName:r.head_name||undefined,description:r.description||undefined,createdAt:iso(r.created_at)})),
      employees:e.rows.map(employee),devices:dev.rows.map(device),movements:m.rows.map(movement),inventorySessions:s.rows.map(session),inventoryItems:i.rows.map(item),terminals:t.rows.map(terminal),scanners:sc.rows.map(scanner),settings:Object.fromEntries(st.rows.map((r:any)=>[r.key,parsed(r.value)])) as AppSettings};
    return JSON.stringify(out,null,2);
  }
  public async restoreJson(json:string):Promise<boolean>{try{const data=JSON.parse(json) as DatabaseSchema;if(!data.devices||!data.employees||!data.movements)return false;await this.transaction(async c=>{await c.query('TRUNCATE users,departments,employees,devices,movements,inventory_sessions,inventory_items,terminals,scanners,settings CASCADE');await this.seed(normalizeSeed(data),c);});return true;}catch(e){console.error('Failed to restore database from JSON:',e);return false;}}

  public async getDashboardSummary():Promise<DashboardSummary>{
    const [devices,terminals,settings,movements]=await Promise.all([this.getDevices(),this.getTerminals(),this.getSettings(),this.getMovements()]);
    const now=new Date(),today=now.toISOString().slice(0,10),d30=addDays(now,30),d60=addDays(now,60),d90=addDays(now,90);
    const counts={total:devices.length,inStock:devices.filter(d=>d.status==='in_stock').length,issued:devices.filter(d=>d.status==='issued').length,inVerification:devices.filter(d=>d.status==='in_verification').length,inRepair:devices.filter(d=>d.status==='in_repair').length,decommissioned:devices.filter(d=>d.status==='decommissioned').length};
    const items:any[]=[];let expiredCount=0,in30DaysCount=0,in60DaysCount=0,in90DaysCount=0;
    for(const d of devices){if(d.status==='decommissioned')continue;const days=Math.ceil((new Date(d.nextVerificationDate).getTime()-now.getTime())/86400000);if(d.nextVerificationDate<today){expiredCount++;items.push({device:d,daysRemaining:days,isExpired:true});}else if(d.nextVerificationDate<=d30){in30DaysCount++;items.push({device:d,daysRemaining:days,isExpired:false});}else if(d.nextVerificationDate<=d60)in60DaysCount++;else if(d.nextVerificationDate<=d90)in90DaysCount++;}
    const overdueLoans=devices.filter(d=>d.status==='issued'&&d.expectedReturnDate&&d.expectedReturnDate<today).map(d=>({device:d,employeeName:d.currentHolderName||'Сотрудник',expectedReturnDate:d.expectedReturnDate!,daysOverdue:Math.ceil((now.getTime()-new Date(d.expectedReturnDate!).getTime())/86400000)}));
    const t=terminals[0],last=t?.lastHeartbeat?new Date(t.lastHeartbeat).getTime():0,secondsSinceHeartbeat=last?Math.floor((Date.now()-last)/1000):999;
    return{counts,terminal:{isOnline:secondsSinceHeartbeat<=Number(settings.heartbeatTimeoutSec||6),lastHeartbeat:t?.lastHeartbeat,rssi:t?.rssi||0,secondsSinceHeartbeat},verificationAlerts:{expiredCount,in30DaysCount,in60DaysCount,in90DaysCount,items:items.sort((a,b)=>a.daysRemaining-b.daysRemaining)},recentMovements:movements.slice(0,10),overdueLoans};
  }
  public async close():Promise<void>{await this.pool.end();}
}

export const db = new Database();
