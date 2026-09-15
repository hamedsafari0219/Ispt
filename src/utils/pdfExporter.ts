import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ProposalConfig, ProposalItem, ProposalTemplate } from '../types';

export async function exportProposalToPdf(config: ProposalConfig, items: ProposalItem[], template?: ProposalTemplate) {
  const isFa = config.language === 'fa';
  const currency = config.currency || 'EUR';

  const getItemUnitPrice = (item: ProposalItem) => {
    const base = item.customBasePriceEur ?? item.equipment.price ?? 0;
    const m = item.multipliers;
    const factor = m.customsFactor * m.logisticsFactor * m.overheadProfit * m.currencyRisk * m.discountFactor;
    return base * factor;
  };

  let grandTotal = 0;
  items.forEach(item => {
    grandTotal += getItemUnitPrice(item) * item.quantity;
  });

  // Create an off-screen container for rendering
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // A4 width at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.padding = '36px';
  container.style.boxSizing = 'border-box';
  container.style.fontFamily = "vazirmatn, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  container.style.direction = isFa ? 'rtl' : 'ltr';
  container.style.color = '#0f172a';

  const cleanIntro = config.introText
    ? config.introText.replace(/\*\*/g, '').replace(/\*/g, '').replace(/###\s*/g, '').replace(/##\s*/g, '')
    : '';

  const headerTitle = template?.header_title || (isFa ? 'شرکت مهندسی ایساتیس پارس تجهیز' : 'ISATIS PARS TAJHIZ ENGINEERING CO.');
  const headerSubtitle = template?.header_subtitle || (isFa ? 'پیشنهاد فنی و مالی سیستم‌های اعلام و اطفاء حریق (F&G)' : 'Technical & Commercial Proposal - Fire & Gas Systems');
  const sig = template?.signature_section || {
    prepared_by_title: isFa ? 'کارشناس ارشد مهندسی فروش' : 'Sales Engineering Specialist',
    approved_by_title: isFa ? 'مدیریت مهندسی و بازرگانی' : 'Engineering & Commercial Director',
    company_seal_text: isFa ? 'شرکت مهندسی ایساتیس پارس تجهیز' : 'Isatis Pars Tajhiz Eng. Co.'
  };

  // Construct HTML content
  container.innerHTML = `
    <div style="border-bottom: 3px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #1e3a8a; letter-spacing: -0.5px;">
        ${headerTitle}
      </h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569; font-weight: 600;">
        ${headerSubtitle}
      </p>
    </div>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
      <div><strong>${isFa ? 'عنوان پروژه:' : 'Project Title:'}</strong> ${config.title || '-'}</div>
      <div><strong>${isFa ? 'خریدار / کارفرما:' : 'Client / Customer:'}</strong> ${config.clientName || '-'}</div>
      <div><strong>${isFa ? 'کد رفرنس:' : 'Ref Code:'}</strong> ${config.projectCode || 'IP-2026-F&G-01'}</div>
      <div><strong>${isFa ? 'تاریخ:' : 'Date:'}</strong> ${config.date || new Date().toISOString().slice(0, 10)}</div>
    </div>

    ${cleanIntro ? `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 800; color: #1e3a8a;">
          ${isFa ? 'شرح و مقدمه فنی (Executive Summary):' : 'Executive Technical Summary:'}
        </h3>
        <div style="background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 10px; padding: 12px; font-size: 11.5px; line-height: 1.6; color: #1e293b; white-space: pre-line;">
          ${cleanIntro}
        </div>
      </div>
    ` : ''}

    ${template?.technical_notes ? `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 800; color: #1e3a8a;">
          ${isFa ? 'الزامات فنی و استانداردها:' : 'Technical Compliance Notes:'}
        </h3>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; font-size: 11.5px; line-height: 1.6; color: #334155; white-space: pre-line;">
          ${template.technical_notes}
        </div>
      </div>
    ` : ''}

    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #1e3a8a;">
        ${isFa ? 'جدول مشخصات تجهیزات (BOQ):' : 'Bill of Quantities & Specifications:'}
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background-color: #1e3a8a; color: #ffffff; text-align: ${isFa ? 'right' : 'left'}; font-weight: bold;">
            <th style="padding: 8px; border: 1px solid #1e3a8a; text-align: center; width: 30px;">#</th>
            <th style="padding: 8px; border: 1px solid #1e3a8a;">${isFa ? 'پارت نامبر' : 'Part Number'}</th>
            <th style="padding: 8px; border: 1px solid #1e3a8a;">${isFa ? 'رفرنس نقشه / Tag' : 'DWG Ref / Tag'}</th>
            <th style="padding: 8px; border: 1px solid #1e3a8a;">${isFa ? 'برند' : 'Brand'}</th>
            <th style="padding: 8px; border: 1px solid #1e3a8a;">${isFa ? 'نوع تجهیز' : 'Equipment Type'}</th>
            <th style="padding: 8px; border: 1px solid #1e3a8a; text-align: center;">${isFa ? 'تعداد' : 'Qty'}</th>
            ${config.showPrices ? `
              <th style="padding: 8px; border: 1px solid #1e3a8a; text-align: center;">${isFa ? `قیمت واحد (${currency})` : `Unit (${currency})`}</th>
              <th style="padding: 8px; border: 1px solid #1e3a8a; text-align: center;">${isFa ? `مبلغ کل (${currency})` : `Total (${currency})`}</th>
            ` : ''}
          </tr>
        </thead>
        <tbody>
          ${items.map((item, idx) => {
            const unitP = getItemUnitPrice(item);
            const totalP = unitP * item.quantity;
            const dwgTag = item.drawingRef || item.tagNumber || item.equipment.drawing_ref || '-';
            return `
              <tr style="border-bottom: 1px solid #cbd5e1; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${item.equipment.part_number}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 10px; color: #3730a3;">${dwgTag}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.equipment.brand}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.equipment.equipment_type}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${item.quantity}</td>
                ${config.showPrices ? `
                  <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">${unitP.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                  <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; font-family: monospace;">${totalP.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                ` : ''}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    ${config.showPrices ? `
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px; text-align: ${isFa ? 'left' : 'right'}; font-size: 13px; font-weight: 800; color: #065f46; margin-bottom: 20px;">
        ${isFa ? 'مبلغ کل پیشنهادی (Grand Total):' : 'Commercial Grand Total:'} ${grandTotal.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}
      </div>
    ` : ''}

    ${config.showPrices && config.showPriceAnalysis ? `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 800; color: #78350f;">
          ${isFa ? 'جدول آنالیز و شفاف‌سازی ضرایب مالی:' : 'Transparent Multiplier Breakdown Table:'}
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background-color: #78350f; color: #ffffff; text-align: center; font-weight: bold;">
              <th style="padding: 6px; border: 1px solid #78350f;">${isFa ? 'پارت نامبر' : 'Part Number'}</th>
              <th style="padding: 6px; border: 1px solid #78350f;">${isFa ? 'قیمت پایه' : 'Base Eur'}</th>
              <th style="padding: 6px; border: 1px solid #78350f;">${isFa ? 'گمرک' : 'Customs'}</th>
              <th style="padding: 6px; border: 1px solid #78350f;">${isFa ? 'حمل' : 'Logistics'}</th>
              <th style="padding: 6px; border: 1px solid #78350f;">${isFa ? 'سود/بالاسری' : 'Overhead'}</th>
              <th style="padding: 6px; border: 1px solid #78350f;">${isFa ? 'ریسک ارز' : 'Currency'}</th>
              <th style="padding: 6px; border: 1px solid #78350f;">${isFa ? 'ضریب ترکیبی' : 'Total Factor'}</th>
              <th style="padding: 6px; border: 1px solid #78350f;">${isFa ? 'قیمت فروش واحد' : 'Final Unit Selling'}</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => {
              const base = item.customBasePriceEur ?? item.equipment.price ?? 0;
              const m = item.multipliers;
              const factor = m.customsFactor * m.logisticsFactor * m.overheadProfit * m.currencyRisk * m.discountFactor;
              const finalP = base * factor;
              return `
                <tr style="border-bottom: 1px solid #fde68a; background-color: #fffbeb;">
                  <td style="padding: 6px; border: 1px solid #fde68a; font-weight: bold;">${item.equipment.part_number}</td>
                  <td style="padding: 6px; border: 1px solid #fde68a; text-align: center; font-family: monospace;">€${base}</td>
                  <td style="padding: 6px; border: 1px solid #fde68a; text-align: center;">${m.customsFactor}x</td>
                  <td style="padding: 6px; border: 1px solid #fde68a; text-align: center;">${m.logisticsFactor}x</td>
                  <td style="padding: 6px; border: 1px solid #fde68a; text-align: center;">${m.overheadProfit}x</td>
                  <td style="padding: 6px; border: 1px solid #fde68a; text-align: center;">${m.currencyRisk}x</td>
                  <td style="padding: 6px; border: 1px solid #fde68a; text-align: center; font-weight: bold; color: #92400e;">${factor.toFixed(3)}x</td>
                  <td style="padding: 6px; border: 1px solid #fde68a; text-align: center; font-weight: bold; font-family: monospace;">€${finalP.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <div style="border-top: 2px solid #e2e8f0; padding-top: 14px; font-size: 11.5px; color: #334155; line-height: 1.8;">
      <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 800; color: #1e3a8a;">
        ${isFa ? 'شرایط و الزامات تجاری:' : 'Commercial Terms & Guarantee:'}
      </h3>
      <div>• <strong>${isFa ? 'زمان تحویل:' : 'Delivery Time:'}</strong> ${config.deliveryTime || 'طبق توافق طرفین'}</div>
      <div>• <strong>${isFa ? 'شرایط پرداخت:' : 'Payment Terms:'}</strong> ${config.paymentTerms || 'طبق توافق طرفین'}</div>
      <div>• <strong>${isFa ? 'مدت اعتبار پیشنهاد:' : 'Proposal Validity:'}</strong> ${config.validityDays ? config.validityDays + (isFa ? ' روز' : ' Days') : (isFa ? '۳۰ روز' : '30 Days')}</div>
      <div>• <strong>${isFa ? 'گارانتی و خدمات:' : 'Warranty:'}</strong> ${config.warranty || (isFa ? '۱۲ ماه گارانتی و ۱۰ سال خدمات پس از فروش' : '12 Months Warranty & 10 Years After-sales Services')}</div>
    </div>

    <div style="margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; text-align: center; font-size: 11px;">
      <div style="border: 1px dashed #cbd5e1; border-radius: 8px; padding: 14px 10px;">
        <strong style="color: #1e293b;">${sig.prepared_by_title}</strong>
        <div style="margin-top: 25px; color: #94a3b8;">...................................</div>
      </div>
      <div style="border: 1px dashed #cbd5e1; border-radius: 8px; padding: 14px 10px;">
        <strong style="color: #1e293b;">${sig.approved_by_title}</strong>
        <div style="margin-top: 25px; color: #94a3b8;">...................................</div>
      </div>
    </div>

    <div style="margin-top: 25px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px;">
      ${sig.company_seal_text || 'Isatis Pars Tajhiz Engineering Co.'} — Official Commercial & Technical Proposal
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = position - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(`Proposal_${config.projectCode || 'F_and_G'}_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert(isFa ? 'خطا در تولید فایل PDF' : 'Error generating PDF file');
  } finally {
    document.body.removeChild(container);
  }
}


