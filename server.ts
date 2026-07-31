import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';
import { db, hashPassword, User, Equipment, KnowledgeBase, ChatArchive } from './server/db.js';

// Convert import.meta.url to filename if needed, but since type: module we can use it or absolute paths relative to process.cwd()
const PORT = 3000;

// Extremely robust PDF text extraction helper that handles the PDFParse class from 'pdf-parse'
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Shared folder for uploaded reference files
  const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploaded_files');
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // --- API Routes ---

  // 1. Auth Login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است.' });
    }
    const user = db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'کاربر یافت نشد یا رمز عبور اشتباه است.' });
    }
    const hashed = hashPassword(password);
    if (user.passwordHash !== hashed) {
      return res.status(401).json({ error: 'کاربر یافت نشد یا رمز عبور اشتباه است.' });
    }
    
    // Return user without password hash
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  });

  // 2. Auth Change Password
  app.post('/api/auth/change-password', (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'لطفاً تمام فیلدها را پر کنید.' });
    }
    const user = db.getUserById(Number(userId));
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }
    const currentHashed = hashPassword(currentPassword);
    if (user.passwordHash !== currentHashed) {
      return res.status(400).json({ error: 'رمز عبور فعلی اشتباه است.' });
    }

    const newHashed = hashPassword(newPassword);
    db.updateUser(user.id, { passwordHash: newHashed });
    res.json({ success: true, message: 'رمز عبور با موفقیت تغییر یافت.' });
  });

  // 3. User Management (Admin Only)
  app.get('/api/users', (req, res) => {
    const users = db.getUsers().map(({ passwordHash, ...u }) => u);
    res.json(users);
  });

  app.post('/api/users', (req, res) => {
    const { username, password, role, system_access, price_access } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'نام کاربری، رمز عبور و نقش الزامی است.' });
    }
    const existing = db.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'نام کاربری تکراری است.' });
    }
    const newUser = db.addUser({
      username,
      passwordHash: hashPassword(password),
      role,
      system_access: system_access || 'both',
      price_access: price_access ? 1 : 0
    });
    const { passwordHash, ...safeUser } = newUser;
    res.json(safeUser);
  });

  app.put('/api/users/:id', (req, res) => {
    const id = Number(req.params.id);
    const { role, system_access, price_access } = req.body;
    const user = db.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }
    if (user.username === 'admin') {
      return res.status(400).json({ error: 'ویرایش دسترسی ادمین اصلی امکان‌پذیر نیست.' });
    }
    const updated = db.updateUser(id, {
      role,
      system_access,
      price_access: price_access ? 1 : 0
    });
    res.json(updated);
  });

  app.delete('/api/users/:id', (req, res) => {
    const id = Number(req.params.id);
    const user = db.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }
    if (user.username === 'admin') {
      return res.status(400).json({ error: 'حذف کاربر ادمین اصلی سیستم امکان‌پذیر نیست.' });
    }
    db.deleteUser(id);
    res.json({ success: true });
  });

  // 4. Equipment Management (with role-based access checks)
  app.get('/api/equipment', (req, res) => {
    const system_access = req.query.system_access as string || 'both';
    const price_access = Number(req.query.price_access) || 0;

    let items = db.getEquipment();
    
    // Filter by system type access
    if (system_access !== 'both') {
      items = items.filter(e => e.system_type === system_access);
    }

    // Filter/obfuscate financial data if user doesn't have price_access
    if (price_access === 0) {
      items = items.map(e => ({
        ...e,
        price: null,
        currency: 'محرمانه'
      }));
    }

    res.json(items);
  });

  app.post('/api/equipment', (req, res) => {
    const { part_number, brand, equipment_type, price, currency, nfpa_reference, technical_specifications, system_type, created_by } = req.body;
    if (!part_number || !brand || !equipment_type) {
      return res.status(400).json({ error: 'پارت‌نامبر، برند و نوع تجهیز الزامی است.' });
    }
    
    // Check duplication
    const duplicate = db.getEquipment().find(e => e.part_number.toLowerCase() === part_number.toLowerCase());
    if (duplicate) {
      return res.status(400).json({ error: 'پارت‌نامبر وارد شده تکراری است.' });
    }

    // Convert date to Persian/Shamsi or simple local date
    const shamsiDate = getShamsiNow();
    const newItem = db.addEquipment({
      part_number,
      brand,
      equipment_type,
      price: price ? Number(price) : null,
      currency: currency || 'USD',
      nfpa_reference: nfpa_reference || '',
      technical_specifications: technical_specifications || '',
      source_file: 'manual_entry',
      system_type: system_type || 'alarm',
      created_at: shamsiDate,
      created_by: created_by || 'admin'
    });
    res.json(newItem);
  });

  // Batch / Spreadsheet Sync
  app.post('/api/equipment/sync', (req, res) => {
    const { items, system_access, price_access, username } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'اطلاعات ارسالی نامعتبر است.' });
    }

    const currentEquipment = db.getEquipment();
    const origIds = new Set(
      (system_access === 'both' ? currentEquipment : currentEquipment.filter(e => e.system_type === system_access))
        .map(e => e.id)
    );

    const newIds = new Set<number>();
    const shamsiDate = getShamsiNow();

    // Loop edited rows
    for (const row of items) {
      if (!row.part_number || !row.brand || !row.equipment_type) continue;
      
      const rowId = row.id ? Number(row.id) : null;
      const sys_t = system_access !== 'both' ? system_access : (row.system_type || 'alarm');
      const c_at = row.created_at || shamsiDate;
      const c_by = row.created_by || username || 'admin';

      if (!rowId) {
        // Insert new
        const p_val = price_access === 1 ? (row.price ? Number(row.price) : null) : null;
        const c_val = price_access === 1 ? (row.currency || 'USD') : 'USD';
        db.addEquipment({
          part_number: row.part_number,
          brand: row.brand,
          equipment_type: row.equipment_type,
          price: p_val,
          currency: c_val,
          nfpa_reference: row.nfpa_reference || '',
          technical_specifications: row.technical_specifications || '',
          source_file: row.source_file || 'manual_sync',
          system_type: sys_t,
          created_at: c_at,
          created_by: c_by
        });
      } else {
        newIds.add(rowId);
        // Update existing
        const existing = currentEquipment.find(e => e.id === rowId);
        if (existing) {
          const updates: any = {
            part_number: row.part_number,
            brand: row.brand,
            equipment_type: row.equipment_type,
            nfpa_reference: row.nfpa_reference || '',
            technical_specifications: row.technical_specifications || '',
            system_type: sys_t,
            created_at: c_at,
            created_by: c_by
          };
          
          // Only update price if has price_access
          if (price_access === 1) {
            updates.price = row.price ? Number(row.price) : null;
            updates.currency = row.currency || 'USD';
          }
          db.updateEquipment(rowId, updates);
        }
      }
    }

    // Delete removed ids within scope
    for (const oldId of origIds) {
      if (!newIds.has(oldId)) {
        db.deleteEquipment(oldId);
      }
    }

    res.json({ success: true });
  });

  // 5. Global AI Settings (Admin Only)
  app.get('/api/ai/config', (req, res) => {
    res.json(db.getAIConfig());
  });

  app.post('/api/ai/config', (req, res) => {
    const { api_key, base_url, model_name } = req.body;
    const updated = db.updateAIConfig({ api_key, base_url, model_name });
    res.json(updated);
  });

  // 6. Previous Chat Archives
  app.get('/api/chat-archives/:userId', (req, res) => {
    const userId = Number(req.params.userId);
    res.json(db.getChatArchives(userId));
  });

  app.delete('/api/chat-archives/:id', (req, res) => {
    const id = Number(req.params.id);
    db.deleteChatArchive(id);
    res.json({ success: true });
  });

  // 6.5. Documents / Archives
  app.get('/api/documents', (req, res) => {
    res.json(db.getDocumentCorpus());
  });

  app.get('/api/documents/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'فایل یافت نشد.' });
    }
    res.download(filePath, filename);
  });

  // 7. Smart AI Processing / Database feeder
  app.post('/api/ai/extract', async (req, res) => {
    const { fileBase64, fileName, mimeType, uploadCategory, username } = req.body;
    if (!fileBase64 || !fileName || !uploadCategory) {
      return res.status(400).json({ error: 'فایل ارسالی یا دسته‌بندی معتبر نیست.' });
    }

    try {
      const fileBytes = Buffer.from(fileBase64, 'base64');
      const timestampStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const safeFilename = `${timestampStr}_${fileName}`;
      const filePath = path.join(UPLOAD_DIR, safeFilename);
      
      // Save file locally
      fs.writeFileSync(filePath, fileBytes);

      let documentText = '';
      if (mimeType === 'application/pdf') {
        const parsed = await parsePdf(fileBytes);
        documentText = parsed.text;
      }

      // Query AI to parse details
      const aiConfig = db.getAIConfig();
      const prompt = `
      You are an expert F&G (Fire & Gas) engineer. Analyze the document/text and extract technical info.
      PART 1: Extract equipment belonging ONLY to the ${uploadCategory} system.
      Return a JSON list of objects: {"part_number": "...", "brand": "...", "equipment_type": "...", "price": float or null, "currency": "...", "nfpa_reference": "...", "technical_specifications": "..."}
      
      PART 2: Extract 1 to 3 high-level technical engineering rules, guidelines, or definitions from this document for the long-term memory of the AI.
      Return it inside a key "knowledge_blocks": [{"concept": "concept name", "details": "explanation of rule/standard in Persian", "keywords": "comma separated keywords"}]
      
      Return everything strictly as a single JSON object with two root keys: "equipment_list" and "knowledge_blocks".
      `;

      let rawOutput = '';
      if (aiConfig.api_key) {
        // Use custom OpenRouter / user endpoint
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
        // Fallback to Server-Side Gemini API Key
        rawOutput = await queryServerGemini(
          prompt,
          documentText,
          mimeType !== 'application/pdf' ? fileBase64 : undefined,
          mimeType !== 'application/pdf' ? mimeType : undefined
        );
      }

      // Process raw output to find JSON object robustly
      let extractedData: any;
      try {
        extractedData = extractJSON(rawOutput);
      } catch (e: any) {
        console.error('Failed to extract JSON from rawOutput:', e, rawOutput);
        return res.status(500).json({ 
          error: `فرمت خروجی مدل هوش مصنوعی معتبر نبود یا کدهای اضافی مانع استخراج شدند: ${e.message}`, 
          rawOutput 
        });
      }

      const equipmentList = extractedData.equipment_list || [];
      const knowledgeBlocks = extractedData.knowledge_blocks || [];

      // Save to database
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
          created_by: username || 'admin'
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

      // Store corpus
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

  // 8. RAG + Engineering Assistant Chat
  app.post('/api/ai/chat', async (req, res) => {
    console.log('[API] /api/ai/chat hit with query:', req.body.query);
    const { userId, query, history, systemAccess, priceAccess, fileBase64, mimeType, chatId } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'سوال نامعتبر است.' });
    }

    try {
      // 1. RAG Memory Search
      const context = retrieveMemory(query, systemAccess, Number(priceAccess));

      // 2. Formulate Prompt
      let priceConstraint = '';
      if (Number(priceAccess) === 0) {
        priceConstraint = 'هشدار مهم: شما تحت هیچ شرایطی اجازه ندارید قیمت یا اطلاعات مالی تجهیزات را به کاربر اعلام کنید. قیمت‌ها برای او محرمانه است!';
      }

      const systemPrompt = `شما یک دستیار مهندسی مجرب و کارشناس سیستم‌های اعلام و اطفاء حریق (F&G) هستید. به کاربر به زبان فارسی پاسخ فنی، شیوا و بسیار حرفه‌ای ارائه دهید.
      بر اساس حافظه زیر و دانش مهندسی خود به سوال پاسخ دهید.
      ${priceConstraint}
      
      [حافظه محلی مرتبط]:
      ${context}`;

      const aiConfig = db.getAIConfig();
      let responseText = '';

      // Prepare attachment if any
      let attachedText = '';
      if (fileBase64 && mimeType === 'application/pdf') {
        const fileBytes = Buffer.from(fileBase64, 'base64');
        const parsed = await parsePdf(fileBytes);
        attachedText = `\n\n[متن سند پیوست شده توسط کاربر]:\n${parsed.text}`;
      }

      const userMessage = query + attachedText;

      // Clean history for the LLM API format (role, content)
      const formattedHistory = (history || []).map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

      if (aiConfig.api_key) {
        // Query OpenRouter
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
        // Query server-side Gemini fallback
        responseText = await queryServerGemini(
          systemPrompt + '\n\nHistory and custom context handled.',
          userMessage,
          fileBase64 && mimeType !== 'application/pdf' ? fileBase64 : undefined,
          mimeType !== 'application/pdf' ? mimeType : undefined
        );
      }

      // Add to archive
      const currentHistory = [...(history || []), { role: 'user', content: query }, { role: 'assistant', content: responseText }];
      
      let finalChatId = chatId;
      if (!chatId) {
        const newArchive = db.addChatArchive(Number(userId), query.slice(0, 30), currentHistory);
        finalChatId = newArchive.id;
      } else {
        db.updateChatArchive(chatId, currentHistory);
      }

      res.json({
        chatId: finalChatId,
        response: responseText,
        history: currentHistory
      });

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: `خطای دستیار هوش مصنوعی: ${e.message}` });
    }
  });


  // --- Vite Dev Server & Static Server Setup ---

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

  // Formatting response
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
    // Return baseline top items if nothing found
    const baseline = eqList.slice(-5);
    if (baseline.length > 0) {
      return '### چند تجهیز نمونه:\n' + baseline.map(e => `- ${e.part_number} (${e.brand}) - ${e.equipment_type}`).join('\n');
    }
    return 'دیتا یافت نشد.';
  }

  return contextParts.join('\n');
}

// Call Custom OpenRouter API
async function queryCustomLLM(apiKey: string, baseUrl: string, model: string, systemPrompt: string, userText: string, fileBase64?: string, mimeType?: string): Promise<string> {
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
        customErrMessage = `شما به محدودیت درخواست‌ها (Rate Limit) برای مدل رایگان OpenRouter رسیده‌اید. لطفاً چند دقیقه صبر کنید یا از کلید اختصاصی خود استفاده کنید. در غیر این صورت، تنظیمات هوش مصنوعی (API Key) را پاک کنید تا از مدل پیش‌فرض سیستم استفاده شود.`;
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
async function queryServerGemini(systemPrompt: string, userText: string, fileBase64?: string, mimeType?: string): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('سیستم فاقد کلید API هوش مصنوعی است. لطفا در پنل تنظیمات یا سکرت کلید GEMINI_API_KEY را تنظیم کنید.');
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

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
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
    .replace(/,\s*([\]}])/g, '$1') // Remove trailing commas
    .replace(/\/\/.*/g, '') // Remove single line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments
}

function extractJSON(text: string): any {
  const candidates: string[] = [];

  // 1. Match markdown code blocks
  const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/gi;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    candidates.push(match[1]);
  }

  // 2. Scan for nested curly brace objects
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

  // Sort candidates by length descending to process the most complete JSON candidate first
  candidates.sort((a, b) => b.length - a.length);

  for (const candidate of candidates) {
    try {
      const cleaned = cleanJsonString(candidate);
      return JSON.parse(cleaned);
    } catch (e) {
      // Continue to next candidate
    }
  }

  // Fallback to match anything between first { and last }
  const fallbackMatch = text.match(/(\{[\s\S]*\})/);
  if (fallbackMatch) {
    try {
      const cleaned = cleanJsonString(fallbackMatch[1]);
      return JSON.parse(cleaned);
    } catch (e) {
      // Continue
    }
  }

  throw new Error('Could not find or parse valid JSON from AI response');
}

startServer();
