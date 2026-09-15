import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { ProposalConfig, ProposalItem, ProposalTemplate } from '../types';

function translateEquipmentType(typeStr: string, isFa: boolean): string {
  if (isFa || !typeStr) return typeStr;
  const lower = typeStr.toLowerCase();
  if (lower.includes('گاز') || lower.includes('gas')) return 'Gas Detector';
  if (lower.includes('دود') || lower.includes('smoke')) return 'Smoke Detector';
  if (lower.includes('شعله') || lower.includes('flame')) return 'Flame Detector';
  if (lower.includes('حرارت') || lower.includes('heat')) return 'Heat Detector';
  if (lower.includes('پنل') || lower.includes('panel')) return 'Fire Alarm Control Panel';
  if (lower.includes('اطفاء') || lower.includes('extinguish')) return 'Fire Extinguishing System';
  if (lower.includes('شستی') || lower.includes('call point')) return 'Manual Call Point';
  if (lower.includes('آژیر') || lower.includes('sounder')) return 'Sounder / Beacon';
  if (lower.includes('ماژول') || lower.includes('module')) return 'Interface Module';
  
  const cleaned = typeStr.replace(/[\u0600-\u06FF]/g, '').trim();
  return cleaned || typeStr;
}

export async function exportProposalToDocx(config: ProposalConfig, items: ProposalItem[], template?: ProposalTemplate) {
  const isFa = config.language === 'fa';
  const fontFamily = "Calibri";

  // Helper for item calculations
  const calculateFinalUnitPrice = (item: ProposalItem) => {
    const base = item.customBasePriceEur ?? item.equipment.price ?? 0;
    const m = item.multipliers;
    const compoundMultiplier = m.customsFactor * m.logisticsFactor * m.overheadProfit * m.currencyRisk * m.discountFactor;
    return base * compoundMultiplier;
  };

  const calculateTotalMultiplier = (m: ProposalItem['multipliers']) => {
    return m.customsFactor * m.logisticsFactor * m.overheadProfit * m.currencyRisk * m.discountFactor;
  };

  // Header section
  const headerTitle = template?.header_title || (isFa ? "شرکت مهندسی ایساتیس پارس تجهیز" : "ISATIS PARS TAJHIZ ENGINEERING CO.");
  const headerSubtitle = template?.header_subtitle || (isFa ? "پیشنهاد فنی و مالی سیستم‌های اعلام و اطفاء حریق (F&G)" : "Technical & Commercial Proposal - Fire & Gas Systems");

  const children: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: headerTitle,
          bold: true,
          size: 32,
          color: "1E3A8A",
          font: fontFamily
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: headerSubtitle,
          size: 24,
          color: "475569",
          font: fontFamily
        })
      ]
    }),
    new Paragraph({ text: "", spacing: { after: 200 } }),

    // Metadata Table / Lines
    new Paragraph({
      children: [
        new TextRun({ text: (isFa ? "عنوان پروژه: " : "Project Title: "), bold: true, font: fontFamily }),
        new TextRun({ text: config.title || "-", font: fontFamily }),
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: (isFa ? "نام خریدار / کارفرما: " : "Client / Customer: "), bold: true, font: fontFamily }),
        new TextRun({ text: config.clientName || "-", font: fontFamily }),
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: (isFa ? "کد استعلام / پروژه: " : "Reference Code: "), bold: true, font: fontFamily }),
        new TextRun({ text: config.projectCode || "-", font: fontFamily }),
        new TextRun({ text: " | ", font: fontFamily }),
        new TextRun({ text: (isFa ? "تاریخ: " : "Date: "), bold: true, font: fontFamily }),
        new TextRun({ text: config.date || new Date().toISOString().slice(0, 10), font: fontFamily }),
      ]
    }),
    new Paragraph({ text: "", spacing: { after: 300 } }),
  ];

  // Clean intro text if present
  const cleanIntroText = config.introText 
    ? config.introText.replace(/\*\*/g, '').replace(/###\s*/g, '').replace(/##\s*/g, '').replace(/\*/g, '') 
    : '';

  // Intro text if available
  if (cleanIntroText) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: isFa ? "مقدمه و شرح کلی پیشنهاد:" : "Executive Summary:", bold: true, size: 24, color: "1E40AF", font: fontFamily })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: cleanIntroText, size: 20, font: fontFamily })
        ],
        spacing: { after: 300 }
      })
    );
  }

  // Equipment Specifications Table
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: isFa ? "جدول مشخصات فنی تجهیزات (Bill of Quantities):" : "Technical Bill of Quantities (BOQ):", bold: true, size: 24, color: "1E40AF", font: fontFamily })
      ],
      spacing: { after: 150 }
    })
  );

  // Define Table Headers
  const tableHeaders = [
    isFa ? "ردیف" : "Item",
    isFa ? "پارت نامبر" : "Part Number",
    isFa ? "شماره / رفرنس نقشه" : "DWG Ref / Tag",
    isFa ? "برند سازنده" : "Brand",
    isFa ? "نوع تجهیز" : "Equipment Type",
    isFa ? "مرجع NFPA" : "NFPA Ref",
    isFa ? "تعداد" : "Qty"
  ];

  if (config.showPrices) {
    tableHeaders.push(isFa ? `قیمت واحد (${config.currency})` : `Unit Price (${config.currency})`);
    tableHeaders.push(isFa ? `قیمت کل (${config.currency})` : `Total Price (${config.currency})`);
  }

  const headerCells = tableHeaders.map(h => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", font: fontFamily })], alignment: AlignmentType.CENTER })],
    shading: { fill: "1E3A8A" },
    width: { size: Math.floor(10000 / tableHeaders.length), type: WidthType.DXA }
  }));

  const tableRows = [new TableRow({ children: headerCells })];

  let grandTotal = 0;

  items.forEach((item, index) => {
    const unitPrice = calculateFinalUnitPrice(item);
    const lineTotal = unitPrice * item.quantity;
    grandTotal += lineTotal;

    const eqType = translateEquipmentType(item.equipment.equipment_type, isFa);
    const dwgRefText = item.drawingRef || item.tagNumber || item.equipment.drawing_ref || "-";

    const rowCells = [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(index + 1), font: fontFamily })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.equipment.part_number, font: fontFamily })], alignment: AlignmentType.LEFT })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: dwgRefText, font: fontFamily })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.equipment.brand, font: fontFamily })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: eqType, font: fontFamily })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.equipment.nfpa_reference || "-", font: fontFamily })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(item.quantity), font: fontFamily })], alignment: AlignmentType.CENTER })] }),
    ];

    if (config.showPrices) {
      rowCells.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: unitPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }), font: fontFamily })], alignment: AlignmentType.RIGHT })] }));
      rowCells.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: lineTotal.toLocaleString('en-US', { maximumFractionDigits: 2 }), font: fontFamily })], alignment: AlignmentType.RIGHT })] }));
    }

    tableRows.push(new TableRow({ children: rowCells }));
  });

  children.push(
    new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE }
    })
  );

  // Grand total summary
  if (config.showPrices) {
    children.push(
      new Paragraph({ text: "", spacing: { after: 150 } }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: (isFa ? "مبلغ کل پیش‌فاکتور / پروپوزال: " : "Grand Total: "), bold: true, size: 24, font: fontFamily }),
          new TextRun({ text: `${grandTotal.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${config.currency}`, bold: true, size: 24, color: "047857", font: fontFamily })
        ]
      })
    );
  }

  // Price Analysis Table Breakdown if enabled
  if (config.showPrices && config.showPriceAnalysis) {
    children.push(
      new Paragraph({ text: "", spacing: { after: 300 } }),
      new Paragraph({
        children: [
          new TextRun({ text: isFa ? "جدول شفاف آنالیز قیمت و ضرایب اعمال‌شده:" : "Transparent Price Analysis & Multiplier Breakdown:", bold: true, size: 24, color: "B45309", font: fontFamily })
        ],
        spacing: { after: 150 }
      })
    );

    const analysisHeaders = [
      isFa ? "پارت نامبر" : "Part Number",
      isFa ? "قیمت پایه خرید" : "Base Purchase",
      isFa ? "ضریب گمرک" : "Customs",
      isFa ? "حمل/بیمه" : "Logistics",
      isFa ? "سود/بالاسری" : "Overhead",
      isFa ? "ریسک ارز" : "Currency",
      isFa ? "تخفیف" : "Discount",
      isFa ? "ضریب نهایی" : "Total Factor",
      isFa ? "قیمت پیشنهادی" : "Final Selling"
    ];

    const analysisHeaderCells = analysisHeaders.map(h => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 16, color: "FFFFFF", font: fontFamily })], alignment: AlignmentType.CENTER })],
      shading: { fill: "78350F" }
    }));

    const analysisRows = [new TableRow({ children: analysisHeaderCells })];

    items.forEach(item => {
      const base = item.customBasePriceEur ?? item.equipment.price ?? 0;
      const m = item.multipliers;
      const totalFactor = calculateTotalMultiplier(m);
      const finalPrice = base * totalFactor;

      analysisRows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.equipment.part_number, font: fontFamily })], alignment: AlignmentType.LEFT })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${base.toLocaleString()} ${config.currency}`, font: fontFamily })], alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${m.customsFactor}x`, font: fontFamily })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${m.logisticsFactor}x`, font: fontFamily })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${m.overheadProfit}x`, font: fontFamily })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${m.currencyRisk}x`, font: fontFamily })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${m.discountFactor}x`, font: fontFamily })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${totalFactor.toFixed(3)}x`, font: fontFamily })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${finalPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${config.currency}`, font: fontFamily })], alignment: AlignmentType.RIGHT })] })
        ]
      }));
    });

    children.push(
      new Table({
        rows: analysisRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      })
    );
  }

  // Terms and Conditions Section
  children.push(
    new Paragraph({ text: "", spacing: { after: 300 } }),
    new Paragraph({
      children: [
        new TextRun({ text: isFa ? "شرایط و الزامات تجاری پیشنهاد:" : "Terms & Commercial Conditions:", bold: true, size: 24, color: "1E3A8A", font: fontFamily })
      ],
      spacing: { after: 150 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: (isFa ? "• زمان تحویل: " : "• Delivery Time: "), bold: true, font: fontFamily }),
        new TextRun({ text: config.deliveryTime || (isFa ? "طبق توافق خریدار و فروشنده" : "As per agreement"), font: fontFamily })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: (isFa ? "• شرایط پرداخت: " : "• Payment Terms: "), bold: true, font: fontFamily }),
        new TextRun({ text: config.paymentTerms || (isFa ? "۵۰٪ پیش‌پرداخت، ۵۰٪ هنگام تحویل" : "50% Advance, 50% Upon Delivery"), font: fontFamily })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: (isFa ? "• مدت اعتبار پیشنهاد: " : "• Validity Period: "), bold: true, font: fontFamily }),
        new TextRun({ text: config.validityDays ? `${config.validityDays} ${isFa ? 'روز' : 'days'}` : (isFa ? "۳۰ روز کاری" : "30 Working Days"), font: fontFamily })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: (isFa ? "• گارانتی و خدمات: " : "• Warranty: "), bold: true, font: fontFamily }),
        new TextRun({ text: config.warranty || (isFa ? "۱۲ ماه گارانتی و ۱۰ سال خدمات پس از فروش" : "12 Months Warranty"), font: fontFamily })
      ]
    })
  );

  // Technical Notes from Template
  if (template?.technical_notes) {
    children.push(
      new Paragraph({ text: "", spacing: { after: 200 } }),
      new Paragraph({
        children: [
          new TextRun({ text: isFa ? "الزامات فنی و استانداردها:" : "Technical Compliance Notes:", bold: true, size: 24, color: "1E3A8A", font: fontFamily })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: template.technical_notes, font: fontFamily })
        ]
      })
    );
  }

  // Signature Block
  const sig = template?.signature_section || {
    prepared_by_title: isFa ? 'کارشناس ارشد مهندسی فروش' : 'Sales Engineering Specialist',
    approved_by_title: isFa ? 'مدیریت مهندسی و بازرگانی' : 'Engineering & Commercial Director',
    company_seal_text: isFa ? 'شرکت مهندسی ایساتیس پارس تجهیز' : 'Isatis Pars Tajhiz Eng. Co.'
  };

  children.push(
    new Paragraph({ text: "", spacing: { after: 400 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: sig.prepared_by_title, bold: true, font: fontFamily })] }),
                new Paragraph({ text: "", spacing: { after: 300 } }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "...................................", font: fontFamily })] })
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: sig.approved_by_title, bold: true, font: fontFamily })] }),
                new Paragraph({ text: "", spacing: { after: 300 } }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "...................................", font: fontFamily })] })
              ]
            })
          ]
        })
      ]
    })
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: fontFamily,
          },
        },
      },
    },
    sections: [
      {
        properties: {},
        children: children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Proposal_${config.projectCode || 'F_and_G'}_${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

