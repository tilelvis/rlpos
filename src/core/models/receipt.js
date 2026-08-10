// Receipt model + paper-width + copy-type enums (port of lib/core/models/receipt.dart).

import { Order } from './order.js';

export const RECEIPT_COPY_TYPES = {
  customer: 'customer',
  business: 'business',
};

export class Receipt {
  constructor({
    id,
    receiptNumber,
    orderId,
    orderNumber,
    cashierName,
    issuedAt,
    total,
    itemsSnapshot,
    businessName,
    businessAddress,
    businessPhone,
    footerMessage,
    paperWidth = 'mm58',
    reprintCount = 0,
    lastReprintedAt = null,
    paybillNumber = '',
    tillNumber = '',
    secondCopyLabel = 'BUSINESS COPY',
  }) {
    this.id = id;
    this.receiptNumber = receiptNumber;
    this.orderId = orderId;
    this.orderNumber = orderNumber;
    this.cashierName = cashierName;
    this.issuedAt = issuedAt;
    this.total = total;
    this.itemsSnapshot = itemsSnapshot;
    this.businessName = businessName;
    this.businessAddress = businessAddress;
    this.businessPhone = businessPhone;
    this.footerMessage = footerMessage;
    this.paperWidth = paperWidth;
    this.reprintCount = reprintCount;
    this.lastReprintedAt = lastReprintedAt;
    this.paybillNumber = paybillNumber;
    this.tillNumber = tillNumber;
    this.secondCopyLabel = secondCopyLabel;
  }

  // Reconstruct line items from the stored snapshot.
  get lineItems() {
    return (this.itemsSnapshot || []).map((m) => ({
      name: m.name,
      quantity: Number(m.quantity),
      unitPrice: Number(m.unitPrice),
      lineTotal: Number(m.unitPrice) * Number(m.quantity),
    }));
  }

  copyWith({ paperWidth, reprintCount, lastReprintedAt } = {}) {
    return new Receipt({
      id: this.id,
      receiptNumber: this.receiptNumber,
      orderId: this.orderId,
      orderNumber: this.orderNumber,
      cashierName: this.cashierName,
      issuedAt: this.issuedAt,
      total: this.total,
      itemsSnapshot: this.itemsSnapshot,
      businessName: this.businessName,
      businessAddress: this.businessAddress,
      businessPhone: this.businessPhone,
      footerMessage: this.footerMessage,
      paperWidth: paperWidth ?? this.paperWidth,
      reprintCount: reprintCount ?? this.reprintCount,
      lastReprintedAt: lastReprintedAt ?? this.lastReprintedAt,
      paybillNumber: this.paybillNumber,
      tillNumber: this.tillNumber,
      secondCopyLabel: this.secondCopyLabel,
    });
  }

  copyWithReprint() {
    return this.copyWith({
      reprintCount: this.reprintCount + 1,
      lastReprintedAt: new Date().toISOString(),
    });
  }

  static fromOrder({ id, receiptNumber, order, businessInfo }) {
    return new Receipt({
      id,
      receiptNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      cashierName: order.cashierName,
      issuedAt: order.completedAt ?? new Date().toISOString(),
      total: order.total,
      itemsSnapshot: order.items.map((i) => i.toMap()),
      businessName: businessInfo.name,
      businessAddress: businessInfo.address,
      businessPhone: businessInfo.phone,
      footerMessage: businessInfo.footerMessage,
      paperWidth: businessInfo.preferredPaper,
      paybillNumber: businessInfo.paybillNumber,
      tillNumber: businessInfo.tillNumber,
      secondCopyLabel: businessInfo.secondCopyLabel,
    });
  }

  toMap() {
    return {
      id: this.id,
      receiptNumber: this.receiptNumber,
      orderId: this.orderId,
      orderNumber: this.orderNumber,
      cashierName: this.cashierName,
      issuedAt: this.issuedAt,
      total: this.total,
      itemsSnapshot: this.itemsSnapshot,
      businessName: this.businessName,
      businessAddress: this.businessAddress,
      businessPhone: this.businessPhone,
      footerMessage: this.footerMessage,
      paperWidth: this.paperWidth,
      reprintCount: this.reprintCount,
      lastReprintedAt: this.lastReprintedAt,
      paybillNumber: this.paybillNumber,
      tillNumber: this.tillNumber,
      secondCopyLabel: this.secondCopyLabel,
    };
  }

  static fromMap(m) {
    return new Receipt({
      id: m.id,
      receiptNumber: m.receiptNumber,
      orderId: m.orderId,
      orderNumber: m.orderNumber,
      cashierName: m.cashierName,
      issuedAt: m.issuedAt,
      total: m.total,
      itemsSnapshot: m.itemsSnapshot || [],
      businessName: m.businessName,
      businessAddress: m.businessAddress,
      businessPhone: m.businessPhone,
      footerMessage: m.footerMessage,
      paperWidth: m.paperWidth ?? 'mm58',
      reprintCount: m.reprintCount ?? 0,
      lastReprintedAt: m.lastReprintedAt ?? null,
      paybillNumber: m.paybillNumber ?? '',
      tillNumber: m.tillNumber ?? '',
      secondCopyLabel: m.secondCopyLabel ?? 'BUSINESS COPY',
    });
  }
}
