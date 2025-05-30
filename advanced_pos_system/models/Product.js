/**
 * Product Model for Advanced POS System
 * Represents inventory items with properties like name, price, SKU, category, and stock level
 */

class Product {
  /**
   * Create a new Product
   * @param {Object} data - Product data
   */
  constructor(data = {}) {
    this.id = data.id || 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    this.name = data.name || '';
    this.price = parseFloat(data.price) || 0;
    this.sku = data.sku || '';
    this.category = data.category || '';
    this.stock = parseInt(data.stock) || 0;
    this.imageSignatures = data.imageSignatures || [];
    this.description = data.description || '';
    this.taxRate = parseFloat(data.taxRate) || 0;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Validate product data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.name) {
      errors.push('Product name is required');
    }

    if (this.price < 0) {
      errors.push('Price cannot be negative');
    }

    if (this.stock < 0) {
      errors.push('Stock cannot be negative');
    }

    if (this.taxRate < 0) {
      errors.push('Tax rate cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Update stock level
   * @param {number} quantity - Quantity to add (positive) or remove (negative)
   * @returns {boolean} Success status
   */
  updateStock(quantity) {
    const newStock = this.stock + quantity;
    
    if (newStock < 0) {
      return false;
    }
    
    this.stock = newStock;
    this.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Add Vision AI signature
   * @param {string} signature - Image signature
   * @returns {boolean} Success status
   */
  addImageSignature(signature) {
    if (!signature) {
      return false;
    }
    
    if (!this.imageSignatures.includes(signature)) {
      this.imageSignatures.push(signature);
      this.updatedAt = new Date().toISOString();
    }
    
    return true;
  }

  /**
   * Remove Vision AI signature
   * @param {string} signature - Image signature
   * @returns {boolean} Success status
   */
  removeImageSignature(signature) {
    const initialLength = this.imageSignatures.length;
    this.imageSignatures = this.imageSignatures.filter(s => s !== signature);
    
    if (this.imageSignatures.length !== initialLength) {
      this.updatedAt = new Date().toISOString();
      return true;
    }
    
    return false;
  }

  /**
   * Check if product is low on stock
   * @param {number} threshold - Low stock threshold
   * @returns {boolean} Is low on stock
   */
  isLowStock(threshold = 5) {
    return this.stock <= threshold;
  }

  /**
   * Update product data
   * @param {Object} data - Product data
   * @returns {boolean} Success status
   */
  update(data) {
    if (data.name !== undefined) this.name = data.name;
    if (data.price !== undefined) this.price = parseFloat(data.price);
    if (data.sku !== undefined) this.sku = data.sku;
    if (data.category !== undefined) this.category = data.category;
    if (data.stock !== undefined) this.stock = parseInt(data.stock);
    if (data.description !== undefined) this.description = data.description;
    if (data.taxRate !== undefined) this.taxRate = parseFloat(data.taxRate);
    
    this.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Convert to plain object
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      price: this.price,
      sku: this.sku,
      category: this.category,
      stock: this.stock,
      imageSignatures: this.imageSignatures,
      description: this.description,
      taxRate: this.taxRate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create Product from plain object
   * @param {Object} obj - Plain object
   * @returns {Product} Product instance
   */
  static fromObject(obj) {
    return new Product(obj);
  }
}

// Export the Product class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Product;
}
