import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SECRET_FILE = path.join(DATA_DIR, '.server_secret');

// Get or initialize persistent secret for cryptographic token signing
function getServerSecret(): string {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SECRET_FILE)) {
      const secret = fs.readFileSync(SECRET_FILE, 'utf-8').trim();
      if (secret.length >= 32) return secret;
    }
    const newSecret = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(SECRET_FILE, newSecret, { mode: 0o600 });
    return newSecret;
  } catch {
    return 'fallback_fg_equipment_internal_signing_secret_key_v1';
  }
}

const SERVER_SECRET = getServerSecret();

// Exact PBKDF2 SHA-256 hashing matching existing hashes
export function hashPassword(password: string): string {
  const salt = Buffer.from("fg_equipment_secure_salt_v2_key");
  const iterations = 100000;
  const keylen = 32;
  const digest = 'sha256';
  return crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
}

// Constant-time password verification to prevent timing attacks
export function verifyPassword(password: string, storedHash: string): boolean {
  const computedHash = hashPassword(password);
  const computedBuf = Buffer.from(computedHash, 'hex');
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (computedBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(computedBuf, storedBuf);
}

// Generate signed authentication session token (HMAC-SHA256) with 7 days validity
export function generateAuthToken(user: User): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days
  const payload = Buffer.from(JSON.stringify({
    uid: user.id,
    sub: user.username,
    role: user.role,
    sys: user.system_access,
    prc: user.price_access,
    exp
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', SERVER_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

// Verify token signature, expiration and fetch real user state
export function verifyAuthToken(token: string): User | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  
  // Verify signature with constant-time comparison
  const expectedSig = crypto.createHmac('sha256', SERVER_SECRET).update(`${header}.${payload}`).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    const user = db.getUserById(data.uid);
    if (!user) return null;
    return user;
  } catch {
    return null;
  }
}

export interface User {
  id: number;
  username: string;
  passwordHash: string;
  role: 'admin' | 'manager' | 'user';
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
  drawing_ref?: string;
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
  provider?: string; // 'gemini' | 'openrouter' | 'openai' | 'claude' | 'custom'
  temperature?: number;
  max_tokens?: number;
  system_prompt_overrides?: {
    assistant?: string;
    letters?: string;
    proposals?: string;
  };
}

export interface SystemSettings {
  company_name_fa: string;
  company_name_en: string;
  company_tagline: string;
  company_phone: string;
  company_email: string;
  company_website: string;
  company_address: string;
  ceo_name: string;
  technical_manager: string;
  default_multipliers: {
    customsFactor: number;
    logisticsFactor: number;
    overheadProfit: number;
    currencyRisk: number;
    discountFactor: number;
  };
  default_proposal_terms: {
    warranty: string;
    paymentTerms: string;
    validityDays: number;
    deliveryTime: string;
  };
}

export interface AuditLog {
  id: number;
  timestamp: string;
  user_id: number;
  username: string;
  action: string;
  details: string;
  ip?: string;
}

export interface SavedProposal {
  id: number;
  projectCode: string;
  title: string;
  clientName: string;
  date: string;
  language: 'fa' | 'en';
  currency: string;
  deliveryTime: string;
  paymentTerms: string;
  validityDays: number;
  warranty: string;
  introText?: string;
  showPrices: boolean;
  showPriceAnalysis: boolean;
  templateId?: number;
  items: any[];
  created_at: string;
  created_by?: string;
}

export interface ProposalTemplate {
  id: number;
  title: string;
  description: string;
  category: 'oil_gas' | 'fast_inquiry' | 'fm200_fire_fighting' | 'alarm_system' | 'custom';
  is_default?: boolean;
  header_title: string;
  header_subtitle: string;
  intro_template: string;
  technical_notes?: string;
  boq_columns: string[];
  show_price_analysis_table: boolean;
  warranty_template: string;
  payment_terms_template: string;
  delivery_time_template: string;
  validity_template: string;
  closing_remarks?: string;
  signature_section: {
    prepared_by_title: string;
    approved_by_title: string;
    company_seal_text: string;
  };
  raw_custom_template?: string;
  created_at: string;
  created_by?: string;
}

export interface Letter {
  id: number;
  letter_number: string;
  letter_date: string;
  type: 'outgoing' | 'incoming' | 'internal';
  subject: string;
  sender: string;
  recipient: string;
  confidentiality: 'normal' | 'confidential' | 'secret';
  priority: 'normal' | 'urgent' | 'immediate';
  status: 'draft' | 'signed' | 'sent' | 'archived';
  content: string;
  attachments?: string;
  project_code?: string;
  file_name?: string;
  file_url?: string;
  file_size?: string;
  ai_analysis?: string;
  created_at: string;
  created_by?: string;
}

export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass?: string;
  from_name: string;
  from_email: string;
  reply_to?: string;
  enable_smtp: boolean;
}

export interface EmailLog {
  id: number;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  html_body?: string;
  type: 'proposal' | 'letter' | 'equipment' | 'custom' | 'notification' | 'transmittal';
  reference_id?: string | number;
  status: 'sent' | 'failed' | 'simulated';
  error_message?: string;
  sent_at: string;
  sent_by: string;
  attachments_info?: string;
}

export interface DatabaseSchema {
  users: User[];
  equipment: Equipment[];
  knowledge_base: KnowledgeBase[];
  document_corpus: DocumentCorpus[];
  chat_archives: ChatArchive[];
  proposals?: SavedProposal[];
  proposal_templates?: ProposalTemplate[];
  letters?: Letter[];
  ai_config: AIConfig;
  email_config?: EmailConfig;
  email_logs?: EmailLog[];
  system_settings?: SystemSettings;
  audit_logs?: AuditLog[];
  edms_documents?: EDMSDocument[];
  edms_revisions?: EDMSRevision[];
  edms_transmittals?: EDMSTransmittal[];
  edms_comments?: EDMSComment[];
  edms_circulations?: EDMSCirculationItem[];
  edms_timesheets?: EDMSTimesheetEntry[];
  edms_procurements?: EDMSProcurementItem[];
  edms_lessons?: EDMSLessonLearned[];
  edms_billings?: EDMSBillingCertificate[];
}

// ==================== EDMS Database Interfaces ====================

export type EDMSDocStatus = 
  | 'IFI'         // Issued For Information
  | 'IFR'         // Issued For Review / Comment
  | 'IFA'         // Issued For Approval
  | 'IFC'         // Issued For Construction
  | 'AFC'         // Approved For Construction
  | 'AS_BUILT'    // As-Built
  | 'APPROVED'    // Final Approved (Code 1)
  | 'REVISE_RESUBMIT'; // Rejected / Resubmit (Code 3)

export type EDMSReviewCode = 
  | 'Code 1'  // Approved without comments
  | 'Code 2'  // Approved as Noted
  | 'Code 3'  // Rejected / Revise and Resubmit
  | 'Code 4'  // For Information Only
  | 'Pending';

export interface EDMSDocument {
  id: number;
  doc_number: string;
  title: string;
  title_en?: string;
  project_code: string;
  project_name: string;
  discipline: 'F&G' | 'Instrumentation' | 'Electrical' | 'Mechanical' | 'Telecom' | 'Safety' | 'Process' | 'General';
  doc_type: 'DWG' | 'DSH' | 'CAL' | 'PHI' | 'C&E' | 'SCH' | 'PROC' | 'MANUAL' | 'OTHER';
  weight_factor: number;
  current_revision: string;
  current_status: EDMSDocStatus;
  progress: number;
  planned_date: string;
  actual_date?: string;
  remarks?: string;
  equipment_tags?: string[];
  file_name?: string;
  file_url?: string;
  file_size?: string;
  wbs_code?: string;
  is_hold?: boolean;
  hold_reason?: string;
  hold_date?: string;
  man_hours_plan?: number;
  man_hours_actual?: number;
  cbs_value?: number;
  feed_ref?: string;
  poi_scenario?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EDMSCirculationHistoryItem {
  id: string;
  from: string;
  to: string;
  action_type?: string;
  note: string;
  date: string;
  status: string;
}

export interface EDMSCirculationItem {
  id: number;
  doc_id: number;
  doc_number: string;
  doc_title: string;
  revision: string;
  step: 'drafting' | 'discipline_lead' | 'engineering_manager' | 'inter_discipline' | 'dcc_check' | 'client_review' | 'completed' | string;
  assigned_to: string;
  assigned_by?: string;
  assigned_role: 'Designer' | 'Lead Engineer' | 'Project Manager' | 'DCC Controller' | 'Client / Consultant' | string;
  action_type?: string;
  priority?: 'normal' | 'urgent' | 'immediate';
  start_date: string;
  due_date: string;
  completed_date?: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'delayed' | 'on_hold';
  comments?: string;
  man_hours_spent?: number;
  history?: EDMSCirculationHistoryItem[];
}

export interface EDMSTimesheetEntry {
  id: number;
  doc_id: number;
  doc_number: string;
  user_id: number;
  username: string;
  discipline: string;
  date: string;
  hours: number;
  activity_description: string;
  created_at: string;
}

export interface EDMSProcurementItem {
  id: number;
  mr_number: string;
  mto_ref?: string;
  title: string;
  discipline: string;
  estimated_cost?: number;
  target_po_date?: string;
  stage: 'MTO' | 'MR_ISSUED' | 'TBE_IN_PROGRESS' | 'TBA_APPROVED' | 'PO_PLACED';
  vendors_count: number;
  selected_vendor?: string;
  linked_equipment_tags?: string[];
  tbe_status: 'Approved' | 'Approved w/ Comments' | 'Under Clarification' | 'Pending';
  clarifications_count: number;
  remarks?: string;
  created_at: string;
}

export interface EDMSLessonLearned {
  id: number;
  doc_id?: number;
  doc_number?: string;
  project_code: string;
  category: 'Design Error' | 'Standard Non-Compliance' | 'Client Requirement' | 'Procurement Conflict' | 'Site Feedback';
  title: string;
  problem_description: string;
  root_cause: string;
  preventive_action: string;
  standards_referenced?: string[];
  created_by: string;
  created_at: string;
}

export interface EDMSBillingCertificate {
  id: number;
  certificate_no: string;
  period: string;
  project_code: string;
  total_mdr_weight: number;
  previous_progress: number;
  current_progress: number;
  period_progress: number;
  total_contract_value: number;
  certified_amount: number;
  status: 'draft' | 'submitted' | 'certified' | 'paid';
  created_at: string;
}

export interface EDMSRevision {
  id: number;
  doc_id: number;
  doc_number: string;
  revision: string;
  issue_purpose: 'IFI' | 'IFR' | 'IFA' | 'IFC' | 'AFC' | 'AS_BUILT';
  issue_date: string;
  transmittal_number?: string;
  review_code?: EDMSReviewCode;
  review_date?: string;
  reviewed_by?: string;
  revision_notes?: string;
  file_name?: string;
  file_url?: string;
  file_size?: string;
  created_by: string;
  created_at: string;
}

export interface EDMSTransmittalDocItem {
  doc_id: number;
  doc_number: string;
  doc_title: string;
  revision: string;
  copies: number;
  format: 'PDF' | 'DWG' | 'Excel' | 'Hard Copy' | 'ZIP';
  status: string;
  notes?: string;
}

export interface EDMSTransmittal {
  id: number;
  transmittal_number: string;
  transmittal_date: string;
  project_code: string;
  project_name: string;
  sender: string;
  sender_contact?: string;
  recipient: string;
  attention_to: string;
  recipient_email?: string;
  subject: string;
  transmittal_type: 'outgoing' | 'incoming';
  issue_purpose: 'IFA' | 'IFR' | 'IFC' | 'IFI' | 'AFC' | 'OTHER';
  delivery_method: 'Email' | 'Official Courier' | 'Client Portal' | 'Hand Delivered';
  documents: EDMSTransmittalDocItem[];
  remarks?: string;
  prepared_by: string;
  approved_by: string;
  status: 'draft' | 'issued' | 'acknowledged' | 'closed';
  created_at: string;
  emailed_at?: string;
}

export interface EDMSComment {
  id: number;
  doc_id: number;
  doc_number: string;
  revision: string;
  transmittal_number?: string;
  item_no: number;
  page_or_sheet: string;
  client_comment: string;
  contractor_response: string;
  status: 'open' | 'resolved' | 'pending';
  resolution_code?: 'Code 1' | 'Code 2' | 'Code 3';
  commented_by?: string;
  responded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EDMSStats {
  totalDocuments: number;
  totalTransmittals: number;
  totalRevisions: number;
  totalComments: number;
  overallProgress: number;
  disciplineCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  reviewCodeCounts: Record<string, number>;
  pendingCommentsCount: number;
}


export const defaultProposalTemplates: ProposalTemplate[] = [
  {
    id: 1,
    title: 'قالب جامع مناقصات نفت، گاز و پتروشیمی (Oil & Gas EPC Standard)',
    description: 'قالب رسمی و استاندارد مهندسی شامل رفرنس‌های نقشه DWG، تگ تجهیز، انطباق با IPS و NFPA، و تفکیک کامل ضرایب بازرگانی و گمرک.',
    category: 'oil_gas',
    is_default: true,
    header_title: 'شرکت مهندسی ایساتیس پارس تجهیز',
    header_subtitle: 'پیشنهاد فنی و مهندسی سیستم‌های اعلام و اطفاء حریق و گاز (F&G) - پروژه‌های صنعتی و نفت و گاز',
    intro_template: 'با احترام، پیرو استعلام فنی/مناقصه پروژه {{PROJECT_NAME}} (کد رفرنس: {{PROJECT_CODE}})، پیشنهاد فنی و مالی حاضر جهت تامین تجهیزات پکیج F&G مطابق با مشخصات فنی، اسناد مهندسی و الزامات استانداردهای بین‌المللی تقدیم حضور کارفرمای محترم {{CLIENT_NAME}} می‌گردد.',
    technical_notes: 'کلیه اقلام پیشنهادی دارای گواهینامه‌های معتبر بین‌المللی ATEX, FM, UL و رده ایمنی SIL-2/SIL-3 بوده و مستقیماً همراه با سرتیفیکیت کارخانه سازنده (3.1 Certificate) و گارانتی اصالت کالا ارائه می‌گردند.',
    boq_columns: ['row', 'part_number', 'dwg_tag', 'brand', 'type', 'specs', 'qty', 'unit_price', 'total_price'],
    show_price_analysis_table: true,
    warranty_template: '۱۸ ماه پس از تحویل کالا در سایت پروژه یا ۱۲ ماه پس از نصب و راه‌اندازی (هر کدام زودتر محقق گردد) به همراه ۱۰ سال تضمین تامین قطعات یدکی.',
    payment_terms_template: '۵۰٪ پیش‌پرداخت همزمان با ابلاغ قرارداد، ۴۰٪ پس از آماده‌سازی و رویت کالا در انبار/گمرک، ۱۰٪ پس از تحویل نهایی در سایت.',
    delivery_time_template: '۶ الی ۸ هفته کاری پس از دریافت پیش‌پرداخت و تایید نهایی مدارک مهندسی (Approved for Construction).',
    validity_template: '۳۰ روز تقویمی از تاریخ صدور پیشنهاد.',
    closing_remarks: 'در صورت نیاز به هرگونه جلسه شفاف‌سازی فنی (Clarification Meeting) یا ارائه مدارک تکمیلی مهندسی، کارشناسان این شرکت آماده همکاری می‌باشند.',
    signature_section: {
      prepared_by_title: 'کارشناس ارشد مهندسی فروش F&G',
      approved_by_title: 'مدیر مهندسی و بازرگانی',
      company_seal_text: 'شرکت مهندسی ایساتیس پارس تجهیز'
    },
    created_at: '2026-08-24T12:00:00.000Z',
    created_by: 'system'
  },
  {
    id: 2,
    title: 'قالب استعلام قیمت سریع بازرگانی (Fast Commercial Quotation)',
    description: 'قالب فشرده و سریع جهت صدور پیش‌فاکتورهای فوری، استعلام‌های بهای کوتاه و سفارشات خرید انبار.',
    category: 'fast_inquiry',
    is_default: false,
    header_title: 'ایساتیس پارس تجهیز - واحد بازرگانی و فروش',
    header_subtitle: 'پیش‌فاکتور و پیشنهاد قیمت اقلام اعلام و اطفاء حریق',
    intro_template: 'با سلام، عطف به درخواست استعلام بهای مورخ {{DATE}}، پیش‌فاکتور و مشخصات فنی تجهیزات درخواستی پروژه {{PROJECT_NAME}} به شرح جدول ذیل تقدیم حضور می‌گردد.',
    technical_notes: 'اقلام فوق دارای گارانتی اصالت کالا و برگه ترخیص گمرکی معتبر می‌باشند.',
    boq_columns: ['row', 'part_number', 'brand', 'type', 'qty', 'unit_price', 'total_price'],
    show_price_analysis_table: false,
    warranty_template: '۱۲ ماه گارانتی تعویض و اصالت قطعات.',
    payment_terms_template: '۱۰۰٪ تسویه نقدی همزمان با تحویل فوری اقلام در انبار.',
    delivery_time_template: 'موجود در انبار (تحویل ۲۴ الی ۴۸ ساعته) / اقلام سفارشی: ۲ الی ۳ هفته کاری.',
    validity_template: '۷ روز کاری با توجه به نوسانات نرخ ارز.',
    closing_remarks: 'پیش‌فاکتور فوق پس از واریز پیش‌پرداخت نهایی و معتبر خواهد بود.',
    signature_section: {
      prepared_by_title: 'واحد فروش و استعلام بها',
      approved_by_title: 'مدیریت مالی و فروش',
      company_seal_text: 'ایساتیس پارس تجهیز'
    },
    created_at: '2026-08-24T12:00:00.000Z',
    created_by: 'system'
  },
  {
    id: 3,
    title: 'قالب تخصصی سیستم‌های اطفاء حریق گازی (Clean Agent FM-200 / Novec 1230)',
    description: 'قالب تخصصی مهندسی اطفاء گاز پاک مطابق استاندارد NFPA 2001 به همراه مشخصات سیلندرها، محاسبات هیدرولیک و شیرهای اکچویتور.',
    category: 'fm200_fire_fighting',
    is_default: false,
    header_title: 'شرکت مهندسی ایساتیس پارس تجهیز',
    header_subtitle: 'پیشنهاد فنی و مهندسی سیستم اطفاء حریق گازی اتوماتیک Total Flooding (NFPA 2001)',
    intro_template: 'احتراماً پیشنهاد فنی-مهندسی و مالی سیستم اطفاء حریق اتوماتیک گاز پاک (HFC-227ea / FK-5-1-12) جهت حفاظت از فضاهای حساس و سرور روم‌های پروژه {{PROJECT_NAME}} (کارفرما: {{CLIENT_NAME}}) تقدیم می‌گردد.',
    technical_notes: 'طراحی هیدرولیکی بر اساس نرم‌افزار معتبر VdS/UL Approved، سیلندرهای استاندارد TPED/DOT با ضخامت بالا و شیرهای برقی سلنوئیدی مجهز به ضامن دستی و پنل‌های اطفاء حریق دوزونه (Cross-zone).',
    boq_columns: ['row', 'part_number', 'dwg_tag', 'brand', 'type', 'specs', 'qty', 'unit_price', 'total_price'],
    show_price_analysis_table: true,
    warranty_template: '۲۴ ماه گارانتی سیستم و شیرآلات و ۱۰ سال تضمین شارژ مجدد و دیسچارج گاز.',
    payment_terms_template: '۶۰٪ پیش‌پرداخت، ۳۰٪ تحویل سیلندرها و تجهیزات در محل پروژه، ۱۰٪ پس از تست عملکردی و تحویل موقت.',
    delivery_time_template: '۴ الی ۶ هفته کاری.',
    validity_template: '۲۱ روز تقویمی.',
    closing_remarks: 'تست هیدرواستاتیک و دیسچارج تحت نظارت مهندسین مجاز ایساتیس انجام خواهد پذیرفت.',
    signature_section: {
      prepared_by_title: 'مهندس طراح سیستم‌های اطفاء حریق',
      approved_by_title: 'مدیر دپارتمان سیستم‌های اطفاء',
      company_seal_text: 'ایساتیس پارس تجهیز'
    },
    created_at: '2026-08-24T12:00:00.000Z',
    created_by: 'system'
  },
  {
    id: 4,
    title: 'قالب تخصصی سیستم‌های اعلام و مانیتورینگ حریق و گاز (F&G & Addressable Fire Alarm)',
    description: 'قالب مهندسی سیستم‌های آدرس‌پذیر اعلام حریق و دتکتورهای تخصصی گاز و شعله مطابق با الزامات استانداردهای NFPA 72 و EN 54.',
    category: 'alarm_system',
    is_default: false,
    header_title: 'شرکت مهندسی ایساتیس پارس تجهیز',
    header_subtitle: 'پیشنهاد سیستم اعلام حریق آدرس‌پذیر هوشمند و آشکارسازهای حریق و گاز (F&G)',
    intro_template: 'با احترام، پروپوزال جامع طراحی و تامین سیستم اعلام حریق آدرس‌پذیر هوشمند و آشکارسازی گازهای سمی و قابل اشتعال پروژه {{PROJECT_NAME}} مطابق با الزامات استانداردهای NFPA 72 و EN 54 تقدیم حضور کارفرمای محترم {{CLIENT_NAME}} می‌گردد.',
    technical_notes: 'شامل کنترل‌پنل‌های مرکزی ماژولار با قابلیت شبکه Redundant، دتکتورهای نوری/حرارتی آدرس‌پذیر، آشکارسازهای شعله IR3 ضد انفجار (Exd) و اینترفیس‌های مانیتورینگ سیستم‌های تهویه و اطفاء.',
    boq_columns: ['row', 'part_number', 'dwg_tag', 'brand', 'type', 'specs', 'qty', 'unit_price', 'total_price'],
    show_price_analysis_table: true,
    warranty_template: '۱۸ ماه گارانتی طلایی تعویض قطعات و ۵ سال خدمات پشتیبانی نرم‌افزاری پنل.',
    payment_terms_template: '۵۰٪ پیش‌پرداخت، ۴۰٪ هنگام تحویل کالا، ۱۰٪ پس از پروگرامینگ و راه‌اندازی کامل.',
    delivery_time_template: '۳ الی ۵ هفته کاری.',
    validity_template: '۳۰ روز تقویمی.',
    closing_remarks: 'کلیه نقشه‌های سیم‌کشی لوپ، رایزر دیاگرام و جدول Cause & Effect توسط دپارتمان مهندسی تهیه می‌گردد.',
    signature_section: {
      prepared_by_title: 'مهندس ارشد اتوماسیون و F&G',
      approved_by_title: 'مدیر فنی و مهندسی',
      company_seal_text: 'ایساتیس پارس تجهیز'
    },
    created_at: '2026-08-24T12:00:00.000Z',
    created_by: 'system'
  }
];

const defaultSystemSettings: SystemSettings = {
  company_name_fa: 'شرکت مهندسی ایساتیس پارس تجهیز',
  company_name_en: 'Isatis Pars Tajhiz Engineering Co.',
  company_tagline: 'طراحی، مشاوره، تامین و اجرای سیستم‌های اعلام و اطفاء حریق تخصصی (F&G)',
  company_phone: '+98 21 88997766',
  company_email: 'info@isatis-fg.ir',
  company_website: 'www.isatis-fg.ir',
  company_address: 'تهران، خیابان ولیعصر، برج مهندسی، طبقه ۶، واحد ۶۰۲',
  ceo_name: 'مهندس حسینی',
  technical_manager: 'دپارتمان مهندسی F&G',
  default_multipliers: {
    customsFactor: 1.15,
    logisticsFactor: 1.05,
    overheadProfit: 1.20,
    currencyRisk: 1.05,
    discountFactor: 0.95
  },
  default_proposal_terms: {
    warranty: '۱۲ ماه گارانتی تعویض و ۱۰ سال خدمات پس از فروش و تامین قطعات یدکی',
    paymentTerms: '۵۰٪ پیش‌پرداخت هنگام عقد قرارداد، ۴۰٪ هنگام تحویل کالا، ۱۰٪ پس از راه‌اندازی و تایید نهایی',
    validityDays: 14,
    deliveryTime: '۴ الی ۶ هفته کاری پس از دریافت پیش‌پرداخت'
  }
};

export const defaultEmailConfig: EmailConfig = {
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: '',
  smtp_pass: '',
  from_name: 'شرکت مهندسی ایساتیس پارس تجهیز',
  from_email: 'sales@isatis-fg.ir',
  reply_to: 'info@isatis-fg.ir',
  enable_smtp: false
};

export const defaultEDMSDocuments: EDMSDocument[] = [
  {
    id: 1,
    doc_number: 'IPT-FNG-PHI-001',
    title: 'فلسفه طراحی و کنترل سیستم اعلام و اطفاء حریق و نشت گاز',
    title_en: 'Fire & Gas System Design Philosophy & Architecture',
    project_code: 'PRJ-SP14-FG',
    project_name: 'پروژه پالایشگاه فاز ۱۴ پارس جنوبی',
    discipline: 'F&G',
    doc_type: 'PHI',
    weight_factor: 10.0,
    current_revision: 'Rev 1',
    current_status: 'APPROVED',
    progress: 100,
    planned_date: '1405/02/15',
    actual_date: '1405/02/20',
    remarks: 'تایید نهایی شده با کد ۱ توسط مشاور و کارفرمای پروژه نفت و گاز',
    equipment_tags: ['FACP-01', 'FACP-02', 'ESD-01'],
    file_name: 'IPT-FNG-PHI-001_Rev1.pdf',
    created_by: 'admin',
    created_at: '2026-05-10T08:00:00.000Z',
    updated_at: '2026-06-01T10:30:00.000Z'
  },
  {
    id: 2,
    doc_number: 'IPT-FNG-CE-001',
    title: 'ماتریس علت و معلول سیستم F&G و اینترلاک‌های ایمنی',
    title_en: 'Fire & Gas Cause & Effect (C&E) Matrix',
    project_code: 'PRJ-SP14-FG',
    project_name: 'پروژه پالایشگاه فاز ۱۴ پارس جنوبی',
    discipline: 'F&G',
    doc_type: 'C&E',
    weight_factor: 12.0,
    current_revision: 'Rev 0',
    current_status: 'IFC',
    progress: 100,
    planned_date: '1405/03/01',
    actual_date: '1405/03/08',
    remarks: 'صادر شده جهت ساخت و پیکربندی لاجیک کنترل پنل (IFC)',
    equipment_tags: ['FACP-01', 'DELUGE-V01', 'FOAM-SKID-01'],
    file_name: 'IPT-FNG-CE-001_Rev0.xlsx',
    created_by: 'admin',
    created_at: '2026-05-20T09:15:00.000Z',
    updated_at: '2026-06-15T11:45:00.000Z'
  },
  {
    id: 3,
    doc_number: 'IPT-FNG-DWG-001',
    title: 'نقشه جانمایی دتکتورهای شعله و گاز واحد فرآیندی (Process Area)',
    title_en: 'F&G Detector Layout Drawing - Process & Utility Area',
    project_code: 'PRJ-SP14-FG',
    project_name: 'پروژه پالایشگاه فاز ۱۴ پارس جنوبی',
    discipline: 'F&G',
    doc_type: 'DWG',
    weight_factor: 15.0,
    current_revision: 'Rev B',
    current_status: 'IFA',
    progress: 80,
    planned_date: '1405/04/10',
    actual_date: '1405/04/14',
    remarks: 'ارسال شده جهت تایید کارفرما (IFA) با ترانزمیتال TR-IPT-FG-2026-001',
    equipment_tags: ['FD-101', 'FD-102', 'GD-101', 'GD-102'],
    file_name: 'IPT-FNG-DWG-001_RevB.dwg',
    created_by: 'admin',
    created_at: '2026-06-10T14:00:00.000Z',
    updated_at: '2026-07-05T16:20:00.000Z'
  },
  {
    id: 4,
    doc_number: 'IPT-FNG-DWG-002',
    title: 'نقشه و دیاگرام سیم‌بندی پنل اعلام حریق و لوپ‌های آدرس‌پذیر',
    title_en: 'Fire Alarm Control Panel Architecture & Wiring Diagram',
    project_code: 'PRJ-SP14-FG',
    project_name: 'پروژه پالایشگاه فاز ۱۴ پارس جنوبی',
    discipline: 'Electrical',
    doc_type: 'DWG',
    weight_factor: 10.0,
    current_revision: 'Rev 0',
    current_status: 'IFC',
    progress: 100,
    planned_date: '1405/04/25',
    actual_date: '1405/04/28',
    remarks: 'تایید نهایی جهت ساخت و سربندی کابل‌های پنل Notifier FX-350',
    equipment_tags: ['FX-350', 'LOOP-01', 'LOOP-02'],
    file_name: 'IPT-FNG-DWG-002_Rev0.pdf',
    created_by: 'admin',
    created_at: '2026-06-25T11:00:00.000Z',
    updated_at: '2026-07-15T09:30:00.000Z'
  },
  {
    id: 5,
    doc_number: 'IPT-FNG-CAL-001',
    title: 'دفترچه محاسبات هیدرولیکی سیستم اطفاء گازی FM-200 اتاق کنترل',
    title_en: 'Clean Agent FM-200 Hydraulic Flow & Battery Calculations',
    project_code: 'PRJ-SP14-FG',
    project_name: 'پروژه پالایشگاه فاز ۱۴ پارس جنوبی',
    discipline: 'Mechanical',
    doc_type: 'CAL',
    weight_factor: 8.0,
    current_revision: 'Rev A',
    current_status: 'IFR',
    progress: 60,
    planned_date: '1405/05/10',
    remarks: 'محاسبات بر مبنای NFPA 2001 و نرم‌افزار تخصصی هیدرولیک Fike',
    equipment_tags: ['FM-200-CYL', 'NOZ-01', 'NOZ-02'],
    file_name: 'IPT-FNG-CAL-001_RevA.pdf',
    created_by: 'admin',
    created_at: '2026-07-01T10:00:00.000Z',
    updated_at: '2026-07-20T14:10:00.000Z'
  },
  {
    id: 6,
    doc_number: 'IPT-FNG-DSH-001',
    title: 'مشخصات فنی و دیتاشیت مهندسی تجهیزات دتکتورهای شعله، گاز و دود',
    title_en: 'F&G Field Instruments Technical Datasheets & Certificates',
    project_code: 'PRJ-SP14-FG',
    project_name: 'پروژه پالایشگاه فاز ۱۴ پارس جنوبی',
    discipline: 'Instrumentation',
    doc_type: 'DSH',
    weight_factor: 10.0,
    current_revision: 'Rev 0',
    current_status: 'APPROVED',
    progress: 100,
    planned_date: '1405/03/15',
    actual_date: '1405/03/18',
    remarks: 'شامل استانداردهای ضدانفجار ATEX/IECEx و تاییدیه SIL-2',
    equipment_tags: ['IR3-FLAME', 'H2S-DET', 'LEL-DET'],
    file_name: 'IPT-FNG-DSH-001_Rev0.pdf',
    created_by: 'admin',
    created_at: '2026-05-25T08:30:00.000Z',
    updated_at: '2026-06-20T15:00:00.000Z'
  },
  {
    id: 7,
    doc_number: 'IPT-FNG-SCH-001',
    title: 'جدول کابل‌ها و لیست ورودی/خروجی (I/O List) کنترل پنل F&G',
    title_en: 'F&G System Cable Schedule & PLC I/O Assignment List',
    project_code: 'PRJ-SP14-FG',
    project_name: 'پروژه پالایشگاه فاز ۱۴ پارس جنوبی',
    discipline: 'Electrical',
    doc_type: 'SCH',
    weight_factor: 12.0,
    current_revision: 'Rev B',
    current_status: 'IFA',
    progress: 85,
    planned_date: '1405/05/01',
    actual_date: '1405/05/05',
    remarks: 'شامل سایز کابل‌های نسوز ضدحریق طبق BS 6387',
    equipment_tags: ['CBL-FNG-01', 'JB-FNG-101'],
    file_name: 'IPT-FNG-SCH-001_RevB.xlsx',
    created_by: 'admin',
    created_at: '2026-06-30T13:00:00.000Z',
    updated_at: '2026-07-28T17:00:00.000Z'
  },
  {
    id: 8,
    doc_number: 'IPT-FNG-PROC-001',
    title: 'دستورالعمل تست و راه‌اندازی در سایت (SAT & Pre-Commissioning Procedure)',
    title_en: 'Site Acceptance Test (SAT) & Pre-Commissioning Procedure',
    project_code: 'PRJ-SP14-FG',
    project_name: 'پروژه پالایشگاه فاز ۱۴ پارس جنوبی',
    discipline: 'Safety',
    doc_type: 'PROC',
    weight_factor: 8.0,
    current_revision: 'Rev A',
    current_status: 'IFR',
    progress: 50,
    planned_date: '1405/06/15',
    remarks: 'پروپوزال اولیه تست سایت مطابق الزامات ایمنی و بازرسی کارفرما',
    equipment_tags: ['ALL'],
    file_name: 'IPT-FNG-PROC-001_RevA.docx',
    created_by: 'admin',
    created_at: '2026-07-10T09:00:00.000Z',
    updated_at: '2026-08-01T12:00:00.000Z'
  },
  {
    id: 9,
    doc_number: 'IPT-FNG-MAN-001',
    title: 'کتابچه راهنمای بهره‌برداری، نگهداری و عیب‌یابی (O&M Manual)',
    title_en: 'Operation & Maintenance (O&M) Manual for F&G Package',
    project_code: 'PRJ-SP14-FG',
    project_name: 'پروژه پالایشگاه فاز ۱۴ پارس جنوبی',
    discipline: 'General',
    doc_type: 'MANUAL',
    weight_factor: 15.0,
    current_revision: 'Rev A',
    current_status: 'IFR',
    progress: 40,
    planned_date: '1405/07/01',
    remarks: 'در حال تکمیل توسط دپارتمان مهندسی و مستندسازی',
    equipment_tags: ['ALL'],
    file_name: 'IPT-FNG-MAN-001_RevA.pdf',
    created_by: 'admin',
    created_at: '2026-07-15T11:00:00.000Z',
    updated_at: '2026-08-05T14:30:00.000Z'
  }
];

export const defaultEDMSRevisions: EDMSRevision[] = [
  {
    id: 1,
    doc_id: 1,
    doc_number: 'IPT-FNG-PHI-001',
    revision: 'A',
    issue_purpose: 'IFR',
    issue_date: '1405/01/20',
    transmittal_number: 'TR-IPT-FG-2026-000',
    review_code: 'Code 2',
    review_date: '1405/01/28',
    reviewed_by: 'دستگاه نظارت - مهندس رضایی',
    revision_notes: 'صدور اولیه جهت بررسی و اظهار نظر مشاور',
    created_by: 'admin',
    created_at: '2026-04-09T08:00:00.000Z'
  },
  {
    id: 2,
    doc_id: 1,
    doc_number: 'IPT-FNG-PHI-001',
    revision: '0',
    issue_purpose: 'IFA',
    issue_date: '1405/02/10',
    transmittal_number: 'TR-IPT-FG-2026-001',
    review_code: 'Code 2',
    review_date: '1405/02/18',
    reviewed_by: 'دستگاه نظارت - مهندس رضایی',
    revision_notes: 'اعمال کامنت‌های Rev A و ارسال جهت تایید نهایی',
    created_by: 'admin',
    created_at: '2026-04-30T09:00:00.000Z'
  },
  {
    id: 3,
    doc_id: 1,
    doc_number: 'IPT-FNG-PHI-001',
    revision: '1',
    issue_purpose: 'AFC',
    issue_date: '1405/02/20',
    transmittal_number: 'TR-IPT-FG-2026-002',
    review_code: 'Code 1',
    review_date: '1405/02/25',
    reviewed_by: 'کارفرما - شرکت نفت و گاز',
    revision_notes: 'تایید کامل نهایی (Code 1 - Approved) جهت ساخت و اجرا',
    created_by: 'admin',
    created_at: '2026-05-10T10:00:00.000Z'
  },
  {
    id: 4,
    doc_id: 3,
    doc_number: 'IPT-FNG-DWG-001',
    revision: 'A',
    issue_purpose: 'IFR',
    issue_date: '1405/03/15',
    transmittal_number: 'TR-IPT-FG-2026-001',
    review_code: 'Code 2',
    review_date: '1405/03/25',
    reviewed_by: 'دستگاه نظارت',
    revision_notes: 'جانمایی دتکتورهای شعله در رینگ مخازن اصلاح گردد',
    created_by: 'admin',
    created_at: '2026-06-05T08:00:00.000Z'
  },
  {
    id: 5,
    doc_id: 3,
    doc_number: 'IPT-FNG-DWG-001',
    revision: 'B',
    issue_purpose: 'IFA',
    issue_date: '1405/04/14',
    transmittal_number: 'TR-IPT-FG-2026-002',
    review_code: 'Pending',
    revision_notes: 'پوشش مخروط دید دتکتورهای IR3 بازنگری و بهینه‌سازی شد',
    created_by: 'admin',
    created_at: '2026-07-05T12:00:00.000Z'
  }
];

export const defaultEDMSTransmittals: EDMSTransmittal[] = [
  {
    id: 1,
    transmittal_number: 'TR-IPT-FG-2026-001',
    transmittal_date: '1405/03/15',
    project_code: 'PRJ-SP14-FG',
    project_name: 'پروژه پالایشگاه فاز ۱۴ پارس جنوبی',
    sender: 'شرکت مهندسی ایساتیس پارس تجهیز (IPT)',
    sender_contact: 'دپارتمان مهندسی و کنترل مدارک (DCC)',
    recipient: 'شرکت مهندسی و مدیریت ساخت نفت و گاز (کارفرما)',
    attention_to: 'جناب آقای مهندس رضایی - مدیریت مهندسی برق و ابزاردقیق',
    recipient_email: 'hamedgp123@gmail.com',
    subject: 'ارسال مدارک مهندسی پکیج اعلام و اطفاء حریق جهت بررسی و اظهار نظر (Issue for Review)',
    transmittal_type: 'outgoing',
    issue_purpose: 'IFR',
    delivery_method: 'Email',
    documents: [
      {
        doc_id: 1,
        doc_number: 'IPT-FNG-PHI-001',
        doc_title: 'فلسفه طراحی و معماری سیستم اعلام و اطفاء حریق و گاز',
        revision: '0',
        copies: 1,
        format: 'PDF',
        status: 'IFR',
        notes: 'بررسی طبق استاندارد IPS-E-PR-440'
      },
      {
        doc_id: 3,
        doc_number: 'IPT-FNG-DWG-001',
        doc_title: 'نقشه جانمایی دتکتورهای شعله و گاز واحد فرآیندی',
        revision: 'A',
        copies: 1,
        format: 'PDF',
        status: 'IFR',
        notes: 'نقشه‌های اندازه A1 در فرمت اتوکد و پی‌دی‌اف'
      }
    ],
    remarks: 'خواهشمند است دستور فرمایید نظرات محترم دستگاه نظارت حداکثر ظرف مدت ۱۰ روز کاری به این شرکت منعکس گردد.',
    prepared_by: 'کارشناس DCC - مهندس محمدی',
    approved_by: 'مدیر مهندسی - مهندس کریمی',
    status: 'issued',
    created_at: '2026-06-05T09:00:00.000Z',
    emailed_at: '2026-06-05T10:15:00.000Z'
  },
  {
    id: 2,
    transmittal_number: 'TR-IPT-FG-2026-002',
    transmittal_date: '1405/04/15',
    project_code: 'PRJ-SP14-FG',
    project_name: 'پروژه پالایشگاه فاز ۱۴ پارس جنوبی',
    sender: 'شرکت مهندسی ایساتیس پارس تجهیز (IPT)',
    sender_contact: 'دپارتمان DCC',
    recipient: 'دستگاه نظارت عالیه مهندسی پالایشگاه',
    attention_to: 'سرکار خانم مهندس شریفی - رئیس کنترل مدارک کارفرما',
    recipient_email: 'hamedgp123@gmail.com',
    subject: 'ارسال نسخه‌های اصلاحی مدارک مهندسی و نقشه‌های جانمایی F&G (Issue for Approval)',
    transmittal_type: 'outgoing',
    issue_purpose: 'IFA',
    delivery_method: 'Email',
    documents: [
      {
        doc_id: 2,
        doc_number: 'IPT-FNG-CE-001',
        doc_title: 'ماتریس علت و معلول سیستم F&G',
        revision: '0',
        copies: 1,
        format: 'Excel',
        status: 'IFA',
        notes: 'اعمال اینترلاک‌های شیرهای Deluge'
      },
      {
        doc_id: 3,
        doc_number: 'IPT-FNG-DWG-001',
        doc_title: 'نقشه جانمایی دتکتورهای شعله و گاز واحد فرآیندی',
        revision: 'B',
        copies: 1,
        format: 'PDF',
        status: 'IFA',
        notes: 'انطباق مخروط دید و تست سایه'
      }
    ],
    remarks: 'همراه با برگه پاسخ به کامنت‌ها (CRS Sheet) پیوست گردید.',
    prepared_by: 'مهندس محمدی',
    approved_by: 'مهندس کریمی',
    status: 'issued',
    created_at: '2026-07-06T10:00:00.000Z'
  }
];

export const defaultEDMSComments: EDMSComment[] = [
  {
    id: 1,
    doc_id: 3,
    doc_number: 'IPT-FNG-DWG-001',
    revision: 'A',
    transmittal_number: 'TR-IPT-FG-2026-001',
    item_no: 1,
    page_or_sheet: 'Sheet 2 / Grid D-4',
    client_comment: 'زاویه دید دتکتور شعله FD-101 به دلیل وجود ساپورت لوله پیپینگ دچار انسداد موضعی شده است. محل نصب ۴۰ سانتی‌متر جابجا شود.',
    contractor_response: 'کامنت اعمال شد. ساپورت دتکتور به موقعیت Grid D-4.5 با دید باز ۳۶۰ درجه مخروطی بدون مانع منتقل گردید.',
    status: 'resolved',
    resolution_code: 'Code 1',
    commented_by: 'مهندس رضایی (دستگاه نظارت)',
    responded_by: 'مهندس کریمی (ایساتیس)',
    created_at: '2026-06-15T09:30:00.000Z',
    updated_at: '2026-06-25T14:00:00.000Z'
  },
  {
    id: 2,
    doc_id: 3,
    doc_number: 'IPT-FNG-DWG-001',
    revision: 'A',
    transmittal_number: 'TR-IPT-FG-2026-001',
    item_no: 2,
    page_or_sheet: 'Sheet 3 / Battery Limit',
    client_comment: 'فاصله دتکتورهای گاز قابل اشتعال (LEL) در نزدیکی کمپرسور گاز بر اساس IPS-E-IN-100 نباید از ۵ متر بیشتر باشد.',
    contractor_response: 'کامنت پذیرفته شد. تعداد دتکتورهای گاز LEL از ۲ عدد به ۳ عدد افزایش یافت و فواصل کمتر از ۴.۵ متر تنظیم شد.',
    status: 'resolved',
    resolution_code: 'Code 1',
    commented_by: 'مهندس رضایی',
    responded_by: 'مهندس کریمی',
    created_at: '2026-06-15T09:45:00.000Z',
    updated_at: '2026-06-25T14:15:00.000Z'
  },
  {
    id: 3,
    doc_id: 1,
    doc_number: 'IPT-FNG-PHI-001',
    revision: '0',
    transmittal_number: 'TR-IPT-FG-2026-001',
    item_no: 3,
    page_or_sheet: 'Section 4.3 - Voting Logic',
    client_comment: 'منطق رای‌گیری برای دتکتورهای شعله در زون‌های حساس پالایشگاهی ۲oo۳ (دو از سه) لحاظ شود تا از فالس آلارم جلوگیری به عمل آید.',
    contractor_response: 'منطق ۲oo۳ برای کلیه دتکتورهای شعله زون‌های کلاس ۱ دیویژن ۱ پیاده‌سازی و در دیاگرام لاجیک گنجانده شد.',
    status: 'resolved',
    resolution_code: 'Code 1',
    commented_by: 'مهندس شریفی',
    responded_by: 'مهندس کریمی',
    created_at: '2026-06-20T11:00:00.000Z',
    updated_at: '2026-06-28T16:30:00.000Z'
  },
  {
    id: 4,
    doc_id: 5,
    doc_number: 'IPT-FNG-CAL-001',
    revision: 'A',
    transmittal_number: 'TR-IPT-FG-2026-002',
    item_no: 4,
    page_or_sheet: 'Page 12 / Discharge Time',
    client_comment: 'حداکثر زمان تخلیه گاز FM-200 مطابق NFPA 2001 باید زیر ۱۰ ثانیه باشد، لطفاً منحنی افت فشار لوله‌کشی مجدداً بررسی گردد.',
    contractor_response: 'در دست بازنگری و محاسبه مجدد با نرم‌افزار هیدرولیک جهت ارائه در رویژن B.',
    status: 'pending',
    resolution_code: 'Code 2',
    commented_by: 'مهندس رضایی',
    responded_by: 'مهندس محمدی',
    created_at: '2026-07-18T10:00:00.000Z',
    updated_at: '2026-07-20T11:00:00.000Z'
  }
];

export const defaultEDMSCirculations: EDMSCirculationItem[] = [
  {
    id: 1,
    doc_id: 3,
    doc_number: 'IPT-FNG-DWG-001',
    doc_title: 'نقشه جانمایی دتکتورهای شعله و گاز واحد فرآیندی (Process Area)',
    revision: 'B',
    step: 'discipline_lead',
    assigned_to: 'admin',
    assigned_by: 'manager',
    assigned_role: 'Lead Engineer',
    action_type: 'بررسی و تایید فنی',
    priority: 'urgent',
    start_date: '1405/05/10',
    due_date: '1405/05/18',
    status: 'in_progress',
    comments: 'بررسی زاویه پوشش دتکتورهای IR3 در مجاورت فلنج‌های فشار قوی مطابق NFPA 72',
    man_hours_spent: 12,
    history: [
      {
        id: 'h-1',
        from: 'manager',
        to: 'admin',
        action_type: 'بررسی و تایید فنی',
        note: 'ارجاع اولیه جهت کنترل فنی و صحه‌گذاری زوایای دتکتورها',
        date: '1405/05/10',
        status: 'in_progress'
      }
    ]
  },
  {
    id: 2,
    doc_id: 4,
    doc_number: 'IPT-FNG-DWG-002',
    doc_title: 'نقشه و دیاگرام سیم‌بندی پنل اعلام حریق و لوپ‌های آدرس‌پذیر',
    revision: 'A',
    step: 'inter_discipline',
    assigned_to: 'manager',
    assigned_by: 'admin',
    assigned_role: 'Project Manager',
    action_type: 'هماهنگی بین‌رشته‌ای IDC',
    priority: 'normal',
    start_date: '1405/05/01',
    due_date: '1405/05/08',
    status: 'in_progress',
    comments: 'بررسی تطابق اینترلاک‌های کارت‌های شبکه F&G با سیستم اتوماسیون مرکزی برق و کنترل',
    man_hours_spent: 24,
    history: [
      {
        id: 'h-2',
        from: 'admin',
        to: 'manager',
        action_type: 'هماهنگی بین‌رشته‌ای IDC',
        note: 'لطفاً هماهنگی با دیسیپلین کنترل و تلکام را بررسی و تایید بفرمایید.',
        date: '1405/05/01',
        status: 'in_progress'
      }
    ]
  },
  {
    id: 3,
    doc_id: 5,
    doc_number: 'IPT-FNG-CAL-001',
    doc_title: 'دفترچه محاسبات هیدرولیک و سایزینگ سیلندرهای گاز اطفاء FM-200',
    revision: 'A',
    step: 'drafting',
    assigned_to: 'user',
    assigned_by: 'manager',
    assigned_role: 'Designer',
    action_type: 'اعمال کامنت‌ها و اصلاح مدارک',
    priority: 'urgent',
    start_date: '1405/05/02',
    due_date: '1405/05/10',
    status: 'in_progress',
    comments: 'اصلاح افت فشار نازل‌های اطفاء بر اساس کامنت‌های کارفرما جهت صدور رویژن B',
    man_hours_spent: 18,
    history: [
      {
        id: 'h-3',
        from: 'manager',
        to: 'user',
        action_type: 'اعمال کامنت‌ها و اصلاح مدارک',
        note: 'محاسبات پایپینگ اتاق سرور طبق کامنت مشاور آپدیت شود.',
        date: '1405/05/02',
        status: 'in_progress'
      }
    ]
  },
  {
    id: 4,
    doc_id: 2,
    doc_number: 'IPT-FNG-CE-001',
    doc_title: 'ماتریس علت و معلول سیستم F&G و اینترلاک‌های ایمنی',
    revision: '0',
    step: 'completed',
    assigned_to: 'admin',
    assigned_by: 'manager',
    assigned_role: 'DCC Controller',
    action_type: 'کنترل فرمت و صدور نهایی DCC',
    priority: 'immediate',
    start_date: '1405/03/01',
    due_date: '1405/03/08',
    completed_date: '1405/03/08',
    status: 'approved',
    comments: 'تایید نهایی و صدور رسمی نسخه IFC برای کارفرما',
    man_hours_spent: 40,
    history: [
      {
        id: 'h-4',
        from: 'manager',
        to: 'admin',
        action_type: 'کنترل فرمت و صدور نهایی DCC',
        note: 'مدرک نهایی مورد تایید است، ترانزمیتال صادر شود.',
        date: '1405/03/08',
        status: 'approved'
      }
    ]
  }
];

export const defaultEDMSTimesheets: EDMSTimesheetEntry[] = [
  {
    id: 1,
    doc_id: 3,
    doc_number: 'IPT-FNG-DWG-001',
    user_id: 1,
    username: 'admin',
    discipline: 'F&G',
    date: '1405/04/05',
    hours: 8,
    activity_description: 'جانمایی دتکتورهای شعله UV/IR در سکوی فرآیندی و بررسی مخروط پوشش زاویه‌ای',
    created_at: '2026-06-25T16:00:00.000Z'
  },
  {
    id: 2,
    doc_id: 3,
    doc_number: 'IPT-FNG-DWG-001',
    user_id: 1,
    username: 'admin',
    discipline: 'F&G',
    date: '1405/04/06',
    hours: 7,
    activity_description: 'اعمال فواصل استاندارد دتکتورهای گاز قابل اشتعال LEL مطابق IPS-E-IN-100',
    created_at: '2026-06-26T15:00:00.000Z'
  },
  {
    id: 3,
    doc_id: 5,
    doc_number: 'IPT-FNG-CAL-001',
    user_id: 1,
    username: 'admin',
    discipline: 'Mechanical',
    date: '1405/04/20',
    hours: 6.5,
    activity_description: 'محاسبات هیدرولیکی شبکه پایپینگ و سایزینگ لوله منیفولد گاز تمیز FM-200',
    created_at: '2026-07-10T14:30:00.000Z'
  },
  {
    id: 4,
    doc_id: 4,
    doc_number: 'IPT-FNG-DWG-002',
    user_id: 1,
    username: 'admin',
    discipline: 'Electrical',
    date: '1405/04/28',
    hours: 8,
    activity_description: 'طراحی نقشه مدارات حلقوی Class A و محاسبات افت ولتاژ لوپ آدرس‌پذیر',
    created_at: '2026-07-18T17:00:00.000Z'
  }
];

export const defaultEDMSProcurements: EDMSProcurementItem[] = [
  {
    id: 1,
    mr_number: 'MR-IPT-FG-2026-001',
    mto_ref: 'MTO-IPT-FG-001_RevB',
    title: 'خرید دتکتورهای شعله مادون قرمز و فرابنفش (UV/IR) و دتکتورهای گاز LEL ضدانفجار',
    discipline: 'F&G',
    estimated_cost: 1450000000,
    target_po_date: '1405/06/30',
    stage: 'TBE_IN_PROGRESS',
    vendors_count: 3,
    selected_vendor: 'Spectrex / General Monitors',
    linked_equipment_tags: ['FD-101', 'FD-102', 'GD-101', 'GD-102'],
    tbe_status: 'Under Clarification',
    clarifications_count: 2,
    remarks: 'در حال ارزیابی فنی پیشنهادات شرکت‌های ارائه‌دهنده دتکتورهای SIL-2 و استعلام استانداردهای ATEX',
    created_at: '2026-07-01T09:00:00.000Z'
  },
  {
    id: 2,
    mr_number: 'MR-IPT-FG-2026-002',
    mto_ref: 'MTO-IPT-FG-002_RevA',
    title: 'سیلندرهای اطفاء گازی FM-200 با شیرهای اکچویتور برقی، سوئیچ فشار و نازل‌های استیل',
    discipline: 'Mechanical',
    estimated_cost: 2800000000,
    target_po_date: '1405/06/15',
    stage: 'TBA_APPROVED',
    vendors_count: 2,
    selected_vendor: 'Fike Protection Systems',
    linked_equipment_tags: ['FM-200-CYL', 'NOZZLE-01'],
    tbe_status: 'Approved',
    clarifications_count: 1,
    remarks: 'تایید فنی نهایی (TBA) توسط واحد مهندسی صادر شد و پیش‌نویس سفارش خرید (PO) به تدارکات ارسال گردید.',
    created_at: '2026-07-10T10:30:00.000Z'
  },
  {
    id: 3,
    mr_number: 'MR-IPT-FG-2026-003',
    mto_ref: 'MTO-IPT-FG-003_Rev0',
    title: 'کابل‌های نسوز نسوز ضدحریق ابزار دقیق و کنترل (Fire Resistant Cables - BS 6387 CWZ)',
    discipline: 'Electrical',
    estimated_cost: 950000000,
    target_po_date: '1405/05/30',
    stage: 'PO_PLACED',
    vendors_count: 4,
    selected_vendor: 'کابل متال / Draka',
    linked_equipment_tags: ['CBL-FNG-01', 'JB-FNG-101'],
    tbe_status: 'Approved',
    clarifications_count: 0,
    remarks: 'قرارداد خرید منعقد گردید و نمونه کابل‌ها جهت تست آزمایشگاهی به کارگاه ارسال شد.',
    created_at: '2026-06-15T08:00:00.000Z'
  }
];

export const defaultEDMSLessons: EDMSLessonLearned[] = [
  {
    id: 1,
    doc_id: 4,
    doc_number: 'IPT-FNG-DWG-002',
    project_code: 'PRJ-SP14-FG',
    category: 'Design Error',
    title: 'جداسازی سینی کابل‌های ابزار دقیق F&G از کابل‌های قدرت ولتاژ متوسط (MV)',
    problem_description: 'در فاز اولیه طراحی، سینی کابل‌های سیگنالینگ دتکتورهای گاز ۴-۲۰ میلی‌آمپر در مجاورت سینی کابل‌های الکتروموتور ۶ کیلوولت قرار گرفته بود که منجر به نویز القایی شدید گردید.',
    root_cause: 'عدم اعمال فاصله مجاز تفکیک سینی‌ها (حداقل ۶۰ سانتی‌متر) بر اساس استاندارد IPS-E-EL-100 در نقشه‌های مدلسازی سه بعدی پایپ‌رک.',
    preventive_action: 'اضافه شدن چک‌لیست بازرسی تداخلات الکتریکی و درج الزامات رعایت شیلدینگ و فاصله تفکیک کابل‌ها در رویه هماهنگی مهندسی.',
    standards_referenced: ['IPS-E-EL-100', 'IEEE 518', 'NFPA 72'],
    created_by: 'admin',
    created_at: '2026-07-12T14:00:00.000Z'
  },
  {
    id: 2,
    doc_id: 3,
    doc_number: 'IPT-FNG-DWG-001',
    project_code: 'PRJ-SP14-FG',
    category: 'Standard Non-Compliance',
    title: 'تنظیم ارتفاع نصب و پوشش زاویه‌ای دتکتورهای گاز سولفید هیدروژن (H2S) در مناطق فرآیندی',
    problem_description: 'به دلیل چگالی گاز H2S نسبت به هوا (سنگین‌تر از هوا بودن)، نصب دتکتورها در ارتفاع ۱.۸ متری باعث تاخیر در هشدار اولیه می‌گردید.',
    root_cause: 'الگوی عمومی جانمایی بدون تفکیک جرم مولکولی گاز سمی نسبت به گاز متان.',
    preventive_action: 'الزام نصب دتکتورهای گاز سمی H2S در ارتفاع ۳۰ تا ۵۰ سانتی‌متری از سطح زمین یا کف سینی مخازن فرآیندی.',
    standards_referenced: ['API RP 14C', 'ISA-TR12.13.03'],
    created_by: 'admin',
    created_at: '2026-07-18T16:20:00.000Z'
  },
  {
    id: 3,
    doc_id: 5,
    doc_number: 'IPT-FNG-CAL-001',
    project_code: 'PRJ-SP14-FG',
    category: 'Client Requirement',
    title: 'لزوم انجام آزمون یکپارچگی اتاق (Door Fan Test) قبل از راه‌اندازی سیستم گاز تمیز',
    problem_description: 'عدم درزگیری مناسب منافذ عبور کابل‌ها در اتاق سرور باعث افت سریع غلظت گاز FM-200 ظرف کمتر از ۵ دقیقه می‌شد.',
    root_cause: 'عدم هماهنگی بین تیم معماری و مهندسی اطفا در فاز اجرای فایراستاپ (Firestop Penetration Seals).',
    preventive_action: 'اضافه شدن مدرک آزمون فن تست درب به عنوان پیش‌نیاز تست تحویل سایت (SAT) در مدارک مهندسی.',
    standards_referenced: ['NFPA 2001 Appendix C', 'BS EN 15004-1'],
    created_by: 'admin',
    created_at: '2026-07-25T11:45:00.000Z'
  }
];

export const defaultEDMSBillings: EDMSBillingCertificate[] = [
  {
    id: 1,
    certificate_no: 'IPC-IPT-SP14-01',
    period: 'اردیبهشت ۱۴۰۵',
    project_code: 'PRJ-SP14-FG',
    total_mdr_weight: 100,
    previous_progress: 0,
    current_progress: 25.0,
    period_progress: 25.0,
    total_contract_value: 3600000000,
    certified_amount: 900000000,
    status: 'paid',
    created_at: '2026-05-30T10:00:00.000Z'
  },
  {
    id: 2,
    certificate_no: 'IPC-IPT-SP14-02',
    period: 'خرداد ۱۴۰۵',
    project_code: 'PRJ-SP14-FG',
    total_mdr_weight: 100,
    previous_progress: 25.0,
    current_progress: 52.0,
    period_progress: 27.0,
    total_contract_value: 3600000000,
    certified_amount: 972000000,
    status: 'paid',
    created_at: '2026-06-30T11:15:00.000Z'
  },
  {
    id: 3,
    certificate_no: 'IPC-IPT-SP14-03',
    period: 'تیر ۱۴۰۵',
    project_code: 'PRJ-SP14-FG',
    total_mdr_weight: 100,
    previous_progress: 52.0,
    current_progress: 74.5,
    period_progress: 22.5,
    total_contract_value: 3600000000,
    certified_amount: 810000000,
    status: 'certified',
    created_at: '2026-07-31T15:30:00.000Z'
  }
];

const defaultDatabase: DatabaseSchema = {
  users: [
    {
      id: 1,
      username: 'admin',
      passwordHash: hashPassword('12345'),
      role: 'admin',
      system_access: 'both',
      price_access: 1,
    },
    {
      id: 2,
      username: 'manager',
      passwordHash: hashPassword('12345'),
      role: 'manager',
      system_access: 'both',
      price_access: 1,
    },
    {
      id: 3,
      username: 'expert',
      passwordHash: hashPassword('12345'),
      role: 'user',
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
  letters: [
    {
      id: 1,
      letter_number: 'IP-LTR-1405-0101',
      letter_date: '1405/05/15',
      type: 'outgoing',
      subject: 'ارسال و تاییدیه مدارک فنی سیستم اعلام و اطفاء حریق پتروشیمی',
      sender: 'شرکت مهندسی ایساتیس پارس تجهیز',
      recipient: 'مدیریت محترم پروژه پتروشیمی پارس',
      confidentiality: 'normal',
      priority: 'urgent',
      status: 'sent',
      content: 'احتراماً، پیرو قرارداد شماره IP-2026-F&G-01 و مذاکرات صورت گرفته، بدین‌وسیله جدول مشخصات فنی، کاتالوگ‌های مرجع و مدارک طراحی اولیه سیستم‌های اعلام حریق (Fire Alarm) و اطفاء حریق گازی (FM-200) جهت بررسی و صدور تاییدیه نهایی به حضورتان ارسال می‌گردد.\n\nخواهشمند است پس از ملاحضه نسبت به ابلاغ دستور تایید مدارک اقدام فرمایید.',
      attachments: 'نقشه DWG-F&G-101، داتاشیت تجهیزات Notifier و Fike',
      project_code: 'IP-2026-F&G-01',
      created_at: '2026-08-05T10:00:00.000Z',
      created_by: 'admin'
    },
    {
      id: 2,
      letter_number: 'PARS-1405-9941',
      letter_date: '1405/05/18',
      type: 'incoming',
      subject: 'تاییدیه مشخصات فنی دتکتورهای شعله و گاز پروژه',
      sender: 'شرکت صنایع پتروشیمی پارس',
      recipient: 'شرکت مهندسی ایساتیس پارس تجهیز',
      confidentiality: 'normal',
      priority: 'normal',
      status: 'archived',
      content: 'با سلام و احترام،\nبازگشت به نامه شماره IP-LTR-1405-0101، به اطلاع می‌رساند مدارک فنی ارسال شده توسط واحد دستگاه نظارت عالیه بررسی گردید و با رعایت استانداردهای NFPA 72 و NFPA 2001 مورد تایید فنی قرار گرفت.\n\nمراتب جهت ادامه مراحل تامین تجهیزات اعلام می‌گردد.',
      attachments: 'فرم تاییدیه شماره AP-002',
      project_code: 'IP-2026-F&G-01',
      created_at: '2026-08-08T11:20:00.000Z',
      created_by: 'admin'
    }
  ],
  proposal_templates: defaultProposalTemplates,
  email_config: defaultEmailConfig,
  email_logs: [],
  ai_config: {
    api_key: '',
    base_url: 'https://generativelanguage.googleapis.com',
    model_name: 'gemini-3.8-flash'
  },
  edms_documents: defaultEDMSDocuments,
  edms_revisions: defaultEDMSRevisions,
  edms_transmittals: defaultEDMSTransmittals,
  edms_comments: defaultEDMSComments,
  edms_circulations: defaultEDMSCirculations,
  edms_timesheets: defaultEDMSTimesheets,
  edms_procurements: defaultEDMSProcurements,
  edms_lessons: defaultEDMSLessons,
  edms_billings: defaultEDMSBillings
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
        if (!this.data.users.some(u => u.role === 'manager')) {
          this.data.users.push({
            id: Math.max(0, ...this.data.users.map(u => u.id)) + 1,
            username: 'manager',
            passwordHash: hashPassword('12345'),
            role: 'manager',
            system_access: 'both',
            price_access: 1
          });
        }
        if (!this.data.users.some(u => u.username === 'expert')) {
          this.data.users.push({
            id: Math.max(0, ...this.data.users.map(u => u.id)) + 1,
            username: 'expert',
            passwordHash: hashPassword('12345'),
            role: 'user',
            system_access: 'both',
            price_access: 1
          });
        }
        if (!this.data.equipment) this.data.equipment = [...defaultDatabase.equipment];
        if (!this.data.knowledge_base) this.data.knowledge_base = [...defaultDatabase.knowledge_base];
        if (!this.data.document_corpus) this.data.document_corpus = [];
        if (!this.data.chat_archives) this.data.chat_archives = [];
        if (!this.data.proposals) this.data.proposals = [];
        if (!this.data.proposal_templates || this.data.proposal_templates.length === 0) {
          this.data.proposal_templates = [...defaultProposalTemplates];
        }
        if (!this.data.letters) this.data.letters = defaultDatabase.letters || [];
        if (!this.data.ai_config) this.data.ai_config = { ...defaultDatabase.ai_config };
        if (!this.data.email_config) this.data.email_config = { ...defaultEmailConfig };
        if (!this.data.email_logs) this.data.email_logs = [];
        if (!this.data.system_settings) this.data.system_settings = { ...defaultSystemSettings };
        if (!this.data.audit_logs) this.data.audit_logs = [];
        if (!this.data.edms_documents || this.data.edms_documents.length === 0) {
          this.data.edms_documents = [...defaultEDMSDocuments];
        }
        if (!this.data.edms_revisions || this.data.edms_revisions.length === 0) {
          this.data.edms_revisions = [...defaultEDMSRevisions];
        }
        if (!this.data.edms_transmittals || this.data.edms_transmittals.length === 0) {
          this.data.edms_transmittals = [...defaultEDMSTransmittals];
        }
        if (!this.data.edms_comments || this.data.edms_comments.length === 0) {
          this.data.edms_comments = [...defaultEDMSComments];
        }
        if (!this.data.edms_circulations || this.data.edms_circulations.length === 0) {
          this.data.edms_circulations = [...defaultEDMSCirculations];
        }
        if (!this.data.edms_timesheets || this.data.edms_timesheets.length === 0) {
          this.data.edms_timesheets = [...defaultEDMSTimesheets];
        }
        if (!this.data.edms_procurements || this.data.edms_procurements.length === 0) {
          this.data.edms_procurements = [...defaultEDMSProcurements];
        }
        if (!this.data.edms_lessons || this.data.edms_lessons.length === 0) {
          this.data.edms_lessons = [...defaultEDMSLessons];
        }
        if (!this.data.edms_billings || this.data.edms_billings.length === 0) {
          this.data.edms_billings = [...defaultEDMSBillings];
        }
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
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
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
    return this.data.knowledge_base || [];
  }

  public getKnowledgeBaseById(id: number): KnowledgeBase | undefined {
    return (this.data.knowledge_base || []).find(k => k.id === id);
  }

  public addKnowledgeBase(kb: Omit<KnowledgeBase, 'id'>): KnowledgeBase {
    if (!this.data.knowledge_base) this.data.knowledge_base = [];
    const newId = this.data.knowledge_base.reduce((max, k) => k.id > max ? k.id : max, 0) + 1;
    const newKb: KnowledgeBase = { ...kb, id: newId };
    this.data.knowledge_base.push(newKb);
    this.save();
    return newKb;
  }

  public updateKnowledgeBase(id: number, updates: Partial<KnowledgeBase>): KnowledgeBase | null {
    if (!this.data.knowledge_base) this.data.knowledge_base = [];
    const item = this.data.knowledge_base.find(k => k.id === id);
    if (!item) return null;
    Object.assign(item, updates);
    this.save();
    return item;
  }

  public deleteKnowledgeBase(id: number): boolean {
    if (!this.data.knowledge_base) this.data.knowledge_base = [];
    const idx = this.data.knowledge_base.findIndex(k => k.id === id);
    if (idx === -1) return false;
    this.data.knowledge_base.splice(idx, 1);
    this.save();
    return true;
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

  // Proposals Helpers
  public getProposals(): SavedProposal[] {
    if (!this.data.proposals) this.data.proposals = [];
    return [...this.data.proposals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getProposalById(id: number): SavedProposal | undefined {
    if (!this.data.proposals) this.data.proposals = [];
    return this.data.proposals.find(p => p.id === id);
  }

  public addProposal(prop: Omit<SavedProposal, 'id' | 'created_at'>): SavedProposal {
    if (!this.data.proposals) this.data.proposals = [];
    const newId = this.data.proposals.reduce((max, p) => p.id > max ? p.id : max, 0) + 1;
    const newProp: SavedProposal = {
      ...prop,
      id: newId,
      created_at: new Date().toISOString()
    };
    this.data.proposals.push(newProp);
    this.save();
    return newProp;
  }

  public deleteProposal(id: number): boolean {
    if (!this.data.proposals) this.data.proposals = [];
    const idx = this.data.proposals.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.data.proposals.splice(idx, 1);
    this.save();
    return true;
  }

  // Proposal Templates Helpers
  public getProposalTemplates(): ProposalTemplate[] {
    if (!this.data.proposal_templates || this.data.proposal_templates.length === 0) {
      this.data.proposal_templates = [...defaultProposalTemplates];
      this.save();
    }
    return this.data.proposal_templates;
  }

  public getProposalTemplateById(id: number): ProposalTemplate | undefined {
    return this.getProposalTemplates().find(t => t.id === id);
  }

  public addProposalTemplate(template: Omit<ProposalTemplate, 'id' | 'created_at'>): ProposalTemplate {
    if (!this.data.proposal_templates) this.data.proposal_templates = [...defaultProposalTemplates];
    const newId = this.data.proposal_templates.reduce((max, t) => t.id > max ? t.id : max, 0) + 1;
    
    // If setting as default, unset others
    if (template.is_default) {
      this.data.proposal_templates.forEach(t => t.is_default = false);
    }

    const newTemplate: ProposalTemplate = {
      ...template,
      id: newId,
      created_at: new Date().toISOString()
    };
    this.data.proposal_templates.push(newTemplate);
    this.save();
    return newTemplate;
  }

  public updateProposalTemplate(id: number, updates: Partial<ProposalTemplate>): ProposalTemplate | null {
    if (!this.data.proposal_templates) this.data.proposal_templates = [...defaultProposalTemplates];
    const template = this.data.proposal_templates.find(t => t.id === id);
    if (!template) return null;

    // If setting as default, unset others
    if (updates.is_default) {
      this.data.proposal_templates.forEach(t => {
        if (t.id !== id) t.is_default = false;
      });
    }

    Object.assign(template, updates);
    this.save();
    return template;
  }

  public deleteProposalTemplate(id: number): boolean {
    if (!this.data.proposal_templates) this.data.proposal_templates = [...defaultProposalTemplates];
    const idx = this.data.proposal_templates.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.data.proposal_templates.splice(idx, 1);
    this.save();
    return true;
  }

  // Letters Helpers
  public getLetters(): Letter[] {
    if (!this.data.letters) this.data.letters = [];
    return [...this.data.letters].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getLetterById(id: number): Letter | undefined {
    if (!this.data.letters) this.data.letters = [];
    return this.data.letters.find(l => l.id === id);
  }

  public addLetter(letter: Omit<Letter, 'id' | 'created_at'>): Letter {
    if (!this.data.letters) this.data.letters = [];
    const newId = this.data.letters.reduce((max, l) => l.id > max ? l.id : max, 0) + 1;
    const newLetter: Letter = {
      ...letter,
      id: newId,
      created_at: new Date().toISOString()
    };
    this.data.letters.push(newLetter);
    this.save();
    return newLetter;
  }

  public updateLetter(id: number, letterUpdates: Partial<Letter>): Letter | null {
    if (!this.data.letters) this.data.letters = [];
    const letter = this.data.letters.find(l => l.id === id);
    if (!letter) return null;
    Object.assign(letter, letterUpdates);
    this.save();
    return letter;
  }

  public deleteLetter(id: number): boolean {
    if (!this.data.letters) this.data.letters = [];
    const idx = this.data.letters.findIndex(l => l.id === id);
    if (idx === -1) return false;
    this.data.letters.splice(idx, 1);
    this.save();
    return true;
  }

  // AI Config Helpers
  public getAIConfig(): AIConfig {
    return this.data.ai_config;
  }

  public getSafeAIConfig(): AIConfig & { has_api_key: boolean } {
    const raw = this.data.ai_config || { api_key: '', base_url: '', model_name: '' };
    let maskedKey = '';
    if (raw.api_key && raw.api_key.length > 8) {
      maskedKey = raw.api_key.slice(0, 4) + '****' + raw.api_key.slice(-4);
    } else if (raw.api_key) {
      maskedKey = '****';
    }
    return {
      api_key: maskedKey,
      base_url: raw.base_url || '',
      model_name: raw.model_name || '',
      has_api_key: Boolean(raw.api_key && raw.api_key.trim().length > 0)
    };
  }

  public updateAIConfig(config: Partial<AIConfig>) {
    // If incoming api_key contains asterisks or is empty placeholder, don't overwrite existing valid key
    if (config.api_key && config.api_key.includes('****')) {
      delete config.api_key;
    }
    Object.assign(this.data.ai_config, config);
    this.save();
    return this.getSafeAIConfig();
  }

  // System Settings Helpers
  public getSystemSettings(): SystemSettings {
    if (!this.data.system_settings) {
      this.data.system_settings = { ...defaultSystemSettings };
      this.save();
    }
    return this.data.system_settings;
  }

  public updateSystemSettings(updates: Partial<SystemSettings>): SystemSettings {
    if (!this.data.system_settings) {
      this.data.system_settings = { ...defaultSystemSettings };
    }
    this.data.system_settings = {
      ...this.data.system_settings,
      ...updates,
      default_multipliers: {
        ...this.data.system_settings.default_multipliers,
        ...(updates.default_multipliers || {})
      },
      default_proposal_terms: {
        ...this.data.system_settings.default_proposal_terms,
        ...(updates.default_proposal_terms || {})
      }
    };
    this.save();
    return this.data.system_settings;
  }

  // Audit Logs Helpers
  public getAuditLogs(limit: number = 100): AuditLog[] {
    if (!this.data.audit_logs) this.data.audit_logs = [];
    return [...this.data.audit_logs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public addAuditLog(action: string, details: string, userId?: number, username?: string, ip?: string): AuditLog;
  public addAuditLog(userId: number, username: string, action: string, details: string, ip?: string): AuditLog;
  public addAuditLog(
    arg1: string | number,
    arg2: string,
    arg3?: string | number,
    arg4?: string,
    arg5?: string
  ): AuditLog {
    if (!this.data.audit_logs) this.data.audit_logs = [];
    const newId = this.data.audit_logs.reduce((max, l) => l.id > max ? l.id : max, 0) + 1;

    let action = '';
    let details = '';
    let userId = 0;
    let username = 'system';
    let ip: string | undefined = undefined;

    if (typeof arg1 === 'number') {
      userId = arg1;
      username = arg2;
      action = typeof arg3 === 'string' ? arg3 : '';
      details = arg4 || '';
      ip = arg5;
    } else {
      action = arg1;
      details = arg2;
      userId = typeof arg3 === 'number' ? arg3 : 0;
      username = arg4 || 'system';
      ip = arg5;
    }

    const log: AuditLog = {
      id: newId,
      timestamp: new Date().toISOString(),
      user_id: userId,
      username,
      action,
      details,
      ip
    };
    this.data.audit_logs.unshift(log);
    // Keep max 500 logs to prevent unbounded growth
    if (this.data.audit_logs.length > 500) {
      this.data.audit_logs = this.data.audit_logs.slice(0, 500);
    }
    this.save();
    return log;
  }

  // Email Config & Logs Methods
  public getInternalEmailConfig(): EmailConfig {
    return this.data.email_config || { ...defaultEmailConfig };
  }

  public getSafeEmailConfig(): EmailConfig {
    const config = this.data.email_config || { ...defaultEmailConfig };
    return {
      ...config,
      smtp_pass: config.smtp_pass ? '••••••••' : ''
    };
  }

  public updateEmailConfig(config: Partial<EmailConfig>): EmailConfig {
    const current = this.data.email_config || { ...defaultEmailConfig };
    const updated: EmailConfig = {
      ...current,
      ...config,
      // If password is masked bullet points, keep the previous password
      smtp_pass: config.smtp_pass && !config.smtp_pass.includes('••••') 
        ? config.smtp_pass 
        : current.smtp_pass
    };
    this.data.email_config = updated;
    this.save();
    return this.getSafeEmailConfig();
  }

  public getEmailLogs(): EmailLog[] {
    return this.data.email_logs || [];
  }

  public addEmailLog(log: Omit<EmailLog, 'id' | 'sent_at'> & { sent_at?: string }): EmailLog {
    if (!this.data.email_logs) this.data.email_logs = [];
    const newId = this.data.email_logs.reduce((max, l) => l.id > max ? l.id : max, 0) + 1;
    const newLog: EmailLog = {
      ...log,
      id: newId,
      sent_at: log.sent_at || new Date().toISOString()
    };
    this.data.email_logs.unshift(newLog);
    // Keep max 200 logs
    if (this.data.email_logs.length > 200) {
      this.data.email_logs = this.data.email_logs.slice(0, 200);
    }
    this.save();
    return newLog;
  }

  public clearEmailLogs(): boolean {
    this.data.email_logs = [];
    this.save();
    return true;
  }

  public deleteEmailLog(id: number): boolean {
    if (!this.data.email_logs) return false;
    const initialLen = this.data.email_logs.length;
    this.data.email_logs = this.data.email_logs.filter(l => l.id !== id);
    if (this.data.email_logs.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // ==================== EDMS (Engineering Document Management System) Helpers ====================

  public getEDMSDocuments(filters?: { project_code?: string; discipline?: string; status?: string; search?: string }): EDMSDocument[] {
    if (!this.data.edms_documents) this.data.edms_documents = [...defaultEDMSDocuments];
    let list = [...this.data.edms_documents];

    if (filters) {
      if (filters.project_code && filters.project_code !== 'all') {
        list = list.filter(d => d.project_code === filters.project_code);
      }
      if (filters.discipline && filters.discipline !== 'all') {
        list = list.filter(d => d.discipline === filters.discipline);
      }
      if (filters.status && filters.status !== 'all') {
        list = list.filter(d => d.current_status === filters.status);
      }
      if (filters.search && filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        list = list.filter(d => 
          d.doc_number.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          (d.title_en && d.title_en.toLowerCase().includes(q)) ||
          (d.remarks && d.remarks.toLowerCase().includes(q)) ||
          (d.equipment_tags && d.equipment_tags.some(tag => tag.toLowerCase().includes(q)))
        );
      }
    }

    return list.sort((a, b) => a.doc_number.localeCompare(b.doc_number));
  }

  public getEDMSDocumentById(id: number): EDMSDocument | undefined {
    if (!this.data.edms_documents) this.data.edms_documents = [...defaultEDMSDocuments];
    return this.data.edms_documents.find(d => d.id === id);
  }

  public addEDMSDocument(doc: Omit<EDMSDocument, 'id' | 'created_at' | 'updated_at'>): EDMSDocument {
    if (!this.data.edms_documents) this.data.edms_documents = [...defaultEDMSDocuments];
    const newId = this.data.edms_documents.reduce((max, d) => d.id > max ? d.id : max, 0) + 1;
    const now = new Date().toISOString();
    const newDoc: EDMSDocument = {
      ...doc,
      id: newId,
      created_at: now,
      updated_at: now
    };
    this.data.edms_documents.push(newDoc);

    // Automatically create initial revision record
    if (doc.current_revision) {
      this.addEDMSRevision({
        doc_id: newId,
        doc_number: doc.doc_number,
        revision: doc.current_revision.replace(/Rev\s*/i, ''),
        issue_purpose: (doc.current_status as any) || 'IFR',
        issue_date: doc.planned_date || new Date().toISOString().slice(0, 10),
        revision_notes: 'ایجاد و ثبت اولیه مدرک در سیستم MDR',
        created_by: doc.created_by || 'system'
      });
    }

    this.save();
    return newDoc;
  }

  public updateEDMSDocument(id: number, updates: Partial<EDMSDocument>): EDMSDocument | null {
    if (!this.data.edms_documents) this.data.edms_documents = [...defaultEDMSDocuments];
    const doc = this.data.edms_documents.find(d => d.id === id);
    if (!doc) return null;

    Object.assign(doc, updates, { updated_at: new Date().toISOString() });
    this.save();
    return doc;
  }

  public deleteEDMSDocument(id: number): boolean {
    if (!this.data.edms_documents) this.data.edms_documents = [...defaultEDMSDocuments];
    const idx = this.data.edms_documents.findIndex(d => d.id === id);
    if (idx === -1) return false;
    this.data.edms_documents.splice(idx, 1);
    if (this.data.edms_revisions) {
      this.data.edms_revisions = this.data.edms_revisions.filter(r => r.doc_id !== id);
    }
    if (this.data.edms_comments) {
      this.data.edms_comments = this.data.edms_comments.filter(c => c.doc_id !== id);
    }
    this.save();
    return true;
  }

  // EDMS Revisions Helpers
  public getEDMSRevisions(doc_id?: number): EDMSRevision[] {
    if (!this.data.edms_revisions) this.data.edms_revisions = [...defaultEDMSRevisions];
    if (doc_id) {
      return this.data.edms_revisions
        .filter(r => r.doc_id === doc_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return [...this.data.edms_revisions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addEDMSRevision(rev: Omit<EDMSRevision, 'id' | 'created_at'>): EDMSRevision {
    if (!this.data.edms_revisions) this.data.edms_revisions = [...defaultEDMSRevisions];
    const newId = this.data.edms_revisions.reduce((max, r) => r.id > max ? r.id : max, 0) + 1;
    const newRev: EDMSRevision = {
      ...rev,
      id: newId,
      created_at: new Date().toISOString()
    };
    this.data.edms_revisions.push(newRev);

    // Update parent document's current_revision and status if matching doc_id exists
    if (rev.doc_id) {
      const doc = this.getEDMSDocumentById(rev.doc_id);
      if (doc) {
        doc.current_revision = `Rev ${rev.revision.replace(/Rev\s*/i, '')}`;
        if (rev.issue_purpose) {
          doc.current_status = rev.issue_purpose as any;
        }
        doc.updated_at = new Date().toISOString();
      }
    }

    this.save();
    return newRev;
  }

  // EDMS Transmittals Helpers
  public getEDMSTransmittals(filters?: { project_code?: string; type?: string; status?: string }): EDMSTransmittal[] {
    if (!this.data.edms_transmittals) this.data.edms_transmittals = [...defaultEDMSTransmittals];
    let list = [...this.data.edms_transmittals];

    if (filters) {
      if (filters.project_code && filters.project_code !== 'all') {
        list = list.filter(t => t.project_code === filters.project_code);
      }
      if (filters.type && filters.type !== 'all') {
        list = list.filter(t => t.transmittal_type === filters.type);
      }
      if (filters.status && filters.status !== 'all') {
        list = list.filter(t => t.status === filters.status);
      }
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getEDMSTransmittalById(id: number): EDMSTransmittal | undefined {
    if (!this.data.edms_transmittals) this.data.edms_transmittals = [...defaultEDMSTransmittals];
    return this.data.edms_transmittals.find(t => t.id === id);
  }

  public addEDMSTransmittal(trans: Omit<EDMSTransmittal, 'id' | 'created_at'>): EDMSTransmittal {
    if (!this.data.edms_transmittals) this.data.edms_transmittals = [...defaultEDMSTransmittals];
    const newId = this.data.edms_transmittals.reduce((max, t) => t.id > max ? t.id : max, 0) + 1;
    const newTrans: EDMSTransmittal = {
      ...trans,
      id: newId,
      created_at: new Date().toISOString()
    };
    this.data.edms_transmittals.push(newTrans);
    this.save();
    return newTrans;
  }

  public updateEDMSTransmittal(id: number, updates: Partial<EDMSTransmittal>): EDMSTransmittal | null {
    if (!this.data.edms_transmittals) this.data.edms_transmittals = [...defaultEDMSTransmittals];
    const trans = this.data.edms_transmittals.find(t => t.id === id);
    if (!trans) return null;

    Object.assign(trans, updates);
    this.save();
    return trans;
  }

  public deleteEDMSTransmittal(id: number): boolean {
    if (!this.data.edms_transmittals) this.data.edms_transmittals = [...defaultEDMSTransmittals];
    const idx = this.data.edms_transmittals.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.data.edms_transmittals.splice(idx, 1);
    this.save();
    return true;
  }

  // EDMS Comments (CRS) Helpers
  public getEDMSComments(filters?: { doc_id?: number; status?: string; transmittal_number?: string }): EDMSComment[] {
    if (!this.data.edms_comments) this.data.edms_comments = [...defaultEDMSComments];
    let list = [...this.data.edms_comments];

    if (filters) {
      if (filters.doc_id) {
        list = list.filter(c => c.doc_id === filters.doc_id);
      }
      if (filters.status && filters.status !== 'all') {
        list = list.filter(c => c.status === filters.status);
      }
      if (filters.transmittal_number) {
        list = list.filter(c => c.transmittal_number === filters.transmittal_number);
      }
    }

    return list.sort((a, b) => a.item_no - b.item_no);
  }

  public addEDMSComment(comment: Omit<EDMSComment, 'id' | 'created_at' | 'updated_at'>): EDMSComment {
    if (!this.data.edms_comments) this.data.edms_comments = [...defaultEDMSComments];
    const newId = this.data.edms_comments.reduce((max, c) => c.id > max ? c.id : max, 0) + 1;
    const now = new Date().toISOString();
    const newComment: EDMSComment = {
      ...comment,
      id: newId,
      created_at: now,
      updated_at: now
    };
    this.data.edms_comments.push(newComment);
    this.save();
    return newComment;
  }

  public updateEDMSComment(id: number, updates: Partial<EDMSComment>): EDMSComment | null {
    if (!this.data.edms_comments) this.data.edms_comments = [...defaultEDMSComments];
    const comment = this.data.edms_comments.find(c => c.id === id);
    if (!comment) return null;

    Object.assign(comment, updates, { updated_at: new Date().toISOString() });
    this.save();
    return comment;
  }

  public deleteEDMSComment(id: number): boolean {
    if (!this.data.edms_comments) this.data.edms_comments = [...defaultEDMSComments];
    const idx = this.data.edms_comments.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.data.edms_comments.splice(idx, 1);
    this.save();
    return true;
  }

  // EDMS Overall Physical Progress & Statistics
  public getEDMSStats(): EDMSStats {
    const docs = this.data.edms_documents || defaultEDMSDocuments;
    const trans = this.data.edms_transmittals || defaultEDMSTransmittals;
    const revs = this.data.edms_revisions || defaultEDMSRevisions;
    const comments = this.data.edms_comments || defaultEDMSComments;

    // Weighted physical progress calculation
    let totalWeight = 0;
    let weightedEarned = 0;
    const disciplineCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const reviewCodeCounts: Record<string, number> = {
      'Code 1': 0,
      'Code 2': 0,
      'Code 3': 0,
      'Code 4': 0,
      'Pending': 0
    };

    docs.forEach(doc => {
      const weight = doc.weight_factor || 1;
      totalWeight += weight;
      weightedEarned += weight * ((doc.progress || 0) / 100);

      disciplineCounts[doc.discipline] = (disciplineCounts[doc.discipline] || 0) + 1;
      statusCounts[doc.current_status] = (statusCounts[doc.current_status] || 0) + 1;
    });

    revs.forEach(rev => {
      if (rev.review_code && reviewCodeCounts[rev.review_code] !== undefined) {
        reviewCodeCounts[rev.review_code]++;
      }
    });

    const overallProgress = totalWeight > 0 ? Math.round((weightedEarned / totalWeight) * 1000) / 10 : 0;
    const pendingCommentsCount = comments.filter(c => c.status !== 'resolved').length;

    return {
      totalDocuments: docs.length,
      totalTransmittals: trans.length,
      totalRevisions: revs.length,
      totalComments: comments.length,
      overallProgress,
      disciplineCounts,
      statusCounts,
      reviewCodeCounts,
      pendingCommentsCount
    };
  }

  // ==================== Afam EDMS Extended Helpers ====================

  // Circulation / Workflow
  public getEDMSCirculationById(id: number): EDMSCirculationItem | null {
    if (!this.data.edms_circulations) this.data.edms_circulations = [...defaultEDMSCirculations];
    return this.data.edms_circulations.find(c => c.id === id) || null;
  }

  public getEDMSCirculations(filters?: { doc_id?: number; step?: string; status?: string; assigned_to?: string; assigned_by?: string }): EDMSCirculationItem[] {
    if (!this.data.edms_circulations) this.data.edms_circulations = [...defaultEDMSCirculations];
    let list = [...this.data.edms_circulations];
    if (filters) {
      if (filters.doc_id) list = list.filter(c => c.doc_id === filters.doc_id);
      if (filters.step && filters.step !== 'all') list = list.filter(c => c.step === filters.step);
      if (filters.status && filters.status !== 'all') list = list.filter(c => c.status === filters.status);
      if (filters.assigned_to) {
        const target = filters.assigned_to.toLowerCase();
        list = list.filter(c => c.assigned_to?.toLowerCase() === target || c.assigned_to?.toLowerCase().includes(target));
      }
      if (filters.assigned_by) {
        const target = filters.assigned_by.toLowerCase();
        list = list.filter(c => c.assigned_by?.toLowerCase() === target || c.assigned_by?.toLowerCase().includes(target));
      }
    }
    return list;
  }

  public addEDMSCirculation(item: Omit<EDMSCirculationItem, 'id'>): EDMSCirculationItem {
    if (!this.data.edms_circulations) this.data.edms_circulations = [...defaultEDMSCirculations];
    const newId = this.data.edms_circulations.reduce((max, c) => c.id > max ? c.id : max, 0) + 1;
    const newItem: EDMSCirculationItem = { ...item, id: newId };
    this.data.edms_circulations.unshift(newItem);
    this.save();
    return newItem;
  }

  public updateEDMSCirculation(id: number, updates: Partial<EDMSCirculationItem>): EDMSCirculationItem | null {
    if (!this.data.edms_circulations) this.data.edms_circulations = [...defaultEDMSCirculations];
    const idx = this.data.edms_circulations.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.edms_circulations[idx] = { ...this.data.edms_circulations[idx], ...updates };
    this.save();
    return this.data.edms_circulations[idx];
  }

  public deleteEDMSCirculation(id: number): boolean {
    if (!this.data.edms_circulations) this.data.edms_circulations = [...defaultEDMSCirculations];
    const idx = this.data.edms_circulations.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.data.edms_circulations.splice(idx, 1);
    this.save();
    return true;
  }

  // Timesheets
  public getEDMSTimesheets(doc_id?: number): EDMSTimesheetEntry[] {
    if (!this.data.edms_timesheets) this.data.edms_timesheets = [...defaultEDMSTimesheets];
    if (doc_id) {
      return this.data.edms_timesheets.filter(t => t.doc_id === doc_id);
    }
    return [...this.data.edms_timesheets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addEDMSTimesheet(entry: Omit<EDMSTimesheetEntry, 'id' | 'created_at'>): EDMSTimesheetEntry {
    if (!this.data.edms_timesheets) this.data.edms_timesheets = [...defaultEDMSTimesheets];
    const newId = this.data.edms_timesheets.reduce((max, t) => t.id > max ? t.id : max, 0) + 1;
    const newEntry: EDMSTimesheetEntry = {
      ...entry,
      id: newId,
      created_at: new Date().toISOString()
    };
    this.data.edms_timesheets.unshift(newEntry);

    // Update document actual man-hours if doc exists
    if (entry.doc_id) {
      const doc = this.getEDMSDocumentById(entry.doc_id);
      if (doc) {
        doc.man_hours_actual = (doc.man_hours_actual || 0) + Number(entry.hours || 0);
        doc.updated_at = new Date().toISOString();
      }
    }
    this.save();
    return newEntry;
  }

  // Procurement Engineering (MTO / MR / TBE / TBA)
  public getEDMSProcurements(): EDMSProcurementItem[] {
    if (!this.data.edms_procurements) this.data.edms_procurements = [...defaultEDMSProcurements];
    return [...this.data.edms_procurements].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addEDMSProcurement(item: Omit<EDMSProcurementItem, 'id' | 'created_at'>): EDMSProcurementItem {
    if (!this.data.edms_procurements) this.data.edms_procurements = [...defaultEDMSProcurements];
    const newId = this.data.edms_procurements.reduce((max, p) => p.id > max ? p.id : max, 0) + 1;
    const newItem: EDMSProcurementItem = {
      ...item,
      id: newId,
      created_at: new Date().toISOString()
    };
    this.data.edms_procurements.unshift(newItem);
    this.save();
    return newItem;
  }

  public updateEDMSProcurement(id: number, updates: Partial<EDMSProcurementItem>): EDMSProcurementItem | null {
    if (!this.data.edms_procurements) this.data.edms_procurements = [...defaultEDMSProcurements];
    const idx = this.data.edms_procurements.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.data.edms_procurements[idx] = { ...this.data.edms_procurements[idx], ...updates };
    this.save();
    return this.data.edms_procurements[idx];
  }

  public deleteEDMSProcurement(id: number): boolean {
    if (!this.data.edms_procurements) this.data.edms_procurements = [...defaultEDMSProcurements];
    const idx = this.data.edms_procurements.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.data.edms_procurements.splice(idx, 1);
    this.save();
    return true;
  }

  // Knowledge & Lessons Learned
  public getEDMSLessons(): EDMSLessonLearned[] {
    if (!this.data.edms_lessons) this.data.edms_lessons = [...defaultEDMSLessons];
    return [...this.data.edms_lessons].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addEDMSLesson(item: Omit<EDMSLessonLearned, 'id' | 'created_at'>): EDMSLessonLearned {
    if (!this.data.edms_lessons) this.data.edms_lessons = [...defaultEDMSLessons];
    const newId = this.data.edms_lessons.reduce((max, l) => l.id > max ? l.id : max, 0) + 1;
    const newItem: EDMSLessonLearned = {
      ...item,
      id: newId,
      created_at: new Date().toISOString()
    };
    this.data.edms_lessons.unshift(newItem);
    this.save();
    return newItem;
  }

  public deleteEDMSLesson(id: number): boolean {
    if (!this.data.edms_lessons) this.data.edms_lessons = [...defaultEDMSLessons];
    const idx = this.data.edms_lessons.findIndex(l => l.id === id);
    if (idx === -1) return false;
    this.data.edms_lessons.splice(idx, 1);
    this.save();
    return true;
  }

  // CBS & Progress Billing
  public getEDMSBillings(): EDMSBillingCertificate[] {
    if (!this.data.edms_billings) this.data.edms_billings = [...defaultEDMSBillings];
    return [...this.data.edms_billings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addEDMSBilling(cert: Omit<EDMSBillingCertificate, 'id' | 'created_at'>): EDMSBillingCertificate {
    if (!this.data.edms_billings) this.data.edms_billings = [...defaultEDMSBillings];
    const newId = this.data.edms_billings.reduce((max, b) => b.id > max ? b.id : max, 0) + 1;
    const newCert: EDMSBillingCertificate = {
      ...cert,
      id: newId,
      created_at: new Date().toISOString()
    };
    this.data.edms_billings.unshift(newCert);
    this.save();
    return newCert;
  }

  public updateEDMSBilling(id: number, updates: Partial<EDMSBillingCertificate>): EDMSBillingCertificate | null {
    if (!this.data.edms_billings) this.data.edms_billings = [...defaultEDMSBillings];
    const idx = this.data.edms_billings.findIndex(b => b.id === id);
    if (idx === -1) return null;
    this.data.edms_billings[idx] = { ...this.data.edms_billings[idx], ...updates };
    this.save();
    return this.data.edms_billings[idx];
  }

  // S-Curve & Delay Analytics
  public getEDMSSCurveData() {
    const docs = this.data.edms_documents || defaultEDMSDocuments;
    const periods = [
      { name: 'فروردین', planCutoff: '1405/01/31', planned: 10, actual: 10 },
      { name: 'اردیبهشت', planCutoff: '1405/02/31', planned: 25, actual: 26 },
      { name: 'خرداد', planCutoff: '1405/03/31', planned: 45, actual: 48 },
      { name: 'تیر', planCutoff: '1405/04/31', planned: 65, actual: 68 },
      { name: 'مرداد', planCutoff: '1405/05/31', planned: 82, actual: 78 },
      { name: 'شهریور', planCutoff: '1405/06/31', planned: 95, actual: null },
      { name: 'مهر', planCutoff: '1405/07/30', planned: 100, actual: null }
    ];

    // Total plan and actual man-hours and CBS values
    let totalPlanManHours = 0;
    let totalActualManHours = 0;
    let totalCBSValue = 0;
    let earnedMonetaryValue = 0;
    let totalHoldDocs = 0;

    docs.forEach(d => {
      totalPlanManHours += d.man_hours_plan || 120;
      totalActualManHours += d.man_hours_actual || 0;
      const cbs = d.cbs_value || 400000000;
      totalCBSValue += cbs;
      earnedMonetaryValue += cbs * ((d.progress || 0) / 100);
      if (d.is_hold) totalHoldDocs++;
    });

    return {
      periods,
      totalPlanManHours,
      totalActualManHours,
      totalCBSValue,
      earnedMonetaryValue: Math.round(earnedMonetaryValue),
      totalHoldDocs,
      contractorDelayDays: 4,
      clientDelayDays: 14,
      varianceProgress: -4.0 // 78% actual vs 82% plan in Mordad
    };
  }

  // System Stats and Telemetry
  public getSystemStats() {
    let fileSizeKb = 0;
    try {
      if (fs.existsSync(DB_FILE)) {
        const stat = fs.statSync(DB_FILE);
        fileSizeKb = Math.round(stat.size / 1024);
      }
    } catch {
      fileSizeKb = 0;
    }

    const mem = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());
    const uptimeHours = Math.floor(uptimeSec / 3600);
    const uptimeMins = Math.floor((uptimeSec % 3600) / 60);

    return {
      counts: {
        equipment: (this.data.equipment || []).length,
        users: (this.data.users || []).length,
        proposals: (this.data.proposals || []).length,
        letters: (this.data.letters || []).length,
        edms_documents: (this.data.edms_documents || []).length,
        edms_transmittals: (this.data.edms_transmittals || []).length,
        edms_comments: (this.data.edms_comments || []).length,
        knowledge_base: (this.data.knowledge_base || []).length,
        documents: (this.data.document_corpus || []).length,
        chat_archives: (this.data.chat_archives || []).length,
        audit_logs: (this.data.audit_logs || []).length,
      },
      database: {
        fileSizeKb,
        path: 'data/database.json',
        status: 'online',
        lastUpdated: new Date().toISOString()
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: `${uptimeHours}h ${uptimeMins}m`,
        uptimeSeconds: uptimeSec,
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        rssMb: Math.round(mem.rss / 1024 / 1024)
      }
    };
  }

  // Full Database Backup Export
  public exportFullBackup() {
    return {
      version: '2.0.0',
      exported_at: new Date().toISOString(),
      app_name: 'Isatis Pars Tajhiz Fire & Gas System',
      data: {
        users: this.data.users,
        equipment: this.data.equipment,
        knowledge_base: this.data.knowledge_base,
        document_corpus: this.data.document_corpus,
        chat_archives: this.data.chat_archives,
        proposals: this.data.proposals || [],
        proposal_templates: this.data.proposal_templates || [],
        letters: this.data.letters || [],
        edms_documents: this.data.edms_documents || [],
        edms_revisions: this.data.edms_revisions || [],
        edms_transmittals: this.data.edms_transmittals || [],
        edms_comments: this.data.edms_comments || [],
        system_settings: this.data.system_settings || defaultSystemSettings,
        ai_config: this.getSafeAIConfig()
      }
    };
  }

  // Full Database Backup Import / Restore
  public importFullBackup(backupData: any, mode: 'merge' | 'overwrite' = 'merge'): { success: boolean; message: string; counts: Record<string, number> } {
    if (!backupData || !backupData.data) {
      throw new Error('فایل پشتیبان نامعتبر است. فیلد data یافت نشد.');
    }

    const incoming = backupData.data;
    const counts = {
      equipment: 0,
      users: 0,
      knowledge_base: 0,
      proposals: 0,
      proposal_templates: 0,
      letters: 0
    };

    if (mode === 'overwrite') {
      // Overwrite tables while safeguarding admin user and current active API key
      if (Array.isArray(incoming.users) && incoming.users.length > 0) {
        this.data.users = incoming.users;
        counts.users = incoming.users.length;
      }
      if (Array.isArray(incoming.equipment)) {
        this.data.equipment = incoming.equipment;
        counts.equipment = incoming.equipment.length;
      }
      if (Array.isArray(incoming.knowledge_base)) {
        this.data.knowledge_base = incoming.knowledge_base;
        counts.knowledge_base = incoming.knowledge_base.length;
      }
      if (Array.isArray(incoming.proposals)) {
        this.data.proposals = incoming.proposals;
        counts.proposals = incoming.proposals.length;
      }
      if (Array.isArray(incoming.proposal_templates)) {
        this.data.proposal_templates = incoming.proposal_templates;
        counts.proposal_templates = incoming.proposal_templates.length;
      }
      if (Array.isArray(incoming.letters)) {
        this.data.letters = incoming.letters;
        counts.letters = incoming.letters.length;
      }
      if (incoming.system_settings) {
        this.data.system_settings = incoming.system_settings;
      }
      // If valid API key is present in incoming without mask, update it
      if (incoming.ai_config && incoming.ai_config.api_key && !incoming.ai_config.api_key.includes('****')) {
        this.data.ai_config = incoming.ai_config;
      }
    } else {
      // Merge mode: Add unique items
      if (Array.isArray(incoming.equipment)) {
        for (const item of incoming.equipment) {
          if (item.part_number) {
            this.upsertEquipmentByPartNumber(item.part_number, item);
            counts.equipment++;
          }
        }
      }

      if (Array.isArray(incoming.knowledge_base)) {
        for (const kb of incoming.knowledge_base) {
          const exists = this.data.knowledge_base.some(k => k.concept === kb.concept);
          if (!exists) {
            this.addKnowledgeBase(kb);
            counts.knowledge_base++;
          }
        }
      }

      if (Array.isArray(incoming.proposals)) {
        if (!this.data.proposals) this.data.proposals = [];
        for (const p of incoming.proposals) {
          const exists = this.data.proposals.some(existing => existing.projectCode === p.projectCode && existing.title === p.title);
          if (!exists) {
            this.addProposal(p);
            counts.proposals++;
          }
        }
      }

      if (Array.isArray(incoming.proposal_templates)) {
        if (!this.data.proposal_templates) this.data.proposal_templates = [...defaultProposalTemplates];
        for (const t of incoming.proposal_templates) {
          const exists = this.data.proposal_templates.some(existing => existing.title === t.title);
          if (!exists) {
            this.addProposalTemplate(t);
            counts.proposal_templates++;
          }
        }
      }

      if (Array.isArray(incoming.letters)) {
        if (!this.data.letters) this.data.letters = [];
        for (const l of incoming.letters) {
          const exists = this.data.letters.some(existing => existing.letter_number === l.letter_number);
          if (!exists) {
            this.addLetter(l);
            counts.letters++;
          }
        }
      }

      if (incoming.system_settings) {
        this.updateSystemSettings(incoming.system_settings);
      }
    }

    this.save();
    return {
      success: true,
      message: mode === 'overwrite' ? 'پایگاه داده با موفقیت جایگزین شد.' : 'اطلاعات با موفقیت در پایگاه داده ادغام شدند.',
      counts
    };
  }
}

export const db = new FileDatabase();
