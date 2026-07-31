import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Exact PBKDF2 SHA-256 hashing matching Python
export function hashPassword(password: string): string {
  const salt = Buffer.from("fg_equipment_secure_salt_v2_key");
  const iterations = 100000;
  const keylen = 32;
  const digest = 'sha256';
  return crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
}

export interface User {
  id: number;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
  system_access: 'alarm' | 'fighting' | 'both';
  price_access: number; // 0 or 1
}

export interface Equipment {
  id: number;
  part_number: string;
  brand: string;
  equipment_type: string;
  price: number | null;
  currency: string;
  nfpa_reference: string;
  technical_specifications: string;
  source_file: string;
  system_type: 'alarm' | 'fighting';
  created_at: string;
  created_by: string;
}

export interface KnowledgeBase {
  id: number;
  source_file: string;
  system_type: 'alarm' | 'fighting' | 'both';
  concept: string;
  details: string;
  keywords: string;
}

export interface DocumentCorpus {
  id: number;
  file_name: string;
  extracted_text: string;
}

export interface ChatArchive {
  id: number;
  user_id: number;
  title: string;
  history: any[]; // JSON array of messages
  updated_at: string;
}

export interface AIConfig {
  api_key: string;
  base_url: string;
  model_name: string;
}

export interface DatabaseSchema {
  users: User[];
  equipment: Equipment[];
  knowledge_base: KnowledgeBase[];
  document_corpus: DocumentCorpus[];
  chat_archives: ChatArchive[];
  ai_config: AIConfig;
}

const defaultDatabase: DatabaseSchema = {
  users: [
    {
      id: 1,
      username: 'admin',
      passwordHash: hashPassword('12345'),
      role: 'admin',
      system_access: 'both',
      price_access: 1,
    }
  ],
  equipment: [
    {
      id: 1,
      part_number: 'FX-350',
      brand: 'Notifier',
      equipment_type: 'پنل مرکزی اعلام حریق',
      price: 1250.00,
      currency: 'USD',
      nfpa_reference: 'NFPA 72',
      technical_specifications: 'پنل مرکزی آدرس‌پذیر اعلام حریق دارای صفحه نمایش ال‌سی‌دی و پشتیبانی از دو لوپ آدرس‌پذیر مجزا.',
      source_file: 'notifier_datasheet.pdf',
      system_type: 'alarm',
      created_at: '1405/04/10',
      created_by: 'admin'
    },
    {
      id: 2,
      part_number: 'FM-200-CYL',
      brand: 'Fike',
      equipment_type: 'سیلندر اطفاء حریق گازی',
      price: 3400.00,
      currency: 'USD',
      nfpa_reference: 'NFPA 2001',
      technical_specifications: 'سیلندر اطفاء حریق با گاز تمیز FM-200 حجم ۸۰ لیتر تحت فشار ۲۵ بار به همراه شیر برقی کنترل خودکار.',
      source_file: 'fike_fm200_spec.pdf',
      system_type: 'fighting',
      created_at: '1405/04/10',
      created_by: 'admin'
    }
  ],
  knowledge_base: [
    {
      id: 1,
      source_file: 'system_init',
      system_type: 'alarm',
      concept: 'نصب دتکتور دودی بر اساس NFPA 72',
      details: 'دتکتورهای دودی نقطه‌ای باید در فواصل افقی حداکثر ۹ متری (۳۰ فوت) از یکدیگر نصب گردند. در سقف‌های شیب‌دار فواصل نصب تغییر می‌کند.',
      keywords: 'دتکتور, دودی, فاصله, nfpa 72, سقف'
    },
    {
      id: 2,
      source_file: 'system_init',
      system_type: 'fighting',
      concept: 'زمان تخلیه مجاز گاز اطفاء FM-200 بر اساس NFPA 2001',
      details: 'سیستم‌های اطفاء با گازهای تمیز (Clean Agent) نظیر FM-200 باید به گونه‌ای طراحی شوند که کل حجم گاز ظرف حداکثر ۱۰ ثانیه تخلیه و غلظت طراحی ایجاد گردد.',
      keywords: 'تخلیه, گاز, fm-200, ثانیه, غلظت, nfpa 2001'
    }
  ],
  document_corpus: [],
  chat_archives: [],
  ai_config: {
    api_key: '',
    base_url: 'https://openrouter.ai/api/v1',
    model_name: 'google/gemma-4-31b-it:free'
  }
};

class FileDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = { ...defaultDatabase };
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        // Ensure standard structure is always present
        if (!this.data.users) this.data.users = [...defaultDatabase.users];
        if (!this.data.equipment) this.data.equipment = [...defaultDatabase.equipment];
        if (!this.data.knowledge_base) this.data.knowledge_base = [...defaultDatabase.knowledge_base];
        if (!this.data.document_corpus) this.data.document_corpus = [];
        if (!this.data.chat_archives) this.data.chat_archives = [];
        if (!this.data.ai_config) this.data.ai_config = { ...defaultDatabase.ai_config };
      } else {
        this.save();
      }
    } catch (error) {
      console.error('Error loading database, using default values', error);
      this.data = { ...defaultDatabase };
    }
  }

  public save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving database', error);
    }
  }

  // Users Helpers
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: number): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getUserByUsername(username: string): User | undefined {
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  public addUser(user: Omit<User, 'id'>): User {
    const newId = this.data.users.reduce((max, u) => u.id > max ? u.id : max, 0) + 1;
    const newUser: User = { ...user, id: newId };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  public updateUser(id: number, updates: Partial<Omit<User, 'id' | 'username'>>): User | null {
    const user = this.data.users.find(u => u.id === id);
    if (!user) return null;
    Object.assign(user, updates);
    this.save();
    return user;
  }

  public deleteUser(id: number): boolean {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1 || this.data.users[idx].username === 'admin') return false;
    this.data.users.splice(idx, 1);
    this.save();
    return true;
  }

  // Equipment Helpers
  public getEquipment(): Equipment[] {
    return this.data.equipment;
  }

  public addEquipment(item: Omit<Equipment, 'id'>): Equipment {
    const newId = this.data.equipment.reduce((max, e) => e.id > max ? e.id : max, 0) + 1;
    const newItem: Equipment = { ...item, id: newId };
    this.data.equipment.push(newItem);
    this.save();
    return newItem;
  }

  public updateEquipment(id: number, updates: Partial<Omit<Equipment, 'id'>>): Equipment | null {
    const item = this.data.equipment.find(e => e.id === id);
    if (!item) return null;
    Object.assign(item, updates);
    this.save();
    return item;
  }

  public deleteEquipment(id: number): boolean {
    const idx = this.data.equipment.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this.data.equipment.splice(idx, 1);
    this.save();
    return true;
  }

  public upsertEquipmentByPartNumber(partNumber: string, item: Omit<Equipment, 'id' | 'part_number'>): Equipment {
    const idx = this.data.equipment.findIndex(e => e.part_number.toLowerCase() === partNumber.toLowerCase());
    if (idx !== -1) {
      // update
      const existing = this.data.equipment[idx];
      const updated = { ...existing, ...item };
      this.data.equipment[idx] = updated;
      this.save();
      return updated;
    } else {
      // insert
      const newId = this.data.equipment.reduce((max, e) => e.id > max ? e.id : max, 0) + 1;
      const newItem: Equipment = { ...item, part_number: partNumber, id: newId };
      this.data.equipment.push(newItem);
      this.save();
      return newItem;
    }
  }

  // KnowledgeBase Helpers
  public getKnowledgeBase(): KnowledgeBase[] {
    return this.data.knowledge_base;
  }

  public addKnowledgeBase(kb: Omit<KnowledgeBase, 'id'>): KnowledgeBase {
    const newId = this.data.knowledge_base.reduce((max, k) => k.id > max ? k.id : max, 0) + 1;
    const newKb: KnowledgeBase = { ...kb, id: newId };
    this.data.knowledge_base.push(newKb);
    this.save();
    return newKb;
  }

  // DocumentCorpus Helpers
  public getDocumentCorpus(): Omit<DocumentCorpus, 'extracted_text'>[] {
    return this.data.document_corpus.map(d => ({ id: d.id, file_name: d.file_name }));
  }

  public addDocumentCorpus(file_name: string, extracted_text: string): DocumentCorpus {
    const newId = this.data.document_corpus.reduce((max, d) => d.id > max ? d.id : max, 0) + 1;
    const dc: DocumentCorpus = { id: newId, file_name, extracted_text };
    this.data.document_corpus.push(dc);
    this.save();
    return dc;
  }

  // ChatArchives Helpers
  public getChatArchives(userId: number): ChatArchive[] {
    return this.data.chat_archives
      .filter(c => c.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  public getChatArchiveById(id: number): ChatArchive | undefined {
    return this.data.chat_archives.find(c => c.id === id);
  }

  public addChatArchive(userId: number, title: string, history: any[]): ChatArchive {
    const newId = this.data.chat_archives.reduce((max, c) => c.id > max ? c.id : max, 0) + 1;
    const newChat: ChatArchive = {
      id: newId,
      user_id: userId,
      title,
      history,
      updated_at: new Date().toISOString()
    };
    this.data.chat_archives.push(newChat);
    this.save();
    return newChat;
  }

  public updateChatArchive(id: number, history: any[]): ChatArchive | null {
    const chat = this.data.chat_archives.find(c => c.id === id);
    if (!chat) return null;
    chat.history = history;
    chat.updated_at = new Date().toISOString();
    this.save();
    return chat;
  }

  public deleteChatArchive(id: number): boolean {
    const idx = this.data.chat_archives.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.data.chat_archives.splice(idx, 1);
    this.save();
    return true;
  }

  // AI Config Helpers
  public getAIConfig(): AIConfig {
    return this.data.ai_config;
  }

  public updateAIConfig(config: Partial<AIConfig>) {
    Object.assign(this.data.ai_config, config);
    this.save();
    return this.data.ai_config;
  }
}

export const db = new FileDatabase();
