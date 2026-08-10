// Receipts provider (port of lib/core/providers/receipt_provider.dart).

import { store, CHANNELS } from '../store.js';
import { StorageService } from '../services/storage.js';

export const ReceiptsProvider = {
  get receipts() {
    return StorageService.receipts;
  },

  findById(id) {
    return StorageService.findReceipt(id);
  },

  findByOrderId(orderId) {
    return StorageService.findReceiptByOrder(orderId);
  },

  /** Increments the reprint counter and persists it. Returns the updated
   *  receipt. */
  async markReprinted(receiptId) {
    const r = StorageService.findReceipt(receiptId);
    if (!r) throw new Error(`Receipt ${receiptId} not found`);
    const updated = r.copyWithReprint();
    await StorageService.upsertReceipt(updated);
    store.bump(CHANNELS.receipts);
    return updated;
  },
};
