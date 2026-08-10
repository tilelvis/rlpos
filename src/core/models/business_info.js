// Business info model (port of lib/core/models/business_info.dart).

import { DEFAULT_BUSINESS } from '../constants.js';

export class BusinessInfo {
  constructor({
    name,
    address,
    phone,
    footerMessage,
    logoBase64 = null,
    preferredPaper = 'mm58',
    currencySymbol = 'KES',
    taxId = '',
    taxRate = 0.0,
    paybillNumber = '',
    tillNumber = '',
    secondCopyLabel = 'BUSINESS COPY',
  }) {
    this.name = name;
    this.address = address;
    this.phone = phone;
    this.footerMessage = footerMessage;
    this.logoBase64 = logoBase64;
    this.preferredPaper = preferredPaper;
    this.currencySymbol = currencySymbol;
    this.taxId = taxId;
    this.taxRate = taxRate;
    this.paybillNumber = paybillNumber;
    this.tillNumber = tillNumber;
    this.secondCopyLabel = secondCopyLabel;
  }

  toMap() {
    return {
      name: this.name,
      address: this.address,
      phone: this.phone,
      footerMessage: this.footerMessage,
      logoBase64: this.logoBase64,
      preferredPaper: this.preferredPaper,
      currencySymbol: this.currencySymbol,
      taxId: this.taxId,
      taxRate: this.taxRate,
      paybillNumber: this.paybillNumber,
      tillNumber: this.tillNumber,
      secondCopyLabel: this.secondCopyLabel,
    };
  }

  static defaults() {
    return new BusinessInfo({
      name: DEFAULT_BUSINESS.name,
      address: DEFAULT_BUSINESS.address,
      phone: DEFAULT_BUSINESS.phone,
      footerMessage: DEFAULT_BUSINESS.footerMessage,
    });
  }

  static fromMap(m) {
    return new BusinessInfo({
      name: m.name,
      address: m.address,
      phone: m.phone,
      footerMessage: m.footerMessage,
      logoBase64: m.logoBase64 ?? null,
      preferredPaper: m.preferredPaper ?? 'mm58',
      currencySymbol: m.currencySymbol ?? 'KES',
      taxId: m.taxId ?? '',
      taxRate: m.taxRate ?? 0.0,
      paybillNumber: m.paybillNumber ?? '',
      tillNumber: m.tillNumber ?? '',
      secondCopyLabel: m.secondCopyLabel ?? 'BUSINESS COPY',
    });
  }
}
