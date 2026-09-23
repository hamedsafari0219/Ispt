export interface User {
  id: number;
  username: string;
  role: 'admin' | 'manager' | 'user';
  system_access: 'alarm' | 'fighting' | 'both';
  price_access: number;
  token?: string;
}

export interface Equipment {
  id?: number;
  part_number: string;
  brand: string;
  equipment_type: string;
  price: number | null;
  currency: string;
  nfpa_reference: string;
  technical_specifications: string;
  source_file?: string;
  system_type: 'alarm' | 'fighting';
  drawing_ref?: string;
  created_at?: string;
  created_by?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatArchive {
  id: number;
  title: string;
  history: ChatMessage[];
  updated_at: string;
}

export interface AIConfig {
  api_key: string;
  base_url: string;
  model_name: string;
  has_api_key?: boolean;
  provider?: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt_overrides?: {
    assistant?: string;
    letters?: string;
    proposals?: string;
  };
}

export interface KnowledgeBase {
  id: number;
  source_file: string;
  system_type: 'alarm' | 'fighting' | 'both';
  concept: string;
  details: string;
  keywords: string;
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

export interface SystemHealthStats {
  counts: {
    equipment: number;
    users: number;
    proposals: number;
    letters: number;
    knowledge_base: number;
    documents: number;
    chat_archives: number;
    audit_logs: number;
  };
  database: {
    fileSizeKb: number;
    path: string;
    status: string;
    lastUpdated: string;
  };
  system: {
    nodeVersion: string;
    platform: string;
    arch: string;
    uptime: string;
    uptimeSeconds: number;
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
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
  raw_custom_template?: string; // Optional custom template layout with {{TAGS}}
  created_at: string;
  created_by?: string;
}

export interface ProposalMultipliers {
  customsFactor: number;   // ضریب گمرک و ترخیص (e.g., 1.15 = 15%)
  logisticsFactor: number; // ضریب حمل و نقل و بیمه (e.g., 1.05 = 5%)
  overheadProfit: number;  // ضریب سود و بالاسری (e.g., 1.20 = 20%)
  currencyRisk: number;    // ضریب ریسک ارز (e.g., 1.05 = 5%)
  discountFactor: number;  // ضریب تخفیف (e.g., 0.95 = 5% discount)
}

export interface ProposalItem {
  equipment: Equipment;
  quantity: number;
  customBasePriceEur?: number; // Overridden base purchase price in EUR
  multipliers: ProposalMultipliers;
  drawingRef?: string; // شماره و رفرنس نقشه (e.g., DWG-F&G-102-Rev01)
  tagNumber?: string;  // کد تگ تجهیز (e.g., 10-GD-101A)
  notes?: string;
}

export interface ProposalConfig {
  templateId?: number;
  title: string;
  clientName: string;
  projectCode: string;
  date: string;
  language: 'fa' | 'en';
  currency: 'EUR' | 'USD';
  showPrices: boolean;
  showPriceAnalysis: boolean;
  deliveryTime: string;
  warranty: string;
  validityDays: string;
  paymentTerms: string;
  introText: string;
}

export interface SavedProposal {
  id: number;
  templateId?: number;
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
  items: ProposalItem[];
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

export interface SendEmailPayload {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  type?: 'proposal' | 'letter' | 'equipment' | 'custom' | 'notification' | 'transmittal';
  reference_id?: string | number;
  attachments?: Array<{
    filename: string;
    content?: string; // base64
    path?: string;
    contentType?: string;
  }>;
}

export interface Letter {
  id: number;
  letter_number: string;
  letter_date: string;
  type: 'outgoing' | 'incoming' | 'internal'; // صادره / وارده / داخلی
  subject: string;
  sender: string;
  recipient: string;
  confidentiality: 'normal' | 'confidential' | 'secret'; // عادی / محرمانه / سری
  priority: 'normal' | 'urgent' | 'immediate'; // عادی / فوری / آنی
  status: 'draft' | 'signed' | 'sent' | 'archived'; // پیش‌نویس / امضا شده / ارسال شده / بایگانی
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

// ==================== EDMS (Engineering Document Management System) ====================

export type ActiveTabType = 'dashboard' | 'assistant' | 'database' | 'users' | 'proposal' | 'letters' | 'admin-console' | 'edms';

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
  | 'Code 2'  // Approved as Noted (proceed with comments incorporation in next rev)
  | 'Code 3'  // Rejected / Revise and Resubmit
  | 'Code 4'  // For Information Only / Retained for record
  | 'Pending'; // Awaiting client/consultant review

export interface EDMSDocument {
  id: number;
  doc_number: string;
  title: string;
  title_en?: string;
  project_code: string;
  project_name: string;
  discipline: 'F&G' | 'Instrumentation' | 'Electrical' | 'Mechanical' | 'Telecom' | 'Safety' | 'Process' | 'General';
  doc_type: 'DWG' | 'DSH' | 'CAL' | 'PHI' | 'C&E' | 'SCH' | 'PROC' | 'MANUAL' | 'OTHER';
  weight_factor: number; // percentage weight in MDR
  current_revision: string; // 'Rev A', 'Rev 0', etc.
  current_status: EDMSDocStatus;
  progress: number; // 0 to 100
  planned_date: string;
  actual_date?: string;
  remarks?: string;
  equipment_tags?: string[]; // linked equipment tag/part numbers
  file_name?: string;
  file_url?: string;
  file_size?: string;
  wbs_code?: string; // e.g. 1.2.4.1
  is_hold?: boolean; // Afam: Hold document management
  hold_reason?: string;
  hold_date?: string;
  man_hours_plan?: number; // Plan Man-Hours
  man_hours_actual?: number; // Actual Man-Hours spent
  cbs_value?: number; // Cost Breakdown Structure monetary value (Toman)
  feed_ref?: string; // FEED reference document
  poi_scenario?: string; // e.g. 'Standard EPC (IFR 30%, IFA 60%, IFC 100%)'
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
  action_type?: string; // 'بررسی و تایید فنی' | 'اعمال کامنت‌ها' | 'هماهنگی بین‌رشته‌ای IDC' | 'کنترل فرمت و صدور DCC' | 'جهت استحضار'
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

export type EDMSProcurementStage = 'MTO' | 'MTO_PREPARATION' | 'MR_ISSUED' | 'TBE_IN_PROGRESS' | 'TBA_APPROVED' | 'PO_PLACED' | 'DELIVERED';

export interface EDMSProcurementItem {
  id: number;
  mr_number: string; // Material Requisition (e.g. MR-IPT-FG-2026-001)
  mto_ref?: string; // Material Take-Off Ref
  title: string;
  discipline: string;
  estimated_cost?: number;
  target_po_date?: string;
  stage: EDMSProcurementStage;
  vendors_count: number;
  selected_vendor?: string;
  linked_equipment_tags?: string[];
  tbe_status: 'Approved' | 'Approved w/ Comments' | 'Under Clarification' | 'Pending' | string;
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
  certificate_no: string; // e.g. IPC-IPT-SP14-04
  period: string; // e.g. تیر ۱۴۰۵
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
  revision: string; // 'A', 'B', '0', '1', etc.
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
  transmittal_number: string; // e.g. TR-IPT-FG-2026-001
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
  overallProgress: number; // weighted physical progress %
  disciplineCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  reviewCodeCounts: Record<string, number>;
  pendingCommentsCount: number;
}

