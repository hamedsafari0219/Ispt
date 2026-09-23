import nodemailer from 'nodemailer';
import { db, EmailConfig, EmailLog } from './db.js';
import { GoogleGenAI } from '@google/genai';

interface EmailAttachment {
  filename: string;
  content?: string; // base64 string
  path?: string;
  contentType?: string;
}

export interface SendMailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  type?: 'proposal' | 'letter' | 'equipment' | 'custom' | 'notification' | 'transmittal';
  reference_id?: string | number;
  sent_by?: string;
  attachments?: EmailAttachment[];
}

/**
 * Creates a nodemailer transport instance using the system's current SMTP config.
 */
export function getMailTransporter(customConfig?: EmailConfig) {
  const config = customConfig || db.getInternalEmailConfig();

  if (!config.smtp_host || !config.smtp_user) {
    return null;
  }

  const port = Number(config.smtp_port) || 587;
  const isSecure = config.smtp_secure || port === 465;

  return nodemailer.createTransport({
    host: config.smtp_host,
    port: port,
    secure: isSecure,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass || ''
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Test SMTP connection
 */
export async function testSmtpConnection(config: EmailConfig): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = getMailTransporter(config);
    if (!transporter) {
      return {
        success: false,
        message: 'تنظیمات سرور SMTP ناقص است (آدرس سرور یا نام کاربری وارد نشده است).'
      };
    }

    await transporter.verify();
    return {
      success: true,
      message: 'اتصال به سرور SMTP با موفقیت برقرار شد.'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `خطا در اتصال به سرور SMTP: ${error.message || error}`
    };
  }
}

/**
 * Core function to send an email with logging and fallback simulation
 */
export async function sendEmail(options: SendMailOptions): Promise<{
  success: boolean;
  status: 'sent' | 'simulated' | 'failed';
  message: string;
  log?: EmailLog;
}> {
  const config = db.getInternalEmailConfig();
  const toList = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  const ccList = options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined;
  const bccList = options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined;
  const sentBy = options.sent_by || 'admin';

  let attachmentsInfo = '';
  if (options.attachments && options.attachments.length > 0) {
    attachmentsInfo = options.attachments.map(a => a.filename).join(', ');
  }

  const fromAddress = config.from_email 
    ? `"${config.from_name || 'ایساتیس پارس تجهیز'}" <${config.from_email}>`
    : `"سیستم مهندسی F&G" <noreply@isatis-fg.ir>`;

  // If SMTP is enabled and configured, attempt real dispatch
  if (config.enable_smtp && config.smtp_host && config.smtp_user && config.smtp_pass) {
    try {
      const transporter = getMailTransporter(config);
      if (!transporter) {
        throw new Error('عدم امکان ایجاد اتصال SMTP');
      }

      const mailOptions: nodemailer.SendMailOptions = {
        from: fromAddress,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: config.reply_to || config.from_email,
        subject: options.subject,
        text: options.text || '',
        html: options.html || options.text || '',
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content ? Buffer.from(att.content, 'base64') : undefined,
          path: att.path,
          contentType: att.contentType
        }))
      };

      const info = await transporter.sendMail(mailOptions);

      const log = db.addEmailLog({
        to: toList,
        cc: ccList,
        bcc: bccList,
        subject: options.subject,
        body: options.text || '',
        html_body: options.html,
        type: options.type || 'custom',
        reference_id: options.reference_id,
        status: 'sent',
        sent_by: sentBy,
        attachments_info: attachmentsInfo
      });

      return {
        success: true,
        status: 'sent',
        message: `ایمیل با موفقیت به ${toList} ارسال گردید (MessageId: ${info.messageId}).`,
        log
      };
    } catch (err: any) {
      console.error('SMTP sending error, falling back to simulated log:', err);

      const log = db.addEmailLog({
        to: toList,
        cc: ccList,
        bcc: bccList,
        subject: options.subject,
        body: options.text || '',
        html_body: options.html,
        type: options.type || 'custom',
        reference_id: options.reference_id,
        status: 'failed',
        error_message: err.message || 'خطا در ارسال SMTP',
        sent_by: sentBy,
        attachments_info: attachmentsInfo
      });

      return {
        success: false,
        status: 'failed',
        message: `خطا در ارسال واقعی ایمیل: ${err.message || 'خطای ناشناخته SMTP'}`,
        log
      };
    }
  }

  // Fallback: SMTP is disabled or not configured -> Log as simulated dispatch
  const log = db.addEmailLog({
    to: toList,
    cc: ccList,
    bcc: bccList,
    subject: options.subject,
    body: options.text || '',
    html_body: options.html,
    type: options.type || 'custom',
    reference_id: options.reference_id,
    status: 'simulated',
    error_message: 'سرویس SMTP فعال نبوده و ایمیل در حالت شبیه‌سازی سیستم ثبت شد.',
    sent_by: sentBy,
    attachments_info: attachmentsInfo
  });

  return {
    success: true,
    status: 'simulated',
    message: `ایمیل در حالت شبیه‌سازی برای ${toList} ثبت و در آرشیو مکاتبات ذخیره شد. (جهت ارسال واقعی از بخش تنظیمات، مشخصات سرور SMTP را فعال فرمایید)`,
    log
  };
}

/**
 * Generate Responsive HTML email template for Proposals
 */
export function buildProposalEmailHtml(params: {
  proposal: any;
  customMessage?: string;
  senderName?: string;
  senderTitle?: string;
}): string {
  const { proposal, customMessage, senderName, senderTitle } = params;
  const sysSettings = db.getSystemSettings();
  const isFa = proposal.language !== 'en';
  const dir = isFa ? 'rtl' : 'ltr';
  const align = isFa ? 'right' : 'left';

  let totalItemsAmount = 0;
  const itemsRows = (proposal.items || []).map((item: any, idx: number) => {
    const qty = item.quantity || 1;
    const base = item.customBasePriceEur ?? item.equipment?.price ?? 0;
    const m = item.multipliers || { customsFactor: 1, logisticsFactor: 1, overheadProfit: 1, currencyRisk: 1, discountFactor: 1 };
    const mult = (m.customsFactor || 1) * (m.logisticsFactor || 1) * (m.overheadProfit || 1) * (m.currencyRisk || 1) * (m.discountFactor || 1);
    const unitPrice = proposal.showPrices ? base * mult : 0;
    const totalPrice = unitPrice * qty;
    totalItemsAmount += totalPrice;

    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; text-align: center; color: #64748b; font-size: 13px;">${idx + 1}</td>
        <td style="padding: 10px; font-weight: bold; color: #1e293b; font-size: 13px;">${item.equipment?.part_number || '-'}</td>
        <td style="padding: 10px; color: #334155; font-size: 13px;">${item.equipment?.equipment_type || item.equipment?.brand || '-'}</td>
        <td style="padding: 10px; text-align: center; font-weight: bold; color: #0f172a; font-size: 13px;">${qty}</td>
        ${proposal.showPrices ? `
          <td style="padding: 10px; text-align: ${align}; color: #0284c7; font-size: 13px;">${unitPrice.toLocaleString('en-US', { maximumFractionDigits: 1 })} ${proposal.currency || 'EUR'}</td>
          <td style="padding: 10px; text-align: ${align}; font-weight: bold; color: #0369a1; font-size: 13px;">${totalPrice.toLocaleString('en-US', { maximumFractionDigits: 1 })} ${proposal.currency || 'EUR'}</td>
        ` : ''}
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="${isFa ? 'fa' : 'en'}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${proposal.title || 'پیشنهاد فنی و مالی'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Tahoma, Segoe UI, Arial, sans-serif; direction: ${dir}; text-align: ${align}; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 650px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Corporate Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 30px 24px; text-align: center; color: #ffffff;">
              <div style="font-size: 20px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 6px;">
                ${sysSettings.company_name_fa || 'شرکت مهندسی ایساتیس پارس تجهیز'}
              </div>
              <div style="font-size: 12px; color: #93c5fd; text-transform: uppercase; letter-spacing: 1px;">
                ISATIS PARS TAJHIZ ENGINEERING CO. - F&G SYSTEMS
              </div>
              <div style="margin-top: 16px; display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.2);">
                ${isFa ? 'پیشنهاد فنی و مالی سیستم‌های اعلام و اطفاء حریق' : 'Technical & Commercial Proposal'}
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 28px 24px;">
              
              <!-- Custom User Message if present -->
              ${customMessage ? `
                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 24px; color: #166534; font-size: 14px; line-height: 1.7; white-space: pre-line;">
                  ${customMessage}
                </div>
              ` : ''}

              <!-- Project Metadata Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; padding: 16px;">
                <tr>
                  <td width="50%" style="padding: 6px 12px; font-size: 13px; color: #64748b;">
                    <strong>${isFa ? 'نام کارفرما / مشتری:' : 'Client:'}</strong> <span style="color: #0f172a; font-weight: bold;">${proposal.clientName || '-'}</span>
                  </td>
                  <td width="50%" style="padding: 6px 12px; font-size: 13px; color: #64748b;">
                    <strong>${isFa ? 'کد پروژه:' : 'Project Code:'}</strong> <span style="color: #0f172a; font-weight: bold; font-family: monospace;">${proposal.projectCode || '-'}</span>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 6px 12px; font-size: 13px; color: #64748b;">
                    <strong>${isFa ? 'عنوان پیشنهاد:' : 'Title:'}</strong> <span style="color: #0f172a; font-weight: bold;">${proposal.title || '-'}</span>
                  </td>
                  <td width="50%" style="padding: 6px 12px; font-size: 13px; color: #64748b;">
                    <strong>${isFa ? 'تاریخ صدور:' : 'Date:'}</strong> <span style="color: #0f172a; font-weight: bold;">${proposal.date || '-'}</span>
                  </td>
                </tr>
              </table>

              <!-- Intro Text -->
              ${proposal.introText ? `
                <div style="font-size: 13px; line-height: 1.8; color: #334155; margin-bottom: 24px; padding: 0 4px; white-space: pre-line;">
                  ${proposal.introText}
                </div>
              ` : ''}

              <!-- BOQ Items Table -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 10px;">
                  ${isFa ? 'فهرست تجهیزات و اقلام پیشنهادی (BOQ):' : 'Bill of Quantities (BOQ):'}
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #0f172a; color: #ffffff;">
                      <th style="padding: 10px; font-size: 12px; text-align: center; width: 35px;">#</th>
                      <th style="padding: 10px; font-size: 12px; text-align: ${align};">${isFa ? 'پارت‌نامبر' : 'Part No'}</th>
                      <th style="padding: 10px; font-size: 12px; text-align: ${align};">${isFa ? 'نوع تجهیز' : 'Equipment Type'}</th>
                      <th style="padding: 10px; font-size: 12px; text-align: center; width: 45px;">${isFa ? 'تعداد' : 'Qty'}</th>
                      ${proposal.showPrices ? `
                        <th style="padding: 10px; font-size: 12px; text-align: ${align};">${isFa ? 'قیمت واحد' : 'Unit Price'}</th>
                        <th style="padding: 10px; font-size: 12px; text-align: ${align};">${isFa ? 'قیمت کل' : 'Total Price'}</th>
                      ` : ''}
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsRows}
                  </tbody>
                  ${proposal.showPrices ? `
                    <tfoot>
                      <tr style="background-color: #f1f5f9; font-weight: bold;">
                        <td colspan="4" style="padding: 12px; text-align: ${isFa ? 'left' : 'right'}; color: #0f172a; font-size: 13px;">
                          ${isFa ? 'جمع کل اقلام (EUR):' : 'Total Amount:'}
                        </td>
                        <td colspan="2" style="padding: 12px; text-align: ${align}; color: #0369a1; font-size: 15px; font-weight: 800;">
                          ${totalItemsAmount.toLocaleString('en-US', { maximumFractionDigits: 1 })} ${proposal.currency || 'EUR'}
                        </td>
                      </tr>
                    </tfoot>
                  ` : ''}
                </table>
              </div>

              <!-- Commercial Conditions -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">
                  ${isFa ? 'شرایط عمومی و تجاری:' : 'Terms and Conditions:'}
                </div>
                <div style="font-size: 12px; color: #475569; line-height: 1.9;">
                  <div>• <strong>${isFa ? 'مدت زمان تحویل:' : 'Delivery Time:'}</strong> ${proposal.deliveryTime || '-'}</div>
                  <div>• <strong>${isFa ? 'شرایط پرداخت:' : 'Payment Terms:'}</strong> ${proposal.paymentTerms || '-'}</div>
                  <div>• <strong>${isFa ? 'مدت اعتبار استعلام:' : 'Validity:'}</strong> ${proposal.validityDays || 30} ${isFa ? 'روز کاری' : 'days'}</div>
                  <div>• <strong>${isFa ? 'گارانتی و خدمات:' : 'Warranty:'}</strong> ${proposal.warranty || '-'}</div>
                </div>
              </div>

              <!-- Signer signature box -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #cbd5e1; text-align: ${align};">
                <div style="font-size: 13px; font-weight: bold; color: #0f172a;">
                  ${senderName || sysSettings.ceo_name || 'دپارتمان مهندسی و فروش'}
                </div>
                <div style="font-size: 12px; color: #64748b;">
                  ${senderTitle || 'شرکت مهندسی ایساتیس پارس تجهیز'}
                </div>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <div>${sysSettings.company_address || 'تهران، خیابان ولیعصر، برج مهندسی'} | تلفن: ${sysSettings.company_phone || '۰۲۱-۸۸۸۸۸۸۸۸'}</div>
              <div style="margin-top: 4px;">وبسایت: <a href="https://${sysSettings.company_website || 'isatis-fg.ir'}" style="color: #2563eb; text-decoration: none;">${sysSettings.company_website || 'www.isatis-fg.ir'}</a> | ایمیل: ${sysSettings.company_email || 'info@isatis-fg.ir'}</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generate Responsive HTML email template for Letters
 */
export function buildLetterEmailHtml(params: {
  letter: any;
  customMessage?: string;
}): string {
  const { letter, customMessage } = params;
  const sysSettings = db.getSystemSettings();

  return `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${letter.subject || 'مکاتبه اداری'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Tahoma, Segoe UI, Arial, sans-serif; direction: rtl; text-align: right; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 650px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Corporate Letterhead -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #312e81 100%); padding: 28px 24px; color: #ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="70%">
                    <div style="font-size: 18px; font-weight: 800;">${sysSettings.company_name_fa || 'شرکت مهندسی ایساتیس پارس تجهیز'}</div>
                    <div style="font-size: 11px; color: #a5b4fc; margin-top: 4px;">سیستم مدیریت مکاتبات و مهندسی F&G</div>
                  </td>
                  <td width="30%" align="left" style="font-size: 12px; color: #e0e7ff; line-height: 1.6;">
                    <div><strong>شماره:</strong> ${letter.letter_number}</div>
                    <div><strong>تاریخ:</strong> ${letter.letter_date}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Letter Content -->
          <tr>
            <td style="padding: 28px 24px;">

              ${customMessage ? `
                <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px; margin-bottom: 20px; color: #1e40af; font-size: 13px; line-height: 1.6; white-space: pre-line;">
                  ${customMessage}
                </div>
              ` : ''}

              <!-- Recipient and Subject -->
              <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
                <div style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 6px;">
                  گیرنده: <span style="color: #2563eb;">${letter.recipient}</span>
                </div>
                <div style="font-size: 13px; color: #475569; margin-bottom: 6px;">
                  فرستنده: <span style="color: #0f172a; font-weight: 600;">${letter.sender}</span>
                </div>
                <div style="font-size: 15px; font-weight: 800; color: #1e293b; margin-top: 10px;">
                  موضوع: ${letter.subject}
                </div>
              </div>

              <!-- Body of Letter -->
              <div style="font-size: 14px; line-height: 2.0; color: #334155; white-space: pre-line; margin-bottom: 30px; text-align: justify;">
                ${letter.content}
              </div>

              <!-- Attachments if any -->
              ${letter.attachments ? `
                <div style="background-color: #f8fafc; border-right: 3px solid #3b82f6; padding: 10px 14px; margin-bottom: 24px; font-size: 12px; color: #475569;">
                  <strong>پیوست‌ها:</strong> ${letter.attachments}
                </div>
              ` : ''}

              <!-- Signature Area -->
              <div style="margin-top: 30px; text-align: left; padding-left: 20px;">
                <div style="font-size: 13px; font-weight: bold; color: #0f172a;">
                  ${letter.sender || sysSettings.company_name_fa}
                </div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                  دپارتمان مهندسی و بازرگانی
                </div>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <div>این ایمیل به صورت خودکار از طریق سیستم اتوماسیون مهندسی ایساتیس پارس تجهیز ارسال گردیده است.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generate Responsive HTML email template for Equipment Details
 */
export function buildEquipmentEmailHtml(params: {
  equipment: any;
  customMessage?: string;
}): string {
  const { equipment, customMessage } = params;
  const sysSettings = db.getSystemSettings();

  return `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>مشخصات فنی ${equipment.part_number}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Tahoma, Segoe UI, Arial, sans-serif; direction: rtl; text-align: right; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <tr style="background: linear-gradient(135deg, #0f172a 0%, #0369a1 100%); padding: 24px; color: #ffffff;">
            <td style="padding: 24px; text-align: center;">
              <div style="font-size: 18px; font-weight: 800;">شناسنامه و مشخصات فنی تجهیز</div>
              <div style="font-size: 13px; color: #bae6fd; margin-top: 4px;">سامانه تخصصی مهندسی اعلام و اطفاء حریق</div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px;">
              ${customMessage ? `
                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; margin-bottom: 20px; color: #166534; font-size: 13px; line-height: 1.6;">
                  ${customMessage}
                </div>
              ` : ''}

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="8">
                  <tr>
                    <td width="35%" style="color: #64748b; font-size: 13px;"><strong>پارت نامبر (Part Number):</strong></td>
                    <td style="color: #0f172a; font-size: 14px; font-weight: bold; font-family: monospace;">${equipment.part_number}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-size: 13px;"><strong>برند سازنده:</strong></td>
                    <td style="color: #0f172a; font-size: 14px; font-weight: bold;">${equipment.brand}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-size: 13px;"><strong>نوع تجهیز:</strong></td>
                    <td style="color: #0f172a; font-size: 13px;">${equipment.equipment_type}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-size: 13px;"><strong>سیستم:</strong></td>
                    <td style="color: #0f172a; font-size: 13px;">${equipment.system_type === 'alarm' ? 'اعلام حریق و گاز (Fire Alarm)' : 'اطفاء حریق (Fire Fighting)'}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-size: 13px;"><strong>استاندارد NFPA مرجع:</strong></td>
                    <td style="color: #0369a1; font-size: 13px; font-weight: bold;">${equipment.nfpa_reference || '-'}</td>
                  </tr>
                  ${equipment.price ? `
                    <tr>
                      <td style="color: #64748b; font-size: 13px;"><strong>قیمت پایه:</strong></td>
                      <td style="color: #16a34a; font-size: 14px; font-weight: bold;">${equipment.price.toLocaleString()} ${equipment.currency || 'USD'}</td>
                    </tr>
                  ` : ''}
                </table>
              </div>

              <div style="margin-bottom: 20px;">
                <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 6px;">مشخصات فنی و استانداردهای طراحی:</div>
                <div style="background-color: #f1f5f9; border-radius: 8px; padding: 14px; font-size: 13px; color: #334155; line-height: 1.8;">
                  ${equipment.technical_specifications || 'مشخصاتی ثبت نشده است.'}
                </div>
              </div>

            </td>
          </tr>

          <tr>
            <td style="background-color: #f1f5f9; padding: 14px; text-align: center; font-size: 11px; color: #64748b;">
              ${sysSettings.company_name_fa || 'شرکت مهندسی ایساتیس پارس تجهیز'}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Builds standard engineering transmittal HTML email
 */
export function buildTransmittalEmailHtml(params: {
  transmittal: any;
  customMessage?: string;
  senderName?: string;
}): string {
  const { transmittal, customMessage, senderName } = params;
  const docs = Array.isArray(transmittal.documents) ? transmittal.documents : [];

  const docRows = docs.map((doc: any, index: number) => `
    <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px; font-weight: 600; color: #475569;">${index + 1}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 13px; font-weight: bold; color: #0284c7; direction: ltr; text-align: left;">${doc.doc_number || ''}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e293b;">${doc.doc_title || ''}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace; font-size: 13px; font-weight: bold; color: #b45309;">${doc.revision || '0'}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px; font-weight: 600; color: #0f766e;">${doc.status || transmittal.issue_purpose || 'IFR'}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">${doc.format || 'PDF'} (${doc.copies || 1})</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Tahoma', 'Segoe UI', Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 780px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 24px 30px; text-align: right; border-bottom: 4px solid #0284c7; }
    .badge { display: inline-block; background: #0284c7; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; }
    .meta-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 30px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .table th { background-color: #0f172a; color: #ffffff; padding: 10px 12px; font-size: 13px; text-align: right; }
    .footer { background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span class="badge">برگه ارسال رسمی مدارک مهندسی (EDMS Transmittal)</span>
          <h2 style="margin: 10px 0 5px 0; font-size: 20px; color: #ffffff;">شرکت مهندسی ایساتیس پارس تجهیز</h2>
          <p style="margin: 0; font-size: 13px; color: #94a3b8;">دپارتمان کنترل مدارک مهندسی (Document Control Center - DCC)</p>
        </div>
      </div>
    </div>

    <div class="meta-box">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; width: 50%;"><strong>شماره ترانزمیتال:</strong> <span style="font-family: monospace; font-weight: bold; color: #0284c7; direction: ltr; display: inline-block;">${transmittal.transmittal_number}</span></td>
          <td style="padding: 6px 0; font-size: 13px; width: 50%;"><strong>تاریخ صدور:</strong> ${transmittal.transmittal_date || ''}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px;"><strong>پروژه:</strong> ${transmittal.project_name || transmittal.project_code || '-'}</td>
          <td style="padding: 6px 0; font-size: 13px;"><strong>هدف از صدور (Purpose):</strong> <span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${transmittal.issue_purpose || 'IFR'}</span></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px;"><strong>گیرنده:</strong> ${transmittal.recipient || '-'}</td>
          <td style="padding: 6px 0; font-size: 13px;"><strong>عطف به:</strong> ${transmittal.attention_to || '-'}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 6px 0; font-size: 13px;"><strong>موضوع:</strong> ${transmittal.subject || '-'}</td>
        </tr>
      </table>
    </div>

    ${customMessage ? `
    <div style="margin: 0 30px 20px 30px; padding: 14px 18px; background-color: #eff6ff; border-right: 4px solid #3b82f6; border-radius: 6px; font-size: 13px; line-height: 1.8; color: #1e3a8a;">
      <strong>پیام پیوست DCC:</strong><br/>
      ${customMessage.replace(/\n/g, '<br/>')}
    </div>
    ` : ''}

    <div style="margin: 0 30px 20px 30px;">
      <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">فهرست مدارک و نقشه‌های مهندسی پیوست</h3>
      <table class="table">
        <thead>
          <tr>
            <th style="text-align: center; width: 40px;">ردیف</th>
            <th style="text-align: left; width: 170px;">Document No.</th>
            <th>عنوان مدرک / نقشه</th>
            <th style="text-align: center; width: 60px;">Rev.</th>
            <th style="text-align: center; width: 70px;">هدف</th>
            <th style="text-align: center; width: 90px;">تعداد و فرمت</th>
          </tr>
        </thead>
        <tbody>
          ${docRows}
        </tbody>
      </table>
    </div>

    ${transmittal.remarks ? `
    <div style="margin: 0 30px 20px 30px; font-size: 13px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 12px 16px; color: #92400e;">
      <strong>توضیحات و اقدامات درخواستی:</strong> ${transmittal.remarks}
    </div>
    ` : ''}

    <div style="margin: 0 30px 25px 30px; display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 15px; font-size: 12px; color: #475569;">
      <div><strong>تهیه کننده (DCC):</strong> ${transmittal.prepared_by || senderName || 'واحد کنترل مدارک مهندسی'}</div>
      <div><strong>تایید کننده:</strong> ${transmittal.approved_by || 'مدیر مهندسی و پروژه‌ها'}</div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 5px 0; font-weight: bold; color: #334155;">شرکت مهندسی ایساتیس پارس تجهیز (Isatis Pars Tajhiz)</p>
      <p style="margin: 0; font-size: 11px;">سیستم مدیریت یکپارچه مدارک مهندسی (EDMS) | این ایمیل به صورت رسمی و خودکار از طرف سامانه DCC ارسال شده است.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * AI Email Drafter: creates professional email text using Gemini
 */
export async function generateAiEmailDraft(params: {
  recipientName: string;
  contextType: 'proposal' | 'letter' | 'equipment' | 'general';
  summaryDetails: string;
  tone?: 'formal' | 'commercial' | 'urgent' | 'friendly';
  language?: 'fa' | 'en';
}): Promise<string> {
  const { recipientName, contextType, summaryDetails, tone = 'formal', language = 'fa' } = params;

  try {
    const aiConfig = db.getAIConfig();
    const apiKey = process.env.GEMINI_API_KEY || aiConfig.api_key;

    if (!apiKey) {
      return language === 'fa'
        ? `جناب آقای/سرکار خانم ${recipientName || 'محترم'}\nبا سلام و احترام،\nپیرو مذاکرات انجام‌شده، اطلاعات درخواستی مرتبط با ${summaryDetails} جهت استحضار و بررسی ارسال می‌گردد.\nخواهشمند است پس از بررسی دستور مقتضی را صادر فرمایید.\nبا سپاس\nشرکت مهندسی ایساتیس پارس تجهیز`
        : `Dear ${recipientName || 'Valued Customer'},\n\nWe hope this email finds you well.\nPlease find attached the relevant details regarding ${summaryDetails} for your kind review and consideration.\n\nBest regards,\nIsatis Pars Tajhiz Engineering Co.`;
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
شما مسئول ارتباطات و مکاتبات مهندسی و بازرگانی شرکت معتبر مهندسی "ایساتیس پارس تجهیز" (طراح و تأمین‌کننده سیستم‌های اعلام و اطفاء حریق و پکیج‌های F&G صنعتی) هستید.

وظیفه:
یک متن ایمیل سازمانی بسیار حرفه‌ای، شایسته و استاندارد بنویسید.

مشخصات درخواست:
- نام یا عنوان گیرنده: ${recipientName || 'کارفرمای محترم'}
- موضوع و نوع محتوا: ${contextType}
- جزئیات و خلاصه محتوا: ${summaryDetails}
- لحن نگارش: ${tone === 'formal' ? 'رسمی و اداری مهندسی' : tone === 'commercial' ? 'حرفه‌ای بازرگانی و ترغیب‌کننده' : tone === 'urgent' ? 'فوری و پیگیرانه' : 'محترمانه و روان'}
- زبان خروجی: ${language === 'fa' ? 'فارسی فاخر و اداری' : 'English Business Professional'}

قوانین:
1. متن را با سلام و احترام متناسب آغاز کرده و با تشکر و امضای شرکتی به پایان ببرید.
2. فقط متن بدنه ایمیل را برگردانید و از هیچ تگ اضافی یا توضیحات جانبی خودداری کنید.
`;

    const candidateModels = [
      ...(aiConfig.model_name && !aiConfig.model_name.includes('2.5') ? [aiConfig.model_name] : []),
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash'
    ];

    let emailText = '';
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        if (response.text?.trim()) {
          emailText = response.text.trim();
          break;
        }
      } catch (err: any) {
        console.warn(`[Mailer AI] Model ${model} failed: ${err.message}`);
      }
    }

    return emailText || (language === 'fa'
      ? `جناب آقای/سرکار خانم ${recipientName || 'محترم'}\nبا سلام و احترام،\nپیرو مذاکرات انجام‌شده، اطلاعات مرتبط با ${summaryDetails} به پیوست تقدیم می‌گردد.\nبا احترام، دپارتمان مهندسی ایساتیس پارس تجهیز`
      : `Dear ${recipientName || 'Customer'},\n\nPlease find the requested details regarding ${summaryDetails}.\n\nSincerely,\nIsatis Pars Tajhiz Engineering Co.`);
  } catch (error: any) {
    console.error('Error generating AI email draft:', error);
    return language === 'fa'
      ? `جناب آقای/سرکار خانم ${recipientName || 'محترم'}\nبا سلام و احترام،\nپیرو مذاکرات انجام‌شده، اطلاعات مرتبط با ${summaryDetails} به پیوست تقدیم می‌گردد.\nبا احترام، دپارتمان مهندسی ایساتیس پارس تجهیز`
      : `Dear ${recipientName || 'Customer'},\n\nPlease find the requested details regarding ${summaryDetails}.\n\nSincerely,\nIsatis Pars Tajhiz Engineering Co.`;
  }
}
