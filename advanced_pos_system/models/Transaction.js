/**
 * Transaction Model for Advanced POS System
 * Represents sales transactions with items, payment methods, and status tracking
 */

class Transaction {
  /**
   * Create a new Transaction
   * @param {Object} data - Transaction data
   */
  constructor(data = {}) {
    this.id = data.id || 'txn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    this.items = data.items || [];
    this.subtotal = parseFloat(data.subtotal) || 0;
    this.taxAmount = parseFloat(data.taxAmount) || 0;
    this.discountAmount = parseFloat(data.discountAmount) || 0;
    this.total = parseFloat(data.total) || 0;
    this.status = data.status || 'pending'; // pending, completed, voided
    this.paymentMethods = data.paymentMethods || [];
    this.customerId = data.customerId || null;
    this.employeeId = data.employeeId || null;
    this.storeId = data.storeId || null;
    this.notes = data.notes || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.completedAt = data.completedAt || null;
    this.voidedAt = data.voidedAt || null;
  }

  /**
   * Validate transaction data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.items || !Array.isArray(this.items) || this.items.length === 0) {
      errors.push('Transaction must have at least one item');
    }

    if (this.subtotal < 0) {
      errors.push('Subtotal cannot be negative');
    }

    if (this.taxAmount < 0) {
      errors.push('Tax amount cannot be negative');
    }

    if (this.discountAmount < 0) {
      errors.push('Discount amount cannot be negative');
    }

    if (!this.employeeId) {
      errors.push('Employee ID is required');
    }

    if (!this.storeId) {
      errors.push('Store ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Add item to transaction
   * @param {Object} item - Transaction item
   * @returns {boolean} Success status
   */
  addItem(item) {
    if (!item || !item.productId || !item.name || item.quantity <= 0) {
      return false;
    }

    // Check if item already exists
    const existingItemIndex = this.items.findIndex(i => i.productId === item.productId);

    if (existingItemIndex >= 0) {
      // Update existing item
      this.items[existingItemIndex].quantity += item.quantity;
    } else {
      // Add new item
      this.items.push({
        productId: item.productId,
        name: item.name,
        priceAtSale: parseFloat(item.priceAtSale) || 0,
        taxRateAtSale: parseFloat(item.taxRateAtSale) || 0,
        quantity: parseInt(item.quantity) || 1,
        recognitionMethod: item.recognitionMethod || 'manual',
        recognitionConfidence: parseFloat(item.recognitionConfidence) || 1
      });
    }

    // Recalculate totals
    this.calculateTotals();
    return true;
  }

  /**
   * Remove item from transaction
   * @param {string} productId - Product ID
   * @returns {boolean} Success status
   */
  removeItem(productId) {
    const initialLength = this.items.length;
    this.items = this.items.filter(item => item.productId !== productId);

    if (this.items.length !== initialLength) {
      // Recalculate totals
      this.calculateTotals();
      return true;
    }

    return false;
  }

  /**
   * Update item quantity
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @returns {boolean} Success status
   */
  updateItemQuantity(productId, quantity) {
    if (quantity <= 0) {
      return this.removeItem(productId);
    }

    const item = this.items.find(item => item.productId === productId);

    if (!item) {
      return false;
    }

    item.quantity = quantity;
    this.calculateTotals();
    return true;
  }

  /**
   * Calculate transaction totals
   * @returns {void}
   */
  calculateTotals() {
    // Calculate subtotal
    this.subtotal = this.items.reduce((sum, item) => {
      return sum + (item.priceAtSale * item.quantity);
    }, 0);

    // Calculate tax amount
    this.taxAmount = this.items.reduce((sum, item) => {
      const itemTax = item.taxRateAtSale ? item.priceAtSale * item.quantity * (item.taxRateAtSale / 100) : 0;
      return sum + itemTax;
    }, 0);

    // Calculate total
    this.total = this.subtotal + this.taxAmount - this.discountAmount;

    // Round to 2 decimal places
    this.subtotal = parseFloat(this.subtotal.toFixed(2));
    this.taxAmount = parseFloat(this.taxAmount.toFixed(2));
    this.total = parseFloat(this.total.toFixed(2));
  }

  /**
   * Apply discount to transaction
   * @param {number} amount - Discount amount
   * @returns {boolean} Success status
   */
  applyDiscount(amount) {
    if (typeof amount !== 'number' || amount < 0) {
      return false;
    }

    this.discountAmount = amount;
    this.calculateTotals();
    return true;
  }

  /**
   * Add payment method
   * @param {Object} paymentMethod - Payment method
   * @returns {boolean} Success status
   */
  addPaymentMethod(paymentMethod) {
    if (!paymentMethod || !paymentMethod.type || !paymentMethod.amount) {
      return false;
    }

    this.paymentMethods.push({
      type: paymentMethod.type,
      amount: parseFloat(paymentMethod.amount),
      reference: paymentMethod.reference || null,
      timestamp: paymentMethod.timestamp || new Date().toISOString()
    });

    return true;
  }

  /**
   * Complete transaction
   * @returns {boolean} Success status
   */
  complete() {
    if (this.status !== 'pending') {
      return false;
    }

    // Check if payment is sufficient
    const totalPaid = this.paymentMethods.reduce((sum, method) => sum + method.amount, 0);
    if (totalPaid < this.total) {
      return false;
    }

    this.status = 'completed';
    this.completedAt = new Date().toISOString();
    return true;
  }

  /**
   * Void transaction
   * @param {string} reason - Void reason
   * @returns {boolean} Success status
   */
  void(reason = '') {
    if (this.status === 'voided') {
      return false;
    }

    this.status = 'voided';
    this.voidedAt = new Date().toISOString();
    this.notes += reason ? `\nVoided: ${reason}` : '\nVoided';
    return true;
  }

  /**
   * Convert to plain object
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      items: this.items,
      subtotal: this.subtotal,
      taxAmount: this.taxAmount,
      discountAmount: this.discountAmount,
      total: this.total,
      status: this.status,
      paymentMethods: this.paymentMethods,
      customerId: this.customerId,
      employeeId: this.employeeId,
      storeId: this.storeId,
      notes: this.notes,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      voidedAt: this.voidedAt
    };
  }

  /**
   * Create Transaction from plain object
   * @param {Object} obj - Plain object
   * @returns {Transaction} Transaction instance
   */
  static fromObject(obj) {
    return new Transaction(obj);
  }
}

// Export the Transaction class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Transaction;
}
