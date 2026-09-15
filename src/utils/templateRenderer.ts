import { ProposalConfig, ProposalItem, ProposalTemplate } from '../types';

export function fillTemplateTags(
  templateText: string,
  config: ProposalConfig,
  template?: ProposalTemplate
): string {
  if (!templateText) return '';

  let result = templateText;

  // Standard Replacements
  result = result.replace(/\{\{PROJECT_NAME\}\}/g, config.title || '');
  result = result.replace(/\{\{CLIENT_NAME\}\}/g, config.clientName || '');
  result = result.replace(/\{\{PROJECT_CODE\}\}/g, config.projectCode || '');
  result = result.replace(/\{\{DATE\}\}/g, config.date || '');
  result = result.replace(/\{\{CURRENCY\}\}/g, config.currency || 'EUR');
  result = result.replace(/\{\{TERMS_WARRANTY\}\}/g, config.warranty || template?.warranty_template || '');
  result = result.replace(/\{\{TERMS_PAYMENT\}\}/g, config.paymentTerms || template?.payment_terms_template || '');
  result = result.replace(/\{\{TERMS_DELIVERY\}\}/g, config.deliveryTime || template?.delivery_time_template || '');
  result = result.replace(/\{\{TERMS_VALIDITY\}\}/g, config.validityDays ? `${config.validityDays} روز` : (template?.validity_template || ''));

  return result;
}

export function applyTemplateToConfig(
  template: ProposalTemplate,
  prevConfig: ProposalConfig
): ProposalConfig {
  return {
    ...prevConfig,
    templateId: template.id,
    introText: fillTemplateTags(template.intro_template, prevConfig, template),
    warranty: fillTemplateTags(template.warranty_template, prevConfig, template),
    paymentTerms: fillTemplateTags(template.payment_terms_template, prevConfig, template),
    deliveryTime: fillTemplateTags(template.delivery_time_template, prevConfig, template),
    validityDays: template.validity_template.match(/\d+/)?.[0] || prevConfig.validityDays || '30',
    showPriceAnalysis: template.show_price_analysis_table
  };
}
