import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { GoogleGenAI } from '@google/genai';
import { 
  db, 
  hashPassword, 
  verifyPassword, 
  generateAuthToken, 
  verifyAuthToken, 
  User, 
  Equipment, 
  KnowledgeBase, 
  ChatArchive,
  EDMSDocument,
  EDMSRevision,
  EDMSTransmittal,
  EDMSComment
} from './server/db.js';
import { 
  sendEmail, 
  testSmtpConnection, 
  buildProposalEmailHtml, 
  buildLetterEmailHtml, 
  buildEquipmentEmailHtml, 
  buildTransmittalEmailHtml,
  generateAiEmailDraft 
} from './server/mailer.js';

const PORT = 3000;

// Allowed file extensions whitelist for security
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg', '.txt']);
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

// In-memory rate limiter for brute-force protection on auth
interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lockedUntil: number;
}
const loginAttempts = new Map<string, LoginAttempt>();

function checkLoginRateLimit(identifier: string): { allowed: boolean; waitMinutes?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(identifier);
  
  if (!entry) return { allowed: true };
  
  // If locked out
  if (entry.lockedUntil > now) {
    const waitMinutes = Math.ceil((entry.lockedUntil - now) / 60000);
    return { allowed: false, waitMinutes };
  }
  
  // Reset window if older than 15 minutes
  if (now - entry.firstAttempt > 15 * 60 * 1000) {
    loginAttempts.delete(identifier);
    return { allowed: true };
  }
  
  return { allowed: true };
}

function recordFailedLogin(identifier: string) {
  const now = Date.now();
  const entry = loginAttempts.get(identifier) || { count: 0, firstAttempt: now, lockedUntil: 0 };
  entry.count += 1;
  
  // Lock out after 5 consecutive failed attempts for 15 minutes
  if (entry.count >= 5) {
    entry.lockedUntil = now + 15 * 60 * 1000; // 15 min lockout
  }
  
  loginAttempts.set(identifier, entry);
}

function recordSuccessfulLogin(identifier: string) {
  loginAttempts.delete(identifier);
}

// SSRF Guard: Validate custom LLM URL to prevent access to internal cloud metadata / loopback
function isSafeHttpUrl(urlString: string): boolean {
  if (!urlString) return true;
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    
    // Disallow loopback / local hosts
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return false;
    // Disallow Cloud Metadata & link-local
    if (host === '169.254.169.254' || host.includes('metadata.google.internal') || host === 'metadata') return false;
    // Disallow private RFC 1918 subnets
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) || /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(host)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Sanitize filename to prevent Path Traversal
function sanitizeFilename(originalName: string): string {
  const base = path.basename(originalName);
  const ext = path.extname(base).toLowerCase();
  const nameOnly = base.slice(0, base.length - ext.length);
  const cleanName = nameOnly.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 80);
  const cleanExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
  return `${cleanName}${cleanExt}`;
}

// Validate file extension against safe whitelist
function isAllowedFileExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

// Robust PDF text extraction helper
async function parsePdf(fileBytes: Buffer): Promise<{ text: string }> {
  try {
    const parser = new PDFParse({ data: fileBytes });
    const result = await parser.getText();
    return { text: result.text };
  } catch (err: any) {
    console.error('Error in parsePdf:', err);
    throw err;
  }
}

// DOCX parsing helper
async function parseDocx(fileBytes: Buffer): Promise<{ text: string }> {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBytes });
    return { text: result.value };
  } catch (err: any) {
    console.error('Error in parseDocx:', err);
    throw err;
  }
}

async function startServer() {
  const app = express();
  
  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  app.use(express.json({ limit: '35mb' }));

  // Shared folder for uploaded reference files
  const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploaded_files');
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // --- Auth & Security Middlewares ---
  
  // Verify authenticated token and attach active user
  const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      return res.status(401).json({ error: 'دسترسی غیرمجاز. لطفاً وارد سیستم شوید.' });
    }
    
    const user = verifyAuthToken(token);
    if (!user) {
      return res.status(401).json({ error: 'نشست کاربری نامعتبر یا منقضی شده است. لطفاً مجدداً وارد شوید.' });
    }
    
    (req as any).user = user;
    next();
  };

  // Require Administrator privileges
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user: User = (req as any).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'دسترسی غیرمجاز. این بخش تنها برای مدیر ارشد سیستم (Admin) مجاز است.' });
    }
    next();
  };

  // --- API Routes ---

  // 1. Auth Login (with brute-force rate limiting & constant-time password comparison)
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است.' });
    }

    const cleanUsername = username.trim();
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const rateKey = `${cleanUsername.toLowerCase()}_${clientIp}`;

    const rateCheck = checkLoginRateLimit(rateKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({ 
        error: `تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً ${rateCheck.waitMinutes} دقیقه دیگر مجدداً تلاش نمایید.` 
      });
    }

    const user = db.getUserByUsername(cleanUsername);
    if (!user) {
      recordFailedLogin(rateKey);
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
    }

    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      recordFailedLogin(rateKey);
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
    }

    // Success: reset failed attempts counter and issue signed session token
    recordSuccessfulLogin(rateKey);
    const token = generateAuthToken(user);
    const { passwordHash, ...safeUser } = user;
    
    db.addAuditLog('LOGIN', `ورود کاربر ${user.username} با نقش ${user.role}`, user.id, user.username, req.ip);

    res.json({
      ...safeUser,
      token
    });
  });

  // 2. Auth Change Password
  app.post('/api/auth/change-password', authenticateToken, (req, res) => {
    const currentUser: User = (req as any).user;
    const { userId, currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword || typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'لطفاً تمام فیلدها را به صورت صحیح وارد کنید.' });
    }

    // Non-admins can only change their own password
    const targetUserId = userId ? Number(userId) : currentUser.id;
    if (currentUser.role !== 'admin' && targetUserId !== currentUser.id) {
      return res.status(403).json({ error: 'شما مجاز به تغییر رمز عبور کاربر دیگر نیستید.' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'طول رمز عبور جدید باید حداقل ۴ کاراکتر باشد.' });
    }

    const user = db.getUserById(targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'کاربر مورد نظر یافت نشد.' });
    }

    // Verify current password
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return res.status(400).json({ error: 'رمز عبور فعلی وارد شده نادرست است.' });
    }

    const newHashed = hashPassword(newPassword);
    db.updateUser(user.id, { passwordHash: newHashed });
    res.json({ success: true, message: 'رمز عبور با موفقیت تغییر یافت.' });
  });

  // 3. User Management (Admin Only)
  app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
    const users = db.getUsers().map(({ passwordHash, ...u }) => u);
    res.json(users);
  });

  app.post('/api/users', authenticateToken, requireAdmin, (req, res) => {
    const { username, password, role, system_access, price_access } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'نام کاربری، رمز عبور و نقش کاربری الزامی است.' });
    }

    const cleanUsername = String(username).trim();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'نام کاربری باید حداقل ۳ کاراکتر باشد.' });
    }

    const existing = db.getUserByUsername(cleanUsername);
    if (existing) {
      return res.status(400).json({ error: 'این نام کاربری قبلاً ثبت شده است.' });
    }

    const newUser = db.addUser({
      username: cleanUsername,
      passwordHash: hashPassword(String(password)),
      role: role === 'admin' ? 'admin' : 'user',
      system_access: system_access === 'alarm' || system_access === 'fighting' ? system_access : 'both',
      price_access: price_access ? 1 : 0
    });

    const { passwordHash, ...safeUser } = newUser;
    res.json(safeUser);
  });

  app.put('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const { role, system_access, price_access } = req.body;
    const user = db.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }
    if (user.username === 'admin') {
      return res.status(400).json({ error: 'ویرایش دسترسی مدیر اصلی سیستم امکان‌پذیر نیست.' });
    }
    const updated = db.updateUser(id, {
      role: role === 'admin' ? 'admin' : 'user',
      system_access: system_access === 'alarm' || system_access === 'fighting' ? system_access : 'both',
      price_access: price_access ? 1 : 0
    });
    res.json(updated);
  });

  app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const user = db.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }
    if (user.username === 'admin') {
      return res.status(400).json({ error: 'حذف کاربر مدیر اصلی سیستم امکان‌پذیر نیست.' });
    }
    db.deleteUser(id);
    res.json({ success: true });
  });

  // 4. Equipment Management (Strict server-side enforcement of authenticated user permissions)
  app.get('/api/equipment', authenticateToken, (req, res) => {
    const user: User = (req as any).user;
    let items = db.getEquipment();
    
    // Server-enforced system type filtering
    if (user.role !== 'admin' && user.system_access !== 'both') {
      items = items.filter(e => e.system_type === user.system_access);
    } else if (req.query.system_access && req.query.system_access !== 'both') {
      // Optional client sub-filtering if within user permissions
      items = items.filter(e => e.system_type === req.query.system_access);
    }

    // Server-enforced price masking if user lacks price_access
    const hasPriceAccess = user.role === 'admin' || user.price_access === 1;
    if (!hasPriceAccess) {
      items = items.map(e => ({
        ...e,
        price: null,
        currency: 'محرمانه'
      }));
    }

    res.json(items);
  });

  app.post('/api/equipment', authenticateToken, (req, res) => {
    const user: User = (req as any).user;
    const { part_number, brand, equipment_type, price, currency, nfpa_reference, technical_specifications, system_type, drawing_ref } = req.body;
    
    if (!part_number || !brand || !equipment_type) {
      return res.status(400).json({ error: 'پارت‌نامبر، برند و نوع تجهیز الزامی است.' });
    }
    
    const cleanPart = String(part_number).trim();
    const duplicate = db.getEquipment().find(e => e.part_number.toLowerCase() === cleanPart.toLowerCase());
    if (duplicate) {
      return res.status(400).json({ error: 'پارت‌نامبر وارد شده تکراری است.' });
    }

    // Enforce price write permission
    const hasPriceAccess = user.role === 'admin' || user.price_access === 1;
    const pVal = hasPriceAccess ? (price ? Number(price) : null) : null;

    const shamsiDate = getShamsiNow();
    const newItem = db.addEquipment({
      part_number: cleanPart,
      brand: String(brand).trim(),
      equipment_type: String(equipment_type).trim(),
      price: pVal,
      currency: currency ? String(currency).trim() : 'USD',
      nfpa_reference: nfpa_reference ? String(nfpa_reference).trim() : '',
      technical_specifications: technical_specifications ? String(technical_specifications).trim() : '',
      source_file: 'manual_entry',
      system_type: system_type === 'fighting' ? 'fighting' : 'alarm',
      drawing_ref: drawing_ref ? String(drawing_ref).trim() : '',
      created_at: shamsiDate,
      created_by: user.username
    });
    res.json(newItem);
  });

  // Batch / Spreadsheet Sync
  app.post('/api/equipment/sync', authenticateToken, (req, res) => {
    const user: User = (req as any).user;
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'اطلاعات ارسالی نامعتبر است.' });
    }

    const hasPriceAccess = user.role === 'admin' || user.price_access === 1;
    const system_access = user.role === 'admin' ? (req.body.system_access || 'both') : user.system_access;

    const currentEquipment = db.getEquipment();
    const origIds = new Set(
      (system_access === 'both' ? currentEquipment : currentEquipment.filter(e => e.system_type === system_access))
        .map(e => e.id)
    );

    const newIds = new Set<number>();
    const shamsiDate = getShamsiNow();

    for (const row of items) {
      if (!row.part_number || !row.brand || !row.equipment_type) continue;
      
      const rowId = row.id ? Number(row.id) : null;
      const sys_t = system_access !== 'both' ? system_access : (row.system_type || 'alarm');
      const c_at = row.created_at || shamsiDate;
      const c_by = user.username;

      if (!rowId) {
        // Insert new
        const p_val = hasPriceAccess ? (row.price ? Number(row.price) : null) : null;
        const c_val = hasPriceAccess ? (row.currency || 'USD') : 'USD';
        db.addEquipment({
          part_number: String(row.part_number).trim(),
          brand: String(row.brand).trim(),
          equipment_type: String(row.equipment_type).trim(),
          price: p_val,
          currency: c_val,
          nfpa_reference: row.nfpa_reference || '',
          technical_specifications: row.technical_specifications || '',
          source_file: row.source_file || 'manual_sync',
          system_type: sys_t,
          drawing_ref: row.drawing_ref || '',
          created_at: c_at,
          created_by: c_by
        });
      } else {
        newIds.add(rowId);
        const existing = currentEquipment.find(e => e.id === rowId);
        if (existing) {
          const updates: any = {
            part_number: String(row.part_number).trim(),
            brand: String(row.brand).trim(),
            equipment_type: String(row.equipment_type).trim(),
            nfpa_reference: row.nfpa_reference || '',
            technical_specifications: row.technical_specifications || '',
            system_type: sys_t,
            drawing_ref: row.drawing_ref || '',
            created_at: c_at,
            created_by: c_by
          };
          
          if (hasPriceAccess) {
            updates.price = row.price ? Number(row.price) : null;
            updates.currency = row.currency || 'USD';
          }
          db.updateEquipment(rowId, updates);
        }
      }
    }

    // Delete removed ids within user scope
    for (const oldId of origIds) {
      if (!newIds.has(oldId)) {
        db.deleteEquipment(oldId);
      }
    }

    res.json({ success: true });
  });

  // 5. Global AI Settings (Admin Only + Masked Key)
  app.get('/api/ai/config', authenticateToken, requireAdmin, (req, res) => {
    res.json(db.getSafeAIConfig());
  });

  app.post('/api/ai/config', authenticateToken, requireAdmin, (req, res) => {
    const user: User = (req as any).user;
    const { api_key, base_url, model_name, provider, temperature, max_tokens, system_prompt_overrides } = req.body;
    
    // SSRF validation
    if (base_url && !isSafeHttpUrl(base_url)) {
      return res.status(400).json({ error: 'آدرس سرور هوش مصنوعی نامعتبر یا غیرمجاز است.' });
    }

    const updated = db.updateAIConfig({ 
      api_key: api_key ? String(api_key).trim() : undefined, 
      base_url: base_url ? String(base_url).trim() : undefined, 
      model_name: model_name ? String(model_name).trim() : undefined,
      provider: provider ? String(provider).trim() : undefined,
      temperature: typeof temperature === 'number' ? temperature : undefined,
      max_tokens: typeof max_tokens === 'number' ? max_tokens : undefined,
      system_prompt_overrides: system_prompt_overrides || undefined
    });

    db.addAuditLog('UPDATE_AI_CONFIG', `به‌روزرسانی تنظیمات هوش مصنوعی (مدل: ${model_name || 'پیش‌فرض'})`, user.id, user.username, req.ip);

    res.json(updated);
  });

  // --- Admin Console Management Endpoints (No Server SSH/Access Needed) ---

  // Admin System Health & Telemetry
  app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
    res.json(db.getSystemStats());
  });

  // Admin System Settings (Company info, default proposal parameters)
  app.get('/api/admin/settings', authenticateToken, (req, res) => {
    res.json(db.getSystemSettings());
  });

  app.post('/api/admin/settings', authenticateToken, requireAdmin, (req, res) => {
    const user: User = (req as any).user;
    const updated = db.updateSystemSettings(req.body);
    db.addAuditLog('UPDATE_SETTINGS', 'به‌روزرسانی اطلاعات شرکتی، مشخصات سربرگ و ضرایب پیش‌فرض مالی', user.id, user.username, req.ip);
    res.json(updated);
  });

  // Admin Knowledge Base CRUD (NFPA Standards & Technical Guidelines)
  app.get('/api/admin/knowledge-base', authenticateToken, requireAdmin, (req, res) => {
    res.json(db.getKnowledgeBase());
  });

  app.post('/api/admin/knowledge-base', authenticateToken, requireAdmin, (req, res) => {
    const user: User = (req as any).user;
    const { concept, details, system_type, keywords, source_file } = req.body;
    if (!concept || !details) {
      return res.status(400).json({ error: 'عنوان مفهوم و توضیحات الزامی است.' });
    }

    const created = db.addKnowledgeBase({
      concept: String(concept).trim(),
      details: String(details).trim(),
      system_type: system_type === 'fighting' || system_type === 'alarm' ? system_type : 'both',
      keywords: keywords ? String(keywords).trim() : '',
      source_file: source_file ? String(source_file).trim() : 'admin_console'
    });

    db.addAuditLog('ADD_KNOWLEDGE', `افزودن مفهوم جدید به پایگاه دانش: ${concept}`, user.id, user.username, req.ip);
    res.json(created);
  });

  app.put('/api/admin/knowledge-base/:id', authenticateToken, requireAdmin, (req, res) => {
    const user: User = (req as any).user;
    const id = Number(req.params.id);
    const updated = db.updateKnowledgeBase(id, req.body);
    if (!updated) return res.status(404).json({ error: 'مفهوم مورد نظر یافت نشد.' });

    db.addAuditLog('UPDATE_KNOWLEDGE', `ویرایش مفهوم پایگاه دانش: ${updated.concept}`, user.id, user.username, req.ip);
    res.json(updated);
  });

  app.delete('/api/admin/knowledge-base/:id', authenticateToken, requireAdmin, (req, res) => {
    const user: User = (req as any).user;
    const id = Number(req.params.id);
    const item = db.getKnowledgeBaseById(id);
    const success = db.deleteKnowledgeBase(id);
    if (!success) return res.status(404).json({ error: 'مفهوم مورد نظر یافت نشد.' });

    db.addAuditLog('DELETE_KNOWLEDGE', `حذف مفهوم از پایگاه دانش: ${item?.concept || id}`, user.id, user.username, req.ip);
    res.json({ success: true });
  });

  // Admin Audit Logs Timeline
  app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, (req, res) => {
    const limit = Number(req.query.limit) || 150;
    res.json(db.getAuditLogs(limit));
  });

  // Admin Full Database Backup Export (Download JSON snapshot)
  app.get('/api/admin/backup/export', authenticateToken, requireAdmin, (req, res) => {
    const user: User = (req as any).user;
    const backup = db.exportFullBackup();
    db.addAuditLog('BACKUP_EXPORT', 'تهیه و دانلود فایل نسخه پشتیبان کامل سیستم', user.id, user.username, req.ip);

    const filename = `isatis_backup_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backup, null, 2));
  });

  // Admin Full Database Backup Import / Restore
  app.post('/api/admin/backup/import', authenticateToken, requireAdmin, (req, res) => {
    const user: User = (req as any).user;
    const { backupData, mode } = req.body;
    
    if (!backupData) {
      return res.status(400).json({ error: 'اطلاعات فایل پشتیبان ارسال نشده است.' });
    }

    try {
      const result = db.importFullBackup(backupData, mode === 'overwrite' ? 'overwrite' : 'merge');
      db.addAuditLog(
        'BACKUP_RESTORE', 
        `بازیابی اطلاعات از فایل پشتیبان (حالت: ${mode === 'overwrite' ? 'جایگزینی کامل' : 'ادغام اقلام'})`, 
        user.id, 
        user.username, 
        req.ip
      );
      res.json(result);
    } catch (err: any) {
      console.error('Backup restore error:', err);
      res.status(400).json({ error: `خطا در بازیابی فایل پشتیبان: ${err.message}` });
    }
  });

  // Admin AI Model Test (Check latency and validity of current configuration)
  app.post('/api/admin/ai/test', authenticateToken, requireAdmin, async (req, res) => {
    const startTime = Date.now();
    try {
      const aiConfig = db.getAIConfig();
      const testPrompt = 'Respond with strictly: {"status": "ok", "message": "اتصال به موتور هوش مصنوعی با موفقیت برقرار است."}';
      
      const isGoogle = !aiConfig.base_url || aiConfig.base_url.includes('googleapis') || !aiConfig.base_url.includes('openrouter');
      let rawOutput = '';
      
      if (aiConfig.api_key && !isGoogle) {
        rawOutput = await queryCustomLLM(
          aiConfig.api_key,
          aiConfig.base_url,
          aiConfig.model_name,
          testPrompt,
          'Ping test'
        );
      } else {
        rawOutput = await queryServerGemini(
          testPrompt,
          'Ping test',
          undefined,
          undefined,
          aiConfig.model_name,
          aiConfig.api_key || undefined
        );
      }

      const latencyMs = Date.now() - startTime;
      res.json({
        success: true,
        latencyMs,
        model: aiConfig.model_name || 'gemini-3.5-flash',
        provider: aiConfig.provider || (isGoogle ? 'google_gemini' : 'custom_openrouter'),
        response: rawOutput
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      res.status(500).json({
        success: false,
        latencyMs,
        error: `خطا در برقراری ارتباط با هوش مصنوعی: ${err.message}`
      });
    }
  });

  // 6. Previous Chat Archives (Protected by user ID ownership)
  app.get('/api/chat-archives/:userId', authenticateToken, (req, res) => {
    const user: User = (req as any).user;
    const requestedUserId = Number(req.params.userId);
    
    // Only allow viewing own archives unless admin
    if (user.role !== 'admin' && user.id !== requestedUserId) {
      return res.status(403).json({ error: 'دسترسی به تاریخچه گفتگوی سایر کاربران مجاز نیست.' });
    }
    
    res.json(db.getChatArchives(requestedUserId));
  });

  app.delete('/api/chat-archives/:id', authenticateToken, (req, res) => {
    const user: User = (req as any).user;
    const id = Number(req.params.id);
    const archive = db.getChatArchiveById(id);
    
    if (!archive) {
      return res.status(404).json({ error: 'آرشیو مورد نظر یافت نشد.' });
    }
    
    // Ownership check
    if (user.role !== 'admin' && archive.user_id !== user.id) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز برای حذف آرشیو.' });
    }
    
    db.deleteChatArchive(id);
    res.json({ success: true });
  });

  // 6.7. Saved Proposals Database
  app.get('/api/proposals', authenticateToken, (req, res) => {
    res.json(db.getProposals());
  });

  app.get('/api/proposals/:id', authenticateToken, (req, res) => {
    const id = Number(req.params.id);
    const prop = db.getProposalById(id);
    if (!prop) return res.status(404).json({ error: 'پروپوزال یافت نشد.' });
    res.json(prop);
  });

  app.post('/api/proposals', authenticateToken, (req, res) => {
    const user: User = (req as any).user;
    const { projectCode, title, clientName, date, language, currency, deliveryTime, paymentTerms, validityDays, warranty, introText, showPrices, showPriceAnalysis, items } = req.body;
    
    if (!title || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'عنوان پروپوزال و اقلام الزامی هستند.' });
    }
    
    const saved = db.addProposal({
      projectCode: projectCode ? String(projectCode).trim() : 'IP-2026-F&G-01',
      title: String(title).trim(),
      clientName: clientName ? String(clientName).trim() : '',
      date: date || new Date().toISOString().slice(0, 10),
      language: language === 'en' ? 'en' : 'fa',
      currency: currency || 'EUR',
      deliveryTime: deliveryTime || '',
      paymentTerms: paymentTerms || '',
      validityDays: Number(validityDays) || 30,
      warranty: warranty || '',
      introText: introText || '',
      showPrices: showPrices ?? true,
      showPriceAnalysis: showPriceAnalysis ?? true,
      items: items || [],
      created_by: user.username
    });
    res.json(saved);
  });

  app.delete('/api/proposals/:id', authenticateToken, (req, res) => {
    const id = Number(req.params.id);
    const success = db.deleteProposal(id);
    if (!success) return res.status(404).json({ error: 'پروپوزال یافت نشد.' });
    res.json({ success: true });
  });

  // 6.8. Proposal Templates API
  app.get('/api/proposals/templates', authenticateToken, (req, res) => {
    res.json(db.getProposalTemplates());
  });

  app.get('/api/proposals/templates/:id', authenticateToken, (req, res) => {
    const id = Number(req.params.id);
    const template = db.getProposalTemplateById(id);
    if (!template) return res.status(404).json({ error: 'قالب مورد نظر یافت نشد.' });
    res.json(template);
  });

  app.post('/api/proposals/templates', authenticateToken, (req, res) => {
    const user: User = (req as any).user;
    const { 
      title, 
      description, 
      category, 
      is_default, 
      header_title, 
      header_subtitle, 
      intro_template, 
      technical_notes, 
      boq_columns, 
      show_price_analysis_table, 
      warranty_template, 
      payment_terms_template, 
      delivery_time_template, 
      validity_template, 
      closing_remarks, 
      signature_section, 
      raw_custom_template 
    } = req.body;

    if (!title || !header_title) {
      return res.status(400).json({ error: 'عنوان قالب و عنوان سربرگ الزامی است.' });
    }

    const created = db.addProposalTemplate({
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      category: category || 'custom',
      is_default: Boolean(is_default),
      header_title: String(header_title).trim(),
      header_subtitle: header_subtitle ? String(header_subtitle).trim() : '',
      intro_template: intro_template || '',
      technical_notes: technical_notes || '',
      boq_columns: Array.isArray(boq_columns) && boq_columns.length > 0 ? boq_columns : ['row', 'part_number', 'dwg_tag', 'brand', 'type', 'specs', 'qty', 'unit_price', 'total_price'],
      show_price_analysis_table: show_price_analysis_table ?? true,
      warranty_template: warranty_template || '',
      payment_terms_template: payment_terms_template || '',
      delivery_time_template: delivery_time_template || '',
      validity_template: validity_template || '',
      closing_remarks: closing_remarks || '',
      signature_section: signature_section || {
        prepared_by_title: 'کارشناس ارشد مهندسی فروش',
        approved_by_title: 'مدیریت مهندسی و بازرگانی',
        company_seal_text: 'شرکت مهندسی ایساتیس پارس تجهیز'
      },
      raw_custom_template: raw_custom_template || '',
      created_by: user.username
    });

    db.addAuditLog('ADD_PROPOSAL_TEMPLATE', `ایجاد قالب جدید پروپوزال: ${created.title}`, user.id, user.username, req.ip);
    res.json(created);
  });

  app.put('/api/proposals/templates/:id', authenticateToken, (req, res) => {
    const user: User = (req as any).user;
    const id = Number(req.params.id);
    const updated = db.updateProposalTemplate(id, req.body);
    if (!updated) return res.status(404).json({ error: 'قالب مورد نظر یافت نشد.' });

    db.addAuditLog('UPDATE_PROPOSAL_TEMPLATE', `ویرایش قالب پروپوزال: ${updated.title}`, user.id, user.username, req.ip);
    res.json(updated);
  });

  app.delete('/api/proposals/templates/:id', authenticateToken, (req, res) => {
    const user: User = (req as any).user;
    const id = Number(req.params.id);
    const item = db.getProposalTemplateById(id);
    const success = db.deleteProposalTemplate(id);
    if (!success) return res.status(404).json({ error: 'قالب مورد نظر یافت نشد.' });

    db.addAuditLog('DELETE_PROPOSAL_TEMPLATE', `حذف قالب پروپوزال: ${item?.title || id}`, user.id, user.username, req.ip);
    res.json({ success: true });
  });

  // AI Extract Proposal Template from Sample Text or Document
  app.post('/api/proposals/templates/extract-ai', authenticateToken, async (req, res) => {
    const { sampleText, fileBase64, mimeType, templateTitle } = req.body;

    if (!sampleText && !fileBase64) {
      return res.status(400).json({ error: 'متن نمونه یا فایل پروپوزال ارسال نشده است.' });
    }

    try {
      let documentText = sampleText || '';

      if (fileBase64 && mimeType === 'application/pdf') {
        const fileBytes = Buffer.from(fileBase64, 'base64');
        const parsed = await parsePdf(fileBytes);
        documentText += '\n' + parsed.text;
      } else if (fileBase64 && (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword')) {
        const fileBytes = Buffer.from(fileBase64, 'base64');
        const parsed = await parseDocx(fileBytes);
        documentText += '\n' + parsed.text;
      }

      if (!documentText.trim()) {
        return res.status(400).json({ error: 'متن قابل استخراجی از فایل دریافت نشد.' });
      }

      const systemPrompt = `You are an expert F&G (Fire & Gas) Systems Proposal Engineer and Document Template Architect.
Your task is to analyze the provided sample technical/commercial proposal document and convert it into a standardized, reusable proposal template with merge tags.

Standard Merge Tags you MUST insert in appropriate places:
- {{PROJECT_NAME}} -> Project title/name
- {{PROJECT_CODE}} -> Project reference code
- {{CLIENT_NAME}} -> Client or Buyer company name
- {{DATE}} -> Proposal issue date
- {{TECHNICAL_BOQ_TABLE}} -> The Bill of Quantities / Equipment Table placeholder
- {{COMMERCIAL_PRICING_TABLE}} -> The Grand Total Pricing Table
- {{MULTIPLIERS_ANALYSIS}} -> The Customs, Logistics, Overhead & Currency Factor Analysis Table
- {{TERMS_WARRANTY}} -> Warranty statement
- {{TERMS_PAYMENT}} -> Payment terms
- {{TERMS_DELIVERY}} -> Delivery schedule
- {{TERMS_VALIDITY}} -> Proposal validity period
- {{COMPANY_SIGNATURE}} -> The signature block

Extract and format the response STRICTLY as a JSON object with these exact keys:
{
  "title": "${templateTitle || 'قالب استخراج شده از سند'}",
  "description": "قالب استخراج شده توسط هوش مصنوعی بر اساس فرمت سازمانی ارائه شده",
  "category": "custom",
  "header_title": "Company header title in Persian",
  "header_subtitle": "Proposal subtitle in Persian",
  "intro_template": "Introduction/executive summary in Persian containing {{PROJECT_NAME}}, {{CLIENT_NAME}}, {{PROJECT_CODE}}, etc.",
  "technical_notes": "Technical compliance, standards, certifications, and delivery specifications",
  "boq_columns": ["row", "part_number", "dwg_tag", "brand", "type", "specs", "qty", "unit_price", "total_price"],
  "show_price_analysis_table": true,
  "warranty_template": "Warranty clause in Persian",
  "payment_terms_template": "Payment terms clause in Persian",
  "delivery_time_template": "Delivery timeframe in Persian",
  "validity_template": "Validity period in Persian",
  "closing_remarks": "Closing courtesy remarks in Persian",
  "signature_section": {
    "prepared_by_title": "Title of preparer (e.g. کارشناس ارشد مهندسی فروش)",
    "approved_by_title": "Title of approver (e.g. مدیر مهندسی و بازرگانی)",
    "company_seal_text": "Company seal text"
  },
  "raw_custom_template": "Complete structured markdown template embedding all tags: {{PROJECT_NAME}}, {{CLIENT_NAME}}, {{DATE}}, {{TECHNICAL_BOQ_TABLE}}, {{COMMERCIAL_PRICING_TABLE}}, {{MULTIPLIERS_ANALYSIS}}, {{TERMS_WARRANTY}}, {{TERMS_PAYMENT}}, {{COMPANY_SIGNATURE}}"
}

Only return pure JSON, without code block wrapping.`;

      const aiConfig = db.getAIConfig();
      const isGoogle = !aiConfig.base_url || aiConfig.base_url.includes('googleapis') || !aiConfig.base_url.includes('openrouter');

      let rawOutput = '';
      if (aiConfig.api_key && !isGoogle) {
        rawOutput = await queryCustomLLM(
          aiConfig.api_key,
          aiConfig.base_url,
          aiConfig.model_name,
          systemPrompt,
          documentText
        );
      } else {
        rawOutput = await queryServerGemini(
          systemPrompt,
          documentText,
          undefined,
          undefined,
          aiConfig.model_name,
          aiConfig.api_key || undefined
        );
      }

      // Parse JSON
      let cleaned = rawOutput.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsedTemplate = JSON.parse(cleaned);
      res.json({
        success: true,
        template: parsedTemplate
      });

    } catch (e: any) {
      console.error('Template AI extraction error:', e);
      res.status(500).json({ error: `خطا در تحلیل و استخراج قالب با هوش مصنوعی: ${e.message}` });
    }
  });

  // 6.4. Letters Automation Endpoints
  app.get('/api/letters', authenticateToken, (req, res) => {
    res.json(db.getLetters());
  });

  app.get('/api/letters/:id', authenticateToken, (req, res) => {
    const id = Number(req.params.id);
    const letter = db.getLetterById(id);
    if (!letter) return res.status(404).json({ error: 'نامه یافت نشد.' });
    res.json(letter);
  });

  app.post('/api/letters', authenticateToken, (req, res) => {
    const user: User = (req as any).user;
    const { letter_number, letter_date, type, subject, sender, recipient, confidentiality, priority, status, content, attachments, project_code, file_name, file_url, file_size, ai_analysis } = req.body;
    
    if (!letter_number || !subject) {
      return res.status(400).json({ error: 'شماره نامه و موضوع نامه الزامی است.' });
    }
    
    const newLetter = db.addLetter({
      letter_number: String(letter_number).trim(),
      letter_date: letter_date || new Date().toISOString().slice(0, 10),
      type: type === 'incoming' || type === 'internal' ? type : 'outgoing',
      subject: String(subject).trim(),
      sender: sender ? String(sender).trim() : '',
      recipient: recipient ? String(recipient).trim() : '',
      confidentiality: confidentiality === 'confidential' || confidentiality === 'secret' ? confidentiality : 'normal',
      priority: priority === 'urgent' || priority === 'immediate' ? priority : 'normal',
      status: status || 'sent',
      content: content || '',
      attachments: attachments || '',
      project_code: project_code || '',
      file_name: file_name || '',
      file_url: file_url || '',
      file_size: file_size || '',
      ai_analysis: ai_analysis || '',
      created_by: user.username
    });
    res.json(newLetter);
  });

  app.put('/api/letters/:id', authenticateToken, (req, res) => {
    const id = Number(req.params.id);
    const updated = db.updateLetter(id, req.body);
    if (!updated) return res.status(404).json({ error: 'نامه یافت نشد.' });
    res.json(updated);
  });

  app.delete('/api/letters/:id', authenticateToken, (req, res) => {
    const id = Number(req.params.id);
    const success = db.deleteLetter(id);
    if (!success) return res.status(404).json({ error: 'نامه یافت نشد.' });
    res.json({ success: true });
  });

  // AI Upload & Analysis for Official Letters
  app.post('/api/letters/analyze', authenticateToken, async (req, res) => {
    const { fileBase64, fileName, mimeType, textContent } = req.body;
    if (!fileBase64 && !textContent) {
      return res.status(400).json({ error: 'فایل یا متن نامه برای تحلیل ارسال نشده است.' });
    }

    try {
      let safeFilename = '';
      let fileUrl = '';
      let fileSize = '';
      let documentText = textContent || '';

      if (fileBase64 && fileName) {
        if (!isAllowedFileExtension(fileName)) {
          return res.status(400).json({ error: 'فرمت فایل ارسالی مجاز نیست.' });
        }

        const fileBytes = Buffer.from(fileBase64, 'base64');
        if (fileBytes.length > MAX_UPLOAD_BYTES) {
          return res.status(400).json({ error: 'حجم فایل ارسالی بیش از ۲۵ مگابایت است.' });
        }

        const timestampStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        const cleanBase = sanitizeFilename(fileName);
        safeFilename = `letter_${timestampStr}_${cleanBase}`;
        const filePath = path.join(UPLOAD_DIR, safeFilename);
        
        // Ensure destination is strictly inside UPLOAD_DIR
        if (!filePath.startsWith(UPLOAD_DIR)) {
          return res.status(403).json({ error: 'مسیر ذخیره‌سازی نامعتبر است.' });
        }

        fs.writeFileSync(filePath, fileBytes);
        fileUrl = `/api/documents/download/${safeFilename}`;
        
        const sizeKb = Math.round(fileBytes.length / 1024);
        fileSize = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

        if (mimeType === 'application/pdf') {
          try {
            const parsed = await parsePdf(fileBytes);
            documentText = parsed.text;
          } catch (pdfErr) {
            console.error('Error parsing PDF for letter:', pdfErr);
          }
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.toLowerCase().endsWith('.docx')) {
          try {
            const parsed = await parseDocx(fileBytes);
            documentText = parsed.text;
          } catch (docxErr) {
            console.error('Error parsing DOCX for letter:', docxErr);
          }
        }
      }

      const prompt = `
      You are an expert F&G (Fire & Gas Systems) Engineering and Official Administrative Correspondence Specialist.
      Analyze the provided official letter document and extract all key metadata and generate a comprehensive Persian AI Analysis.
      
      Return strictly a single JSON object with these keys:
      {
        "subject": "موضوع دقیق و شفاف نامه",
        "sender": "نام دقیق فرستنده یا شرکت/سازمان صادرکننده",
        "recipient": "نام دقیق گیرنده یا سازمان مقصد",
        "letter_number": "شماره نامه رسمی ذکر شده در سند یا یک شماره استاندارد پیشنهادی",
        "letter_date": "تاریخ نامه (ترجیحاً تاریخ شمسی ذکر شده در نامه مانند ۱۴۰۵/۰۵/۱۸)",
        "type": "یکی از مقادیر exact: 'outgoing' (صادره) | 'incoming' (وارده) | 'internal' (داخلی)",
        "confidentiality": "یکی از مقادیر exact: 'normal' (عادی) | 'confidential' (محرمانه) | 'secret' (سری)",
        "priority": "یکی از مقادیر exact: 'normal' (عادی) | 'urgent' (فوری) | 'immediate' (آنی)",
        "project_code": "کد پروژه مرجع (مثلاً IP-2026-F&G-01 یا کد ذکر شده در نامه)",
        "content": "متن اصلی و کامل یا چکیده استاندارد و بندبندی شده نامه به زبان فارسی",
        "ai_analysis": "تحلیل تخصصی اداری و مهندسی نامه شامل: 📌 هدف اصلی نامه | ⚠️ نکات کلیدی و الزامات فنی/قراردادی | 🎯 اقدامات لازم و واحد مسئول | ⏳ مهلت پاسخ (در صورت وجود)"
      }
      `;

      const aiConfig = db.getAIConfig();
      const isGoogle = !aiConfig.base_url || aiConfig.base_url.includes('googleapis') || !aiConfig.base_url.includes('openrouter');

      let rawOutput = '';
      if (aiConfig.api_key && !isGoogle) {
        rawOutput = await queryCustomLLM(
          aiConfig.api_key,
          aiConfig.base_url,
          aiConfig.model_name,
          prompt,
          documentText,
          mimeType && mimeType !== 'application/pdf' ? fileBase64 : undefined,
          mimeType && mimeType !== 'application/pdf' ? mimeType : undefined
        );
      } else {
        rawOutput = await queryServerGemini(
          prompt,
          documentText,
          mimeType && mimeType !== 'application/pdf' ? fileBase64 : undefined,
          mimeType && mimeType !== 'application/pdf' ? mimeType : undefined,
          aiConfig.model_name,
          aiConfig.api_key || undefined
        );
      }

      let extractedData: any = {};
      try {
        extractedData = extractJSON(rawOutput);
      } catch (e: any) {
        console.error('Failed to parse JSON from AI letter analysis:', e);
        extractedData = {
          subject: fileName ? `نامه ${fileName}` : 'بررسی سند نامه',
          content: documentText || rawOutput,
          ai_analysis: rawOutput
        };
      }

      res.json({
        success: true,
        file_name: safeFilename || fileName || '',
        file_url: fileUrl,
        file_size: fileSize,
        extracted: extractedData
      });

    } catch (err: any) {
      console.error('Letter AI Analysis Error:', err);
      res.status(500).json({ error: `خطا در تحلیل هوشمند فایل نامه: ${err.message}` });
    }
  });

  // Extract raw text from file (for templates)
  app.post('/api/extract-text', authenticateToken, async (req, res) => {
    const { fileBase64, fileName, mimeType } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: 'فایلی ارسال نشده است.' });
    }
    
    try {
      const fileBytes = Buffer.from(fileBase64, 'base64');
      if (fileBytes.length > MAX_UPLOAD_BYTES) {
        return res.status(400).json({ error: 'حجم فایل بیش از حد مجاز است.' });
      }

      let text = '';
      if (mimeType === 'application/pdf') {
        const parsed = await parsePdf(fileBytes);
        text = parsed.text;
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || (fileName && fileName.toLowerCase().endsWith('.docx'))) {
        const parsed = await parseDocx(fileBytes);
        text = parsed.text;
      } else if (mimeType && mimeType.startsWith('text/')) {
        text = fileBytes.toString('utf-8');
      } else {
        return res.status(400).json({ error: 'فرمت فایل جهت استخراج متن پشتیبانی نمی‌شود.' });
      }
      
      res.json({ text });
    } catch (err: any) {
      console.error('Error extracting text:', err);
      res.status(500).json({ error: 'خطا در استخراج متن از فایل.' });
    }
  });

  // 6.5. Documents / Archives
  app.get('/api/documents', authenticateToken, (req, res) => {
    res.json(db.getDocumentCorpus());
  });

  app.get('/api/documents/download/:filename', authenticateToken, (req, res) => {
    const filename = req.params.filename;
    // Strict protection against path traversal
    const sanitizedFilename = path.basename(filename).replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filePath = path.resolve(UPLOAD_DIR, sanitizedFilename);
    
    if (!filePath.startsWith(UPLOAD_DIR)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'فایل یافت نشد.' });
    }
    res.download(filePath, sanitizedFilename);
  });

  // 7. Smart AI Processing / Database feeder
  app.post('/api/ai/extract', authenticateToken, async (req, res) => {
    const user: User = (req as any).user;
    const { fileBase64, fileName, mimeType, uploadCategory } = req.body;
    
    if (!fileBase64 || !fileName || !uploadCategory) {
      return res.status(400).json({ error: 'فایل ارسالی یا دسته‌بندی معتبر نیست.' });
    }

    if (!isAllowedFileExtension(fileName)) {
      return res.status(400).json({ error: 'فرمت فایل جهت استخراج مجاز نیست.' });
    }

    try {
      const fileBytes = Buffer.from(fileBase64, 'base64');
      if (fileBytes.length > MAX_UPLOAD_BYTES) {
        return res.status(400).json({ error: 'حجم فایل بیش از حد مجاز است.' });
      }

      const timestampStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const cleanBase = sanitizeFilename(fileName);
      const safeFilename = `${timestampStr}_${cleanBase}`;
      const filePath = path.join(UPLOAD_DIR, safeFilename);
      
      if (!filePath.startsWith(UPLOAD_DIR)) {
        return res.status(403).json({ error: 'مسیر ذخیره‌سازی نامعتبر است.' });
      }

      fs.writeFileSync(filePath, fileBytes);

      let documentText = '';
      if (mimeType === 'application/pdf') {
        const parsed = await parsePdf(fileBytes);
        documentText = parsed.text;
      }

      const aiConfig = db.getAIConfig();
      const prompt = `
      You are an expert F&G (Fire & Gas) engineer. Analyze the document/text and extract technical info.
      PART 1: Extract equipment belonging ONLY to the ${uploadCategory} system.
      Return a JSON list of objects: {"part_number": "...", "brand": "...", "equipment_type": "...", "price": float or null, "currency": "...", "nfpa_reference": "...", "technical_specifications": "..."}
      
      PART 2: Extract 1 to 3 high-level technical engineering rules, guidelines, or definitions from this document for the long-term memory of the AI.
      Return it inside a key "knowledge_blocks": [{"concept": "concept name", "details": "explanation of rule/standard in Persian", "keywords": "comma separated keywords"}]
      
      Return everything strictly as a single JSON object with two root keys: "equipment_list" and "knowledge_blocks".
      `;

      const isGoogle = !aiConfig.base_url || aiConfig.base_url.includes('googleapis') || !aiConfig.base_url.includes('openrouter');

      let rawOutput = '';
      if (aiConfig.api_key && !isGoogle) {
        rawOutput = await queryCustomLLM(
          aiConfig.api_key,
          aiConfig.base_url,
          aiConfig.model_name,
          prompt,
          documentText,
          mimeType !== 'application/pdf' ? fileBase64 : undefined,
          mimeType !== 'application/pdf' ? mimeType : undefined
        );
      } else {
        rawOutput = await queryServerGemini(
          prompt,
          documentText,
          mimeType !== 'application/pdf' ? fileBase64 : undefined,
          mimeType !== 'application/pdf' ? mimeType : undefined,
          aiConfig.model_name,
          aiConfig.api_key || undefined
        );
      }

      let extractedData: any;
      try {
        extractedData = extractJSON(rawOutput);
      } catch (e: any) {
        console.error('Failed to extract JSON from rawOutput:', e);
        return res.status(500).json({ 
          error: `فرمت خروجی مدل هوش مصنوعی معتبر نبود: ${e.message}`
        });
      }

      const equipmentList = extractedData.equipment_list || [];
      const knowledgeBlocks = extractedData.knowledge_blocks || [];

      const shamsiDate = getShamsiNow();
      let successCount = 0;

      for (const eq of equipmentList) {
        if (!eq.part_number || !eq.brand || !eq.equipment_type) continue;
        db.upsertEquipmentByPartNumber(eq.part_number, {
          brand: eq.brand,
          equipment_type: eq.equipment_type,
          price: eq.price ? Number(eq.price) : null,
          currency: eq.currency || 'USD',
          nfpa_reference: eq.nfpa_reference || '',
          technical_specifications: eq.technical_specifications || '',
          source_file: safeFilename,
          system_type: uploadCategory as 'alarm' | 'fighting',
          created_at: shamsiDate,
          created_by: user.username
        });
        successCount++;
      }

      for (const block of knowledgeBlocks) {
        db.addKnowledgeBase({
          source_file: safeFilename,
          system_type: uploadCategory as 'alarm' | 'fighting',
          concept: block.concept || '',
          details: block.details || '',
          keywords: block.keywords || ''
        });
      }

      db.addDocumentCorpus(safeFilename, rawOutput);

      res.json({
        success: true,
        equipmentCount: successCount,
        knowledgeCount: knowledgeBlocks.length,
        equipmentList,
        knowledgeBlocks
      });

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: `خطا در پردازش هوشمند فایل: ${e.message}` });
    }
  });

  // 8. RAG + Engineering Assistant Chat (Server-side enforced access bounds)
  app.post('/api/ai/chat', authenticateToken, async (req, res) => {
    const user: User = (req as any).user;
    const { query, history, fileBase64, mimeType, chatId } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'سوال نامعتبر است.' });
    }

    try {
      // Enforce actual user system and price access bounds from server session
      const systemAccess = user.role === 'admin' ? (req.body.systemAccess || 'both') : user.system_access;
      const priceAccess = user.role === 'admin' ? 1 : user.price_access;

      // 1. RAG Memory Search
      const context = retrieveMemory(query, systemAccess, priceAccess);

      // 2. Formulate Prompt
      let priceConstraint = '';
      if (priceAccess === 0) {
        priceConstraint = 'هشدار مهم: شما تحت هیچ شرایطی اجازه ندارید قیمت یا اطلاعات مالی تجهیزات را به کاربر اعلام کنید. قیمت‌ها برای او محرمانه است!';
      }

      const systemPrompt = `شما یک دستیار مهندسی مجرب و کارشناس سیستم‌های اعلام و اطفاء حریق (F&G) هستید. به کاربر به زبان فارسی پاسخ فنی، شیوا و بسیار حرفه‌ای ارائه دهید.
      بر اساس حافظه زیر و دانش مهندسی خود به سوال پاسخ دهید.
      ${priceConstraint}
      
      [حافظه محلی مرتبط]:
      ${context}`;

      const aiConfig = db.getAIConfig();
      let responseText = '';

      let attachedText = '';
      if (fileBase64 && mimeType === 'application/pdf') {
        const fileBytes = Buffer.from(fileBase64, 'base64');
        const parsed = await parsePdf(fileBytes);
        attachedText = `\n\n[متن سند پیوست شده توسط کاربر]:\n${parsed.text}`;
      }

      const userMessage = query + attachedText;

      const isGoogle = !aiConfig.base_url || aiConfig.base_url.includes('googleapis') || !aiConfig.base_url.includes('openrouter');

      if (aiConfig.api_key && !isGoogle) {
        responseText = await queryCustomLLM(
          aiConfig.api_key,
          aiConfig.base_url,
          aiConfig.model_name,
          systemPrompt,
          userMessage,
          fileBase64 && mimeType !== 'application/pdf' ? fileBase64 : undefined,
          mimeType !== 'application/pdf' ? mimeType : undefined
        );
      } else {
        responseText = await queryServerGemini(
          systemPrompt + '\n\nHistory and custom context handled.',
          userMessage,
          fileBase64 && mimeType !== 'application/pdf' ? fileBase64 : undefined,
          mimeType !== 'application/pdf' ? mimeType : undefined,
          aiConfig.model_name,
          aiConfig.api_key || undefined
        );
      }

      // Add to archive with authenticated user's ID
      const currentHistory = [...(history || []), { role: 'user', content: query }, { role: 'assistant', content: responseText }];
      
      let finalChatId = chatId ? Number(chatId) : null;
      if (!finalChatId) {
        const newArchive = db.addChatArchive(user.id, query.slice(0, 30), currentHistory);
        finalChatId = newArchive.id;
      } else {
        db.updateChatArchive(finalChatId, currentHistory);
      }

      res.json({
        chatId: finalChatId,
        response: responseText,
        history: currentHistory
      });

    } catch (e: any) {
      console.error('AI Assistant Error:', e);
      res.status(500).json({ error: `خطای دستیار هوش مصنوعی: ${e.message}` });
    }
  });

  // ==========================================
  // --- EMAIL DISPATCH & MANAGEMENT APIS ---
  // ==========================================

  // 1. Get Email Configuration (Safe view)
  app.get('/api/email/config', authenticateToken, (req, res) => {
    try {
      const config = db.getSafeEmailConfig();
      res.json(config);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در دریافت تنظیمات ایمیل: ${e.message}` });
    }
  });

  // 2. Update Email Configuration (Admin only)
  app.post('/api/email/config', authenticateToken, requireAdmin, (req, res) => {
    try {
      const user: User = (req as any).user;
      const updatedConfig = db.updateEmailConfig(req.body);
      db.addAuditLog(user.id, user.username, 'UPDATE_EMAIL_CONFIG', `ویرایش تنظیمات سرور ایمیل SMTP (${req.body.smtp_host || 'default'})`, req.ip);
      res.json({
        success: true,
        message: 'تنظیمات سرور ایمیل با موفقیت ذخیره شد.',
        config: updatedConfig
      });
    } catch (e: any) {
      res.status(500).json({ error: `خطا در ذخیره تنظیمات ایمیل: ${e.message}` });
    }
  });

  // 3. Test SMTP Connection (Admin only)
  app.post('/api/email/test-connection', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const user: User = (req as any).user;
      const currentConfig = db.getInternalEmailConfig();
      const testConfig = {
        ...currentConfig,
        ...req.body,
        smtp_pass: req.body.smtp_pass && !req.body.smtp_pass.includes('••••')
          ? req.body.smtp_pass
          : currentConfig.smtp_pass
      };

      const result = await testSmtpConnection(testConfig);
      db.addAuditLog(
        user.id, 
        user.username, 
        'TEST_SMTP_CONNECTION', 
        `تست اتصال SMTP: ${result.success ? 'موفق' : 'ناموفق'} (${result.message})`, 
        req.ip
      );
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, message: `خطا در تست سرور: ${e.message}` });
    }
  });

  // 4. Get Email Logs
  app.get('/api/email/logs', authenticateToken, (req, res) => {
    try {
      const logs = db.getEmailLogs();
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در دریافت سوابق ایمیل‌ها: ${e.message}` });
    }
  });

  // 5. Delete Single Email Log (Admin only)
  app.delete('/api/email/logs/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = db.deleteEmailLog(id);
      if (!success) {
        return res.status(404).json({ error: 'لاگ ایمیل مورد نظر یافت نشد.' });
      }
      res.json({ success: true, message: 'رکورد ایمیل با موفقیت حذف گردید.' });
    } catch (e: any) {
      res.status(500).json({ error: `خطا در حذف لاگ ایمیل: ${e.message}` });
    }
  });

  // 6. Clear All Email Logs (Admin only)
  app.post('/api/email/clear-logs', authenticateToken, requireAdmin, (req, res) => {
    try {
      const user: User = (req as any).user;
      db.clearEmailLogs();
      db.addAuditLog(user.id, user.username, 'CLEAR_EMAIL_LOGS', 'پاک‌سازی کامل تاریخچه و سوابق ایمیل‌های ارسالی', req.ip);
      res.json({ success: true, message: 'کلیه سوابق ایمیل‌ها با موفقیت پاک‌سازی شدند.' });
    } catch (e: any) {
      res.status(500).json({ error: `خطا در پاک‌سازی سوابق ایمیل: ${e.message}` });
    }
  });

  // 7. Direct / Custom Email Sending
  app.post('/api/email/send', authenticateToken, async (req, res) => {
    try {
      const user: User = (req as any).user;
      const { to, cc, bcc, subject, text, html, type, reference_id, attachments } = req.body;

      if (!to || !subject) {
        return res.status(400).json({ error: 'آدرس گیرنده و موضوع ایمیل الزامی است.' });
      }

      const result = await sendEmail({
        to,
        cc,
        bcc,
        subject,
        text,
        html,
        type: type || 'custom',
        reference_id,
        sent_by: user.username,
        attachments
      });

      db.addAuditLog(
        user.id, 
        user.username, 
        'SEND_EMAIL', 
        `ارسال ایمیل به ${Array.isArray(to) ? to.join(', ') : to} - موضوع: ${subject} (${result.status})`, 
        req.ip
      );

      res.json(result);
    } catch (e: any) {
      console.error('Email Send Error:', e);
      res.status(500).json({ error: `خطا در فرآیند ارسال ایمیل: ${e.message}` });
    }
  });

  // 8. Send Proposal via Email
  app.post('/api/email/send-proposal', authenticateToken, async (req, res) => {
    try {
      const user: User = (req as any).user;
      const { to, cc, bcc, proposal, customMessage, subject, attachments } = req.body;

      if (!to || !proposal) {
        return res.status(400).json({ error: 'آدرس گیرنده و اطلاعات پروپوزال الزامی است.' });
      }

      const emailSubject = subject || `پیشنهاد فنی و مالی پروژه ${proposal.title || ''} (${proposal.projectCode || ''})`;
      const htmlBody = buildProposalEmailHtml({
        proposal,
        customMessage,
        senderName: user.username,
        senderTitle: user.role === 'admin' ? 'مدیریت مهندسی و بازرگانی' : 'کارشناس مهندسی فروش F&G'
      });

      const plainText = `با سلام و احترام،\nپیشنهاد فنی و مالی پروژه ${proposal.title || ''} (کد پروژه: ${proposal.projectCode || ''}) برای ${proposal.clientName || 'کارفرمای محترم'} پیوست و ارسال گردید.\n\n${customMessage || ''}\n\nبا سپاس،\nشرکت مهندسی ایساتیس پارس تجهیز`;

      const result = await sendEmail({
        to,
        cc,
        bcc,
        subject: emailSubject,
        text: plainText,
        html: htmlBody,
        type: 'proposal',
        reference_id: proposal.id || proposal.projectCode,
        sent_by: user.username,
        attachments
      });

      db.addAuditLog(
        user.id, 
        user.username, 
        'SEND_PROPOSAL_EMAIL', 
        `ارسال ایمیل پروپوزال ${proposal.projectCode} به ${Array.isArray(to) ? to.join(', ') : to}`, 
        req.ip
      );

      res.json(result);
    } catch (e: any) {
      console.error('Send Proposal Email Error:', e);
      res.status(500).json({ error: `خطا در ارسال ایمیل پروپوزال: ${e.message}` });
    }
  });

  // 9. Send Letter via Email
  app.post('/api/email/send-letter', authenticateToken, async (req, res) => {
    try {
      const user: User = (req as any).user;
      const { to, cc, bcc, letter, customMessage, subject, attachments } = req.body;

      if (!to || !letter) {
        return res.status(400).json({ error: 'آدرس گیرنده و اطلاعات نامه الزامی است.' });
      }

      const emailSubject = subject || `نامه اداری شماره ${letter.letter_number} - ${letter.subject}`;
      const htmlBody = buildLetterEmailHtml({
        letter,
        customMessage
      });

      const plainText = `با سلام و احترام،\nنامه شماره ${letter.letter_number} مورخ ${letter.letter_date} با موضوع "${letter.subject}" ارسال می‌گردد.\n\n${letter.content}\n\nبا تشکر،\n${letter.sender || 'شرکت مهندسی ایساتیس پارس تجهیز'}`;

      const result = await sendEmail({
        to,
        cc,
        bcc,
        subject: emailSubject,
        text: plainText,
        html: htmlBody,
        type: 'letter',
        reference_id: letter.id || letter.letter_number,
        sent_by: user.username,
        attachments
      });

      db.addAuditLog(
        user.id, 
        user.username, 
        'SEND_LETTER_EMAIL', 
        `ارسال ایمیل نامه اداری ${letter.letter_number} به ${Array.isArray(to) ? to.join(', ') : to}`, 
        req.ip
      );

      res.json(result);
    } catch (e: any) {
      console.error('Send Letter Email Error:', e);
      res.status(500).json({ error: `خطا در ارسال ایمیل نامه: ${e.message}` });
    }
  });

  // 10. Send Equipment Specs via Email
  app.post('/api/email/send-equipment', authenticateToken, async (req, res) => {
    try {
      const user: User = (req as any).user;
      const { to, cc, bcc, equipment, customMessage, subject } = req.body;

      if (!to || !equipment) {
        return res.status(400).json({ error: 'آدرس گیرنده و اطلاعات تجهیز الزامی است.' });
      }

      const emailSubject = subject || `مشخصات فنی تجهیز ${equipment.part_number} (${equipment.brand})`;
      const htmlBody = buildEquipmentEmailHtml({
        equipment,
        customMessage
      });

      const plainText = `با سلام و احترام،\nمشخصات فنی تجهیز ${equipment.part_number} برند ${equipment.brand} (${equipment.equipment_type}) ارسال می‌گردد.\n\n${equipment.technical_specifications}\n\nشرکت مهندسی ایساتیس پارس تجهیز`;

      const result = await sendEmail({
        to,
        cc,
        bcc,
        subject: emailSubject,
        text: plainText,
        html: htmlBody,
        type: 'equipment',
        reference_id: equipment.id || equipment.part_number,
        sent_by: user.username
      });

      db.addAuditLog(
        user.id, 
        user.username, 
        'SEND_EQUIPMENT_EMAIL', 
        `ارسال ایمیل مشخصات تجهیز ${equipment.part_number} به ${Array.isArray(to) ? to.join(', ') : to}`, 
        req.ip
      );

      res.json(result);
    } catch (e: any) {
      console.error('Send Equipment Email Error:', e);
      res.status(500).json({ error: `خطا در ارسال مشخصات تجهیز با ایمیل: ${e.message}` });
    }
  });

  // 11. AI Email Draft Generator
  app.post('/api/email/generate-draft', authenticateToken, async (req, res) => {
    try {
      const { recipientName, contextType, summaryDetails, tone, language } = req.body;
      const draft = await generateAiEmailDraft({
        recipientName,
        contextType: contextType || 'proposal',
        summaryDetails: summaryDetails || '',
        tone: tone || 'formal',
        language: language || 'fa'
      });

      res.json({
        success: true,
        draft
      });
    } catch (e: any) {
      console.error('Generate Email Draft Error:', e);
      res.status(500).json({ error: `خطا در تولید متن ایمیل با هوش مصنوعی: ${e.message}` });
    }
  });

  // ==================== EDMS (Engineering Document Management System) Routes ====================

  // 1. EDMS Overview Stats
  app.get('/api/edms/stats', authenticateToken, (req, res) => {
    try {
      const stats = db.getEDMSStats();
      res.json(stats);
    } catch (e: any) {
      console.error('EDMS Stats Error:', e);
      res.status(500).json({ error: `خطا در دریافت آمار سیستم EDMS: ${e.message}` });
    }
  });

  // 2. EDMS Documents (MDR)
  app.get('/api/edms/documents', authenticateToken, (req, res) => {
    try {
      const { project_code, discipline, status, search } = req.query;
      const docs = db.getEDMSDocuments({
        project_code: project_code ? String(project_code) : undefined,
        discipline: discipline ? String(discipline) : undefined,
        status: status ? String(status) : undefined,
        search: search ? String(search) : undefined
      });
      res.json(docs);
    } catch (e: any) {
      console.error('EDMS Get Documents Error:', e);
      res.status(500).json({ error: `خطا در دریافت لیست مدارک مهندسی: ${e.message}` });
    }
  });

  app.get('/api/edms/documents/:id', authenticateToken, (req, res) => {
    try {
      const doc = db.getEDMSDocumentById(Number(req.params.id));
      if (!doc) {
        return res.status(404).json({ error: 'مدرک مهندسی مورد نظر یافت نشد.' });
      }
      res.json(doc);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در دریافت مدرک: ${e.message}` });
    }
  });

  app.post('/api/edms/documents', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const { 
        doc_number, 
        title, 
        title_en, 
        project_code, 
        project_name, 
        discipline, 
        doc_type, 
        weight_factor, 
        current_revision, 
        current_status, 
        progress, 
        planned_date, 
        actual_date, 
        remarks, 
        equipment_tags, 
        file_name 
      } = req.body;

      if (!doc_number || !title) {
        return res.status(400).json({ error: 'شماره مدرک (Document Number) و عنوان مدرک الزامی هستند.' });
      }

      const newDoc = db.addEDMSDocument({
        doc_number: doc_number.trim(),
        title: title.trim(),
        title_en: title_en ? title_en.trim() : undefined,
        project_code: project_code || 'PRJ-FNG-GEN',
        project_name: project_name || 'پروژه عمومی F&G',
        discipline: discipline || 'F&G',
        doc_type: doc_type || 'DWG',
        weight_factor: Number(weight_factor) || 5.0,
        current_revision: current_revision || 'Rev 0',
        current_status: current_status || 'IFR',
        progress: Number(progress) || 0,
        planned_date: planned_date || getShamsiNow(),
        actual_date: actual_date || undefined,
        remarks: remarks || '',
        equipment_tags: Array.isArray(equipment_tags) ? equipment_tags : [],
        file_name: file_name || '',
        created_by: user.username
      });

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_ADD_DOCUMENT',
        `ثبت مدرک جدید مهندسی ${newDoc.doc_number} - ${newDoc.title} در MDR`,
        req.ip
      );

      res.status(201).json(newDoc);
    } catch (e: any) {
      console.error('EDMS Add Document Error:', e);
      res.status(500).json({ error: `خطا در ثبت مدرک مهندسی: ${e.message}` });
    }
  });

  app.put('/api/edms/documents/:id', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const id = Number(req.params.id);
      const updated = db.updateEDMSDocument(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'مدرک مهندسی مورد نظر یافت نشد.' });
      }

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_UPDATE_DOCUMENT',
        `ویرایش مدرک مهندسی ${updated.doc_number} (پیشرفت: ${updated.progress}%, رویژن: ${updated.current_revision})`,
        req.ip
      );

      res.json(updated);
    } catch (e: any) {
      console.error('EDMS Update Document Error:', e);
      res.status(500).json({ error: `خطا در به‌روزرسانی مدرک: ${e.message}` });
    }
  });

  app.delete('/api/edms/documents/:id', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const id = Number(req.params.id);
      const doc = db.getEDMSDocumentById(id);
      const success = db.deleteEDMSDocument(id);
      if (!success) {
        return res.status(404).json({ error: 'مدرک مهندسی یافت نشد یا قبلاً حذف شده است.' });
      }

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_DELETE_DOCUMENT',
        `حذف مدرک مهندسی ${doc ? doc.doc_number : id} از سیستم MDR`,
        req.ip
      );

      res.json({ success: true, message: 'مدرک مهندسی با موفقیت حذف گردید.' });
    } catch (e: any) {
      console.error('EDMS Delete Document Error:', e);
      res.status(500).json({ error: `خطا در حذف مدرک: ${e.message}` });
    }
  });

  // 3. EDMS Revisions Lifecycle
  app.get('/api/edms/documents/:id/revisions', authenticateToken, (req, res) => {
    try {
      const docId = Number(req.params.id);
      const revs = db.getEDMSRevisions(docId);
      res.json(revs);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در دریافت تاریخچه رویژن‌ها: ${e.message}` });
    }
  });

  app.post('/api/edms/documents/:id/revisions', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const docId = Number(req.params.id);
      const doc = db.getEDMSDocumentById(docId);
      if (!doc) {
        return res.status(404).json({ error: 'مدرک مرتبط با رویژن یافت نشد.' });
      }

      const { revision, issue_purpose, issue_date, transmittal_number, review_code, review_date, reviewed_by, revision_notes } = req.body;
      if (!revision || !issue_purpose) {
        return res.status(400).json({ error: 'شماره رویژن و دلیل صدور (Issue Purpose) الزامی است.' });
      }

      const newRev = db.addEDMSRevision({
        doc_id: docId,
        doc_number: doc.doc_number,
        revision: revision.trim(),
        issue_purpose,
        issue_date: issue_date || getShamsiNow(),
        transmittal_number: transmittal_number || '',
        review_code: review_code || 'Pending',
        review_date: review_date || undefined,
        reviewed_by: reviewed_by || '',
        revision_notes: revision_notes || '',
        created_by: user.username
      });

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_ADD_REVISION',
        `صدور نسخه جدید رویژن ${newRev.revision} (${newRev.issue_purpose}) برای مدرک ${doc.doc_number}`,
        req.ip
      );

      res.status(201).json(newRev);
    } catch (e: any) {
      console.error('EDMS Add Revision Error:', e);
      res.status(500).json({ error: `خطا در ثبت رویژن جدید: ${e.message}` });
    }
  });

  // 4. EDMS Transmittals Management
  app.get('/api/edms/transmittals', authenticateToken, (req, res) => {
    try {
      const { project_code, type, status } = req.query;
      const list = db.getEDMSTransmittals({
        project_code: project_code ? String(project_code) : undefined,
        type: type ? String(type) : undefined,
        status: status ? String(status) : undefined
      });
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در دریافت لیست ترانزمیتال‌ها: ${e.message}` });
    }
  });

  app.get('/api/edms/transmittals/:id', authenticateToken, (req, res) => {
    try {
      const trans = db.getEDMSTransmittalById(Number(req.params.id));
      if (!trans) {
        return res.status(404).json({ error: 'ترانزمیتال مورد نظر یافت نشد.' });
      }
      res.json(trans);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در دریافت ترانزمیتال: ${e.message}` });
    }
  });

  app.post('/api/edms/transmittals', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const { 
        transmittal_number, 
        transmittal_date, 
        project_code, 
        project_name, 
        sender, 
        sender_contact, 
        recipient, 
        attention_to, 
        recipient_email, 
        subject, 
        transmittal_type, 
        issue_purpose, 
        delivery_method, 
        documents, 
        remarks, 
        prepared_by, 
        approved_by, 
        status 
      } = req.body;

      if (!transmittal_number || !recipient || !subject) {
        return res.status(400).json({ error: 'شماره ترانزمیتال، گیرنده و موضوع الزامی هستند.' });
      }

      const newTrans = db.addEDMSTransmittal({
        transmittal_number: transmittal_number.trim(),
        transmittal_date: transmittal_date || getShamsiNow(),
        project_code: project_code || 'PRJ-SP14-FG',
        project_name: project_name || 'پروژه پالایشگاهی F&G',
        sender: sender || 'شرکت مهندسی ایساتیس پارس تجهیز (IPT)',
        sender_contact: sender_contact || 'دپارتمان کنترل مدارک DCC',
        recipient: recipient.trim(),
        attention_to: attention_to || '',
        recipient_email: recipient_email || '',
        subject: subject.trim(),
        transmittal_type: transmittal_type || 'outgoing',
        issue_purpose: issue_purpose || 'IFR',
        delivery_method: delivery_method || 'Email',
        documents: Array.isArray(documents) ? documents : [],
        remarks: remarks || '',
        prepared_by: prepared_by || user.username,
        approved_by: approved_by || 'مدیر مهندسی',
        status: status || 'draft'
      });

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_CREATE_TRANSMITTAL',
        `صدور ترانزمیتال مهندسی شماره ${newTrans.transmittal_number} به مقصد ${newTrans.recipient}`,
        req.ip
      );

      res.status(201).json(newTrans);
    } catch (e: any) {
      console.error('EDMS Add Transmittal Error:', e);
      res.status(500).json({ error: `خطا در ایجاد ترانزمیتال: ${e.message}` });
    }
  });

  app.put('/api/edms/transmittals/:id', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const id = Number(req.params.id);
      const updated = db.updateEDMSTransmittal(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'ترانزمیتال مورد نظر یافت نشد.' });
      }

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_UPDATE_TRANSMITTAL',
        `ویرایش اطلاعات ترانزمیتال ${updated.transmittal_number}`,
        req.ip
      );

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در به‌روزرسانی ترانزمیتال: ${e.message}` });
    }
  });

  app.delete('/api/edms/transmittals/:id', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const id = Number(req.params.id);
      const trans = db.getEDMSTransmittalById(id);
      const success = db.deleteEDMSTransmittal(id);
      if (!success) {
        return res.status(404).json({ error: 'ترانزمیتال یافت نشد یا قبلاً حذف شده است.' });
      }

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_DELETE_TRANSMITTAL',
        `حذف ترانزمیتال شماره ${trans ? trans.transmittal_number : id}`,
        req.ip
      );

      res.json({ success: true, message: 'ترانزمیتال با موفقیت حذف گردید.' });
    } catch (e: any) {
      res.status(500).json({ error: `خطا در حذف ترانزمیتال: ${e.message}` });
    }
  });

  // 5. Send Transmittal via Email
  app.post('/api/edms/transmittals/:id/send-email', authenticateToken, async (req, res) => {
    try {
      const user: User = (req as any).user;
      const id = Number(req.params.id);
      const trans = db.getEDMSTransmittalById(id);
      if (!trans) {
        return res.status(404).json({ error: 'ترانزمیتال مورد نظر یافت نشد.' });
      }

      const { to, cc, bcc, customMessage, attachments } = req.body;
      const recipientEmail = to || trans.recipient_email;

      if (!recipientEmail) {
        return res.status(400).json({ error: 'آدرس ایمیل گیرنده تعیین نشده است.' });
      }

      const emailSubject = `[Transmittal] ${trans.transmittal_number} - ${trans.subject} (${trans.issue_purpose})`;
      const htmlBody = buildTransmittalEmailHtml({
        transmittal: trans,
        customMessage,
        senderName: user.username
      });

      const plainText = `با سلام و احترام،\nترانزمیتال رسمی شماره ${trans.transmittal_number} مورخ ${trans.transmittal_date} با موضوع "${trans.subject}" پیوست گردید.\n\nهدف صدور: ${trans.issue_purpose}\nگیرنده: ${trans.recipient}\nتوضیحات: ${trans.remarks || 'فاقد توضیحات'}\n\nشرکت مهندسی ایساتیس پارس تجهیز - واحد کنترل مدارک DCC`;

      const result = await sendEmail({
        to: recipientEmail,
        cc,
        bcc,
        subject: emailSubject,
        text: plainText,
        html: htmlBody,
        type: 'transmittal',
        reference_id: trans.transmittal_number,
        sent_by: user.username,
        attachments
      });

      // Update transmittal status to issued & emailed_at
      db.updateEDMSTransmittal(id, {
        status: 'issued',
        emailed_at: new Date().toISOString()
      });

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_EMAIL_TRANSMITTAL',
        `ارسال ایمیل ترانزمیتال ${trans.transmittal_number} به ${recipientEmail} (${result.status})`,
        req.ip
      );

      res.json(result);
    } catch (e: any) {
      console.error('EDMS Send Transmittal Email Error:', e);
      res.status(500).json({ error: `خطا در ارسال ایمیل ترانزمیتال: ${e.message}` });
    }
  });

  // 6. Comment Resolution Sheet (CRS)
  app.get('/api/edms/comments', authenticateToken, (req, res) => {
    try {
      const { doc_id, status, transmittal_number } = req.query;
      const comments = db.getEDMSComments({
        doc_id: doc_id ? Number(doc_id) : undefined,
        status: status ? String(status) : undefined,
        transmittal_number: transmittal_number ? String(transmittal_number) : undefined
      });
      res.json(comments);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در دریافت لیست کامنت‌ها: ${e.message}` });
    }
  });

  app.post('/api/edms/comments', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const { 
        doc_id, 
        doc_number, 
        revision, 
        transmittal_number, 
        item_no, 
        page_or_sheet, 
        client_comment, 
        contractor_response, 
        status, 
        resolution_code, 
        commented_by, 
        responded_by 
      } = req.body;

      if (!client_comment) {
        return res.status(400).json({ error: 'متن کامنت کارفرما الزامی است.' });
      }

      const existingComments = db.getEDMSComments({ doc_id: doc_id ? Number(doc_id) : undefined });
      const nextItemNo = item_no || (existingComments.length + 1);

      const newComment = db.addEDMSComment({
        doc_id: Number(doc_id) || 0,
        doc_number: doc_number || '',
        revision: revision || '0',
        transmittal_number: transmittal_number || '',
        item_no: nextItemNo,
        page_or_sheet: page_or_sheet || '',
        client_comment: client_comment.trim(),
        contractor_response: contractor_response || '',
        status: status || 'pending',
        resolution_code: resolution_code || 'Pending',
        commented_by: commented_by || 'دستگاه نظارت',
        responded_by: responded_by || user.username
      });

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_ADD_COMMENT',
        `ثبت کامنت جدید شماره ${newComment.item_no} برای مدرک ${newComment.doc_number}`,
        req.ip
      );

      res.status(201).json(newComment);
    } catch (e: any) {
      console.error('EDMS Add Comment Error:', e);
      res.status(500).json({ error: `خطا در ثبت کامنت: ${e.message}` });
    }
  });

  app.put('/api/edms/comments/:id', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const id = Number(req.params.id);
      const updated = db.updateEDMSComment(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'کامنت مورد نظر یافت نشد.' });
      }

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_UPDATE_COMMENT',
        `پاسخ و به‌روزرسانی کامنت شماره ${updated.item_no} برای مدرک ${updated.doc_number} (وضعیت: ${updated.status})`,
        req.ip
      );

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در به‌روزرسانی کامنت: ${e.message}` });
    }
  });

  app.delete('/api/edms/comments/:id', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const id = Number(req.params.id);
      const success = db.deleteEDMSComment(id);
      if (!success) {
        return res.status(404).json({ error: 'کامنت یافت نشد.' });
      }

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_DELETE_COMMENT',
        `حذف ردیف کامنت با شناسه ${id}`,
        req.ip
      );

      res.json({ success: true, message: 'کامنت با موفقیت حذف گردید.' });
    } catch (e: any) {
      res.status(500).json({ error: `خطا در حذف کامنت: ${e.message}` });
    }
  });

  // 7. AI Document Review & Engineering Checklist Generator
  app.post('/api/edms/ai-review', authenticateToken, async (req, res) => {
    try {
      const { doc_number, title, discipline, doc_type, current_revision } = req.body;
      const aiConfig = db.getAIConfig();
      const apiKey = process.env.GEMINI_API_KEY || aiConfig.api_key;

      if (!apiKey) {
        return res.json({
          checklist: [
            'بررسی انطباق مدرک با استانداردهای NFPA 72 و NFPA 2001 و IPS',
            'کنترل انطباق تگ نامبرها با دیاگرام P&ID و لاجیک دیاگرام C&E',
            'بررسی کادربندی استاندارد، درج شماره مدرک کارفرما و پیمانکار و مشخصات رویژن',
            'اطمینان از الصاق کامل مدارک مرجع و جدول تغییرات نسبت به رویژن قبلی'
          ],
          standardReferences: ['NFPA 72', 'NFPA 2001', 'IPS-E-PR-440', 'API RP 14C'],
          reviewTips: 'پیش از صدور نهایی جهت کارفرما (IFA)، جدول بازنگری و پاسخ به کلیه کامنت‌های قبلی (CRS) را پیوست نمایید.'
        });
      }

      const prompt = `
شما سرپرست ارشد مهندسی کنترل مدارک (Lead DCC Engineer) در پروژه نفت، گاز، پتروشیمی و سیستم‌های ایمنی Fire & Gas هستید.
مدرک مهندسی زیر در سیستم ثبت شده است:
- شماره مدرک: ${doc_number || '-'}
- عنوان مدرک: ${title || '-'}
- دیسیپلین: ${discipline || 'F&G'}
- نوع مدرک: ${doc_type || '-'}
- رویژن جاری: ${current_revision || 'Rev 0'}

لطفاً یک چک‌لیست بازبینی فنی تخصصی برای کنترل و تایید این مدرک مطابق استانداردهای بین‌المللی (NFPA, IEC, ISA, API) و استانداردهای وزارت نفت ایران (IPS) به زبان فارسی به فرمت JSON معتبر زیر ارائه دهید:
{
  "checklist": ["آیتم ۱", "آیتم ۲", "آیتم ۳", "آیتم ۴", "آیتم ۵"],
  "standardReferences": ["کد استاندارد ۱", "کد استاندارد ۲"],
  "reviewTips": "نکات کلیدی برای اخذ تاییدیه Code 1 از دستگاه نظارت"
}
پاسخ فقط و فقط شامل آبجکت JSON معتبر باشد.
`;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: aiConfig.model_name || 'gemini-2.5-flash',
        contents: prompt
      });

      const json = extractJSON(response.text || '{}');
      res.json(json);
    } catch (e: any) {
      console.error('EDMS AI Review Error:', e);
      res.json({
        checklist: [
          'بررسی تطابق عنوان و شماره سند با MDR پروژه',
          'کنترل محاسبات فنی مطابق استانداردهای NFPA',
          'بررسی اعمال کامنت‌های رویژن‌های قبلی در مدرک'
        ],
        standardReferences: ['NFPA 72', 'IPS-E-PR-440'],
        reviewTips: 'توصیه می‌شود قبل از صدور ترانزمیتال، کنترل بین‌رشته‌ای (IDC) با دیسیپلین برق و فرآیند انجام شود.'
      });
    }
  });

  // 8. S-Curve & Project Delay Analytics
  app.get('/api/edms/scurve', authenticateToken, (req, res) => {
    try {
      const data = db.getEDMSSCurveData();
      res.json(data);
    } catch (e: any) {
      console.error('EDMS S-Curve Error:', e);
      res.status(500).json({ error: `خطا در محاسبه منحنی پیشرفت S-Curve: ${e.message}` });
    }
  });

  // 9. Document Hold / Unhold Toggle
  app.post('/api/edms/documents/:id/hold', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const id = Number(req.params.id);
      const { is_hold, hold_reason } = req.body;
      const doc = db.getEDMSDocumentById(id);
      if (!doc) return res.status(404).json({ error: 'مدرک یافت نشد.' });

      const updated = db.updateEDMSDocument(id, {
        is_hold: Boolean(is_hold),
        hold_reason: is_hold ? (hold_reason || 'تعلیق به دستور کارفرما یا تغییرات فنی') : undefined,
        hold_date: is_hold ? getShamsiNow() : undefined
      });

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_HOLD_TOGGLE',
        `تغییر وضعیت Hold مدرک ${doc.doc_number} به ${is_hold ? 'معلق (Hold)' : 'فعال'}`,
        req.ip
      );

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در تغییر وضعیت تعلیق مدرک: ${e.message}` });
    }
  });

  // 10. Internal Circulation & Workflow Routes
  app.get('/api/edms/circulations', authenticateToken, (req, res) => {
    try {
      const { doc_id, step, status } = req.query;
      const list = db.getEDMSCirculations({
        doc_id: doc_id ? Number(doc_id) : undefined,
        step: step ? String(step) : undefined,
        status: status ? String(status) : undefined
      });
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در دریافت لیست دستگردانی اسناد: ${e.message}` });
    }
  });

  app.post('/api/edms/circulations', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const item = db.addEDMSCirculation(req.body);
      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_ADD_CIRCULATION',
        `ارجاع مدرک ${item.doc_number} به مرحله ${item.step} (${item.assigned_to})`,
        req.ip
      );
      res.status(201).json(item);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در ایجاد گام دستگردانی مدرک: ${e.message}` });
    }
  });

  app.put('/api/edms/circulations/:id', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const id = Number(req.params.id);
      const updated = db.updateEDMSCirculation(id, req.body);
      if (!updated) return res.status(404).json({ error: 'گام دستگردانی یافت نشد.' });

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_UPDATE_CIRCULATION',
        `به‌روزرسانی وضعیت گردش مدرک ${updated.doc_number} به ${updated.status}`,
        req.ip
      );
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در به‌روزرسانی دستگردانی: ${e.message}` });
    }
  });

  app.delete('/api/edms/circulations/:id', authenticateToken, (req, res) => {
    try {
      const id = Number(req.params.id);
      const ok = db.deleteEDMSCirculation(id);
      if (!ok) return res.status(404).json({ error: 'آیتم گردش یافت نشد.' });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: `خطا در حذف آیتم گردش: ${e.message}` });
    }
  });

  // 11. Engineering Timesheet Routes
  app.get('/api/edms/timesheets', authenticateToken, (req, res) => {
    try {
      const { doc_id } = req.query;
      const list = db.getEDMSTimesheets(doc_id ? Number(doc_id) : undefined);
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در دریافت تایم‌شیت‌های مهندسی: ${e.message}` });
    }
  });

  app.post('/api/edms/timesheets', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const { doc_id, doc_number, discipline, hours, activity_description, date } = req.body;
      if (!doc_id || !hours) {
        return res.status(400).json({ error: 'شناسه مدرک و ساعت کارکرد الزامی هستند.' });
      }

      const entry = db.addEDMSTimesheet({
        doc_id: Number(doc_id),
        doc_number: doc_number || '',
        user_id: user.id,
        username: user.username,
        discipline: discipline || 'F&G',
        date: date || getShamsiNow(),
        hours: Number(hours),
        activity_description: activity_description || ''
      });

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_LOG_TIMESHEET',
        `ثبت تایم‌شیت ${hours} ساعت برای مدرک ${doc_number}`,
        req.ip
      );

      res.status(201).json(entry);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در ثبت تایم‌شیت: ${e.message}` });
    }
  });

  // 12. Procurement Engineering (MTO / MR / TBE / TBA)
  app.get('/api/edms/procurements', authenticateToken, (req, res) => {
    try {
      const list = db.getEDMSProcurements();
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در دریافت مدارک خرید مهندسی: ${e.message}` });
    }
  });

  app.post('/api/edms/procurements', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const item = db.addEDMSProcurement(req.body);
      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_ADD_PROCUREMENT',
        `ثبت مدرک درخواست خرید (MR) شماره ${item.mr_number}`,
        req.ip
      );
      res.status(201).json(item);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در ایجاد مدرک خرید: ${e.message}` });
    }
  });

  app.put('/api/edms/procurements/:id', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const id = Number(req.params.id);
      const updated = db.updateEDMSProcurement(id, req.body);
      if (!updated) return res.status(404).json({ error: 'مدرک خرید یافت نشد.' });

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_UPDATE_PROCUREMENT',
        `به‌روزرسانی مدرک خرید ${updated.mr_number} (مرحله: ${updated.stage})`,
        req.ip
      );
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در به‌روزرسانی مدرک خرید: ${e.message}` });
    }
  });

  app.delete('/api/edms/procurements/:id', authenticateToken, (req, res) => {
    try {
      const id = Number(req.params.id);
      const ok = db.deleteEDMSProcurement(id);
      if (!ok) return res.status(404).json({ error: 'مدرک خرید یافت نشد.' });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: `خطا در حذف مدرک خرید: ${e.message}` });
    }
  });

  // 13. Knowledge Management & Lessons Learned
  app.get('/api/edms/lessons', authenticateToken, (req, res) => {
    try {
      const list = db.getEDMSLessons();
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در دریافت درس‌آموخته‌های مهندسی: ${e.message}` });
    }
  });

  app.post('/api/edms/lessons', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const lesson = db.addEDMSLesson({
        ...req.body,
        created_by: user.username
      });
      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_ADD_LESSON',
        `ثبت درس‌آموخته جدید: ${lesson.title}`,
        req.ip
      );
      res.status(201).json(lesson);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در ثبت درس‌آموخته: ${e.message}` });
    }
  });

  app.delete('/api/edms/lessons/:id', authenticateToken, (req, res) => {
    try {
      const id = Number(req.params.id);
      const ok = db.deleteEDMSLesson(id);
      if (!ok) return res.status(404).json({ error: 'درس‌آموخته یافت نشد.' });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: `خطا در حذف درس‌آموخته: ${e.message}` });
    }
  });

  // 14. CBS & Progress Billing Certificates
  app.get('/api/edms/billings', authenticateToken, (req, res) => {
    try {
      const list = db.getEDMSBillings();
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در دریافت صورت وضعیت‌های مهندسی: ${e.message}` });
    }
  });

  app.post('/api/edms/billings', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const cert = db.addEDMSBilling(req.body);
      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_ADD_BILLING',
        `ثبت صورت وضعیت دوره ${cert.period} شماره ${cert.certificate_no}`,
        req.ip
      );
      res.status(201).json(cert);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در ثبت صورت وضعیت: ${e.message}` });
    }
  });

  app.put('/api/edms/billings/:id', authenticateToken, (req, res) => {
    try {
      const user: User = (req as any).user;
      const id = Number(req.params.id);
      const updated = db.updateEDMSBilling(id, req.body);
      if (!updated) return res.status(404).json({ error: 'صورت وضعیت یافت نشد.' });

      db.addAuditLog(
        user.id,
        user.username,
        'EDMS_UPDATE_BILLING',
        `تغییر وضعیت صورت وضعیت ${updated.certificate_no} به ${updated.status}`,
        req.ip
      );
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: `خطا در به‌روزرسانی صورت وضعیت: ${e.message}` });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`F&G Equipment Server running on http://localhost:${PORT}`);
  });
}

// --- Local Helpers ---

function getShamsiNow(): string {
  const now = new Date();
  const gy = now.getFullYear();
  const gm = now.getMonth() + 1;
  const gd = now.getDate();
  
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 335];
  const leap_year = (gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0) ? 1 : 0;
  let g_day_no = g_d_m[gm - 1] + gd;
  if (leap_year && gm > 2) {
    g_day_no += 1;
  }
  let jy = gy - 621;
  let jm = 0;
  let jd = 0;
  if (g_day_no > 79) {
    g_day_no -= 79;
    if (g_day_no <= 186) {
      jm = 1 + Math.floor((g_day_no - 1) / 31);
      jd = 1 + ((g_day_no - 1) % 31);
    } else {
      g_day_no -= 186;
      jm = 7 + Math.floor((g_day_no - 1) / 30);
      jd = 1 + ((g_day_no - 1) % 30);
      jy += 1;
    }
  } else {
    jy -= 1;
    const is_leap = [1, 5, 9, 13, 17, 22, 26, 30].includes(jy % 33) ? 1 : 0;
    g_day_no += is_leap ? 287 : 286;
    if (g_day_no <= 186) {
      jm = 1 + Math.floor((g_day_no - 1) / 31);
      jd = 1 + ((g_day_no - 1) % 31);
    } else {
      g_day_no -= 186;
      jm = 7 + Math.floor((g_day_no - 1) / 30);
      jd = 1 + ((g_day_no - 1) % 30);
    }
  }
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

// Scored RAG retrieval
function retrieveMemory(query: string, systemAccess: string, priceAccess: number): string {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return "[حافظه محلی خالی است]";

  let eqList = db.getEquipment();
  let kbList = db.getKnowledgeBase();

  // Apply access boundaries
  if (systemAccess !== 'both') {
    eqList = eqList.filter(e => e.system_type === systemAccess);
    kbList = kbList.filter(k => k.system_type === systemAccess || k.system_type === 'both');
  }

  // Scored equipment
  const scoredEq = eqList.map(e => {
    const text = `${e.part_number} ${e.brand} ${e.equipment_type} ${e.technical_specifications} ${e.nfpa_reference}`.toLowerCase();
    const score = words.reduce((acc, word) => acc + (text.includes(word) ? 1 : 0), 0);
    return { score, data: e };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

  // Scored knowledge
  const scoredKb = kbList.map(k => {
    const text = `${k.concept} ${k.details} ${k.keywords}`.toLowerCase();
    const score = words.reduce((acc, word) => acc + (text.includes(word) ? 2 : 0), 0);
    return { score, data: k };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

  const contextParts: string[] = [];

  if (scoredEq.length > 0) {
    contextParts.push('### تجهیزات پیدا شده در انبار:');
    scoredEq.slice(0, 10).forEach(item => {
      const e = item.data;
      const priceStr = priceAccess === 1 ? `قیمت: ${e.price} ${e.currency}` : 'قیمت: [محرمانه]';
      contextParts.push(`- پارت‌نامبر: ${e.part_number} | برند: ${e.brand} | نوع: ${e.equipment_type} | ${priceStr} | استاندارد: ${e.nfpa_reference} | مشخصات فنی: ${e.technical_specifications}`);
    });
  }

  if (scoredKb.length > 0) {
    contextParts.push('\n### حافظه استانداردهای مهندسی و تجربی:');
    scoredKb.slice(0, 6).forEach(item => {
      contextParts.push(`- **${item.data.concept}**: ${item.data.details}`);
    });
  }

  if (contextParts.length === 0) {
    const baseline = eqList.slice(-5);
    if (baseline.length > 0) {
      return '### چند تجهیز نمونه:\n' + baseline.map(e => `- ${e.part_number} (${e.brand}) - ${e.equipment_type}`).join('\n');
    }
    return 'دیتا یافت نشد.';
  }

  return contextParts.join('\n');
}

// Call Custom OpenRouter API with SSRF check
async function queryCustomLLM(apiKey: string, baseUrl: string, model: string, systemPrompt: string, userText: string, fileBase64?: string, mimeType?: string): Promise<string> {
  if (!isSafeHttpUrl(baseUrl)) {
    throw new Error('آدرس سرور هوش مصنوعی نامعتبر یا غیرمجاز است.');
  }

  let contentPayload: any = [];

  if (userText) {
    contentPayload.push({ type: 'text', text: userText });
  }

  if (fileBase64 && mimeType && mimeType.startsWith('image/')) {
    contentPayload.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileBase64}` } });
  }

  if (contentPayload.length === 0) {
    contentPayload = userText;
  } else if (contentPayload.length === 1 && contentPayload[0].type === 'text') {
    contentPayload = userText;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contentPayload }
        ],
        temperature: 0.2
      })
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      let customErrMessage = `OpenRouter HTTP ${response.status}: ${errText}`;
      if (response.status === 429) {
        customErrMessage = `محدودیت تعداد درخواست در مدل هوش مصنوعی اعمال شده است. لطفاً چند لحظه بعد تلاش کنید.`;
      }
      throw new Error(customErrMessage);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error: any) {
    console.error('Custom LLM Call Error:', error);
    throw new Error(`خطای ارتباط با سرور هوش مصنوعی سفارشی: ${error.message}`);
  }
}

// Call Server-Side Gemini API Key
async function queryServerGemini(systemPrompt: string, userText: string, fileBase64?: string, mimeType?: string, modelName?: string, customApiKey?: string): Promise<string> {
  const geminiApiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('سیستم فاقد کلید API هوش مصنوعی است. لطفا کلید Google AI Studio خود را در پنل تنظیمات وارد کنید یا سکرت GEMINI_API_KEY را تنظیم نمایید.');
  }

  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const contents: any[] = [];
  if (userText) {
    contents.push(userText);
  }

  if (fileBase64 && mimeType) {
    contents.push({
      inlineData: {
        mimeType: mimeType,
        data: fileBase64
      }
    });
  }

  const selectedModel = (modelName && (modelName.startsWith('gemini-') || modelName.startsWith('learnlm')))
    ? modelName
    : 'gemini-3.5-flash';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2
      }
    });
    clearTimeout(timeoutId);

    return response.text || '';
  } catch (error: any) {
    console.error('Server Gemini API Error:', error);
    throw new Error(`خطای ارتباط با جمینی داخلی: ${error.message}`);
  }
}

// Robust JSON extraction and cleaning helpers
function cleanJsonString(jsonStr: string): string {
  return jsonStr
    .replace(/,\s*([\]}])/g, '$1')
    .replace(/\/\/.*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function extractJSON(text: string): any {
  const candidates: string[] = [];

  const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/gi;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    candidates.push(match[1]);
  }

  const firstBrace = text.indexOf('{');
  if (firstBrace !== -1) {
    let braceCount = 0;
    let lastBrace = -1;
    for (let i = firstBrace; i < text.length; i++) {
      if (text[i] === '{') {
        braceCount++;
      } else if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastBrace = i;
          candidates.push(text.slice(firstBrace, lastBrace + 1));
        }
      }
    }
  }

  candidates.sort((a, b) => b.length - a.length);

  for (const candidate of candidates) {
    try {
      const cleaned = cleanJsonString(candidate);
      return JSON.parse(cleaned);
    } catch (e) {
      // Continue
    }
  }

  const fallbackMatch = text.match(/(\{[\s\S]*\})/);
  if (fallbackMatch) {
    try {
      const cleaned = cleanJsonString(fallbackMatch[1]);
      return JSON.parse(cleaned);
    } catch (e) {
      // Continue
    }
  }

  throw new Error('قالب پاسخ هوش مصنوعی به صورت ساختار JSON استاندارد قابل خواندن نبود.');
}

startServer();
