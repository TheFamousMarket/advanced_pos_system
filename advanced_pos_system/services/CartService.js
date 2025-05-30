/**
 * Cart Service for Advanced POS System
 * Handles shopping cart functionality and checkout process
 */

class CartService {
  /**
   * Create a new CartService
   * @param {Object} databaseService - Database service instance
   */
  constructor(databaseService) {
    this.db = databaseService;
    this.items = [];
    this.subtotal = 0;
    this.taxAmount = 0;
    this.discountAmount = 0;
    this.total = 0;
    this.customerId = null;
    this.notes = '';
    this.initialized = false;
  }

  /**
   * Initialize the cart service
   * @returns {boolean} Success status
   */
  initialize() {
    try {
      this.clearCart();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing cart service:', error);
      return false;
    }
  }

  /**
   * Add item to cart
   * @param {string} productId - Product ID
   * @param {number} quantity - Quantity to add
   * @param {string} recognitionMethod - How the product was recognized (manual, vision, barcode)
   * @param {number} recognitionConfidence - Confidence level for recognition (0-1)
   * @returns {Object} Result with success status and message
   */
  addItem(productId, quantity = 1, recognitionMethod = 'manual', recognitionConfidence = 1) {
    try {
      // Get product from database
      const product = this.db.getProductById(productId);
      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        };
      }

      // Check if quantity is valid
      if (quantity <= 0) {
        return {
          success: false,
          message: 'Quantity must be greater than zero'
        };
      }

      // Check if product is in stock
      if (product.stock < quantity) {
        return {
          success: false,
          message: 'Insufficient stock'
        };
      }

      // Check if item already exists in cart
      const existingItemIndex = this.items.findIndex(item => item.productId === productId);

      if (existingItemIndex >= 0) {
        // Update existing item
        this.items[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        this.items.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          taxRate: product.taxRate || 0,
          quantity: quantity,
          recognitionMethod: recognitionMethod,
          recognitionConfidence: recognitionConfidence
        });
      }

      // Recalculate totals
      this.calculateTotals();

      return {
        success: true,
        message: 'Item added to cart',
        item: this.items.find(item => item.productId === productId)
      };
    } catch (error) {
      console.error('Error adding item to cart:', error);
      return {
        success: false,
        message: 'Failed to add item to cart'
      };
    }
  }

  /**
   * Remove item from cart
   * @param {string} productId - Product ID
   * @returns {Object} Result with success status and message
   */
  removeItem(productId) {
    try {
      const initialLength = this.items.length;
      this.items = this.items.filter(item => item.productId !== productId);

      if (this.items.length === initialLength) {
        return {
          success: false,
          message: 'Item not found in cart'
        };
      }

      // Recalculate totals
      this.calculateTotals();

      return {
        success: true,
        message: 'Item removed from cart'
      };
    } catch (error) {
      console.error('Error removing item from cart:', error);
      return {
        success: false,
        message: 'Failed to remove item from cart'
      };
    }
  }

  /**
   * Update item quantity
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @returns {Object} Result with success status and message
   */
  updateItemQuantity(productId, quantity) {
    try {
      // If quantity is zero or negative, remove item
      if (quantity <= 0) {
        return this.removeItem(productId);
      }

      // Find item in cart
      const item = this.items.find(item => item.productId === productId);
      if (!item) {
        return {
          success: false,
          message: 'Item not found in cart'
        };
      }

      // Check if product is in stock
      const product = this.db.getProductById(productId);
      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        };
      }

      if (product.stock < quantity) {
        return {
          success: false,
          message: 'Insufficient stock'
        };
      }

      // Update quantity
      item.quantity = quantity;

      // Recalculate totals
      this.calculateTotals();

      return {
        success: true,
        message: 'Item quantity updated',
        item
      };
    } catch (error) {
      console.error('Error updating item quantity:', error);
      return {
        success: false,
        message: 'Failed to update item quantity'
      };
    }
  }

  /**
   * Calculate cart totals
   * @returns {Object} Cart totals
   */
  calculateTotals() {
    try {
      // Calculate subtotal
      this.subtotal = this.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      // Calculate tax amount
      this.taxAmount = this.items.reduce((sum, item) => {
        const itemTax = item.taxRate ? item.price * item.quantity * (item.taxRate / 100) : 0;
        return sum + itemTax;
      }, 0);

      // Calculate total
      this.total = this.subtotal + this.taxAmount - this.discountAmount;

      // Round to 2 decimal places
      this.subtotal = parseFloat(this.subtotal.toFixed(2));
      this.taxAmount = parseFloat(this.taxAmount.toFixed(2));
      this.total = parseFloat(this.total.toFixed(2));

      return {
        subtotal: this.subtotal,
        taxAmount: this.taxAmount,
        discountAmount: this.discountAmount,
        total: this.total
      };
    } catch (error) {
      console.error('Error calculating totals:', error);
      return {
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        total: 0
      };
    }
  }

  /**
   * Apply discount to cart
   * @param {number} amount - Discount amount
   * @returns {Object} Result with success status and message
   */
  applyDiscount(amount) {
    try {
      if (typeof amount !== 'number' || amount < 0) {
        return {
          success: false,
          message: 'Invalid discount amount'
        };
      }

      if (amount > this.subtotal) {
        return {
          success: false,
          message: 'Discount cannot exceed subtotal'
        };
      }

      this.discountAmount = amount;
      this.calculateTotals();

      return {
        success: true,
        message: 'Discount applied',
        discountAmount: this.discountAmount,
        total: this.total
      };
    } catch (error) {
      console.error('Error applying discount:', error);
      return {
        success: false,
        message: 'Failed to apply discount'
      };
    }
  }

  /**
   * Set customer for the cart
   * @param {string} customerId - Customer ID
   * @returns {Object} Result with success status and message
   */
  setCustomer(customerId) {
    try {
      this.customerId = customerId;
      return {
        success: true,
        message: 'Customer set',
        customerId
      };
    } catch (error) {
      console.error('Error setting customer:', error);
      return {
        success: false,
        message: 'Failed to set customer'
      };
    }
  }

  /**
   * Add notes to the cart
   * @param {string} notes - Cart notes
   * @returns {Object} Result with success status and message
   */
  addNotes(notes) {
    try {
      this.notes = notes;
      return {
        success: true,
        message: 'Notes added',
        notes
      };
    } catch (error) {
      console.error('Error adding notes:', error);
      return {
        success: false,
        message: 'Failed to add notes'
      };
    }
  }

  /**
   * Clear the cart
   * @returns {Object} Result with success status and message
   */
  clearCart() {
    try {
      this.items = [];
      this.subtotal = 0;
      this.taxAmount = 0;
      this.discountAmount = 0;
      this.total = 0;
      this.customerId = null;
      this.notes = '';

      return {
        success: true,
        message: 'Cart cleared'
      };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return {
        success: false,
        message: 'Failed to clear cart'
      };
    }
  }

  /**
   * Create transaction from cart
   * @param {string} employeeId - Employee ID
   * @param {string} storeId - Store ID
   * @returns {Object} Result with success status, message, and transaction
   */
  createTransaction(employeeId, storeId) {
    try {
      // Check if cart is empty
      if (this.items.length === 0) {
        return {
          success: false,
          message: 'Cart is empty'
        };
      }

      // Check if employee ID is provided
      if (!employeeId) {
        return {
          success: false,
          message: 'Employee ID is required'
        };
      }

      // Check if store ID is provided
      if (!storeId) {
        return {
          success: false,
          message: 'Store ID is required'
        };
      }

      // Create transaction items
      const transactionItems = this.items.map(item => {
        return {
          productId: item.productId,
          name: item.name,
          priceAtSale: item.price,
          taxRateAtSale: item.taxRate,
          quantity: item.quantity,
          recognitionMethod: item.recognitionMethod,
          recognitionConfidence: item.recognitionConfidence
        };
      });

      // Create transaction
      const Transaction = require('../models/Transaction');
      const transaction = new Transaction({
        items: transactionItems,
        subtotal: this.subtotal,
        taxAmount: this.taxAmount,
        discountAmount: this.discountAmount,
        total: this.total,
        status: 'pending',
        customerId: this.customerId,
        employeeId: employeeId,
        storeId: storeId,
        notes: this.notes,
        createdAt: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Transaction created',
        transaction: transaction.toObject()
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return {
        success: false,
        message: 'Failed to create transaction'
      };
    }
  }

  /**
   * Complete checkout process
   * @param {string} employeeId - Employee ID
   * @param {string} storeId - Store ID
   * @param {Array} paymentMethods - Payment methods
   * @returns {Object} Result with success status, message, and transaction
   */
  checkout(employeeId, storeId, paymentMethods) {
    try {
      // Create transaction
      const transactionResult = this.createTransaction(employeeId, storeId);
      if (!transactionResult.success) {
        return transactionResult;
      }

      const transaction = transactionResult.transaction;

      // Check if payment methods are provided
      if (!paymentMethods || !Array.isArray(paymentMethods) || paymentMethods.length === 0) {
        return {
          success: false,
          message: 'Payment methods are required',
          transaction
        };
      }

      // Calculate total payment amount
      const totalPayment = paymentMethods.reduce((sum, method) => {
        return sum + (parseFloat(method.amount) || 0);
      }, 0);

      // Check if payment is sufficient
      if (totalPayment < this.total) {
        return {
          success: false,
          message: 'Insufficient payment amount',
          transaction,
          amountDue: this.total - totalPayment
        };
      }

      // Add payment methods to transaction
      const Transaction = require('../models/Transaction');
      const transactionObj = Transaction.fromObject(transaction);
      
      paymentMethods.forEach(method => {
        transactionObj.addPaymentMethod({
          type: method.type,
          amount: parseFloat(method.amount),
          reference: method.reference || null,
          timestamp: new Date().toISOString()
        });
      });

      // Complete transaction
      transactionObj.complete();

      // Update product stock
      this.items.forEach(item => {
        const product = this.db.getProductById(item.productId);
        if (product) {
          product.stock -= item.quantity;
          this.db.saveProduct(product);
        }
      });

      // Save transaction to database
      this.db.saveTransaction(transactionObj.toObject());

      // Clear cart
      this.clearCart();

      return {
        success: true,
        message: 'Checkout completed',
        transaction: transactionObj.toObject(),
        change: totalPayment - this.total
      };
    } catch (error) {
      console.error('Error during checkout:', error);
      return {
        success: false,
        message: 'Checkout failed'
      };
    }
  }

  /**
   * Get cart summary
   * @returns {Object} Cart summary
   */
  getCartSummary() {
    return {
      items: this.items,
      itemCount: this.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: this.subtotal,
      taxAmount: this.taxAmount,
      discountAmount: this.discountAmount,
      total: this.total,
      customerId: this.customerId,
      notes: this.notes
    };
  }
}

// Export the CartService class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CartService;
}
