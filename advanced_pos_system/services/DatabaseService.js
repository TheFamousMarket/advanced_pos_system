/**
 * Database Service for Advanced POS System
 * Handles data persistence and CRUD operations for products, transactions, users, and settings
 */

class DatabaseService {
  /**
   * Create a new DatabaseService
   */
  constructor() {
    this.products = {};
    this.transactions = {};
    this.users = {};
    this.settings = {};
    this.initialized = false;
  }

  /**
   * Initialize the database
   * @returns {boolean} Success status
   */
  initialize() {
    try {
      // Load data from localStorage if available
      if (typeof localStorage !== 'undefined') {
        this.loadFromLocalStorage();
      }

      // Create default admin user if no users exist
      if (Object.keys(this.users).length === 0) {
        const User = require('../models/User');
        const bcrypt = require('bcryptjs') || { hashSync: pwd => pwd }; // Fallback if bcryptjs is not available
        
        const adminUser = new User({
          username: 'admin',
          passwordHash: bcrypt.hashSync('admin123', 10),
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com',
          role: 'admin'
        });
        
        this.users[adminUser.id] = adminUser.toObject();
      }

      // Create default settings if they don't exist
      if (Object.keys(this.settings).length === 0) {
        this.settings = {
          storeName: 'Advanced POS Store',
          storeId: 'store_' + Date.now(),
          taxRate: 7.5,
          currency: 'USD',
          theme: 'light',
          visionAIConfidenceThreshold: 0.7,
          receiptHeader: 'Advanced POS Store\n123 Main Street\nAnytown, USA',
          receiptFooter: 'Thank you for shopping with us!',
          lastBackup: null
        };
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing database:', error);
      return false;
    }
  }

  /**
   * Load data from localStorage
   * @returns {boolean} Success status
   */
  loadFromLocalStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const products = localStorage.getItem('pos_products');
        const transactions = localStorage.getItem('pos_transactions');
        const users = localStorage.getItem('pos_users');
        const settings = localStorage.getItem('pos_settings');

        if (products) this.products = JSON.parse(products);
        if (transactions) this.transactions = JSON.parse(transactions);
        if (users) this.users = JSON.parse(users);
        if (settings) this.settings = JSON.parse(settings);
      }
      return true;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return false;
    }
  }

  /**
   * Save data to localStorage
   * @returns {boolean} Success status
   */
  saveToLocalStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('pos_products', JSON.stringify(this.products));
        localStorage.setItem('pos_transactions', JSON.stringify(this.transactions));
        localStorage.setItem('pos_users', JSON.stringify(this.users));
        localStorage.setItem('pos_settings', JSON.stringify(this.settings));
      }
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }

  /**
   * Get all products
   * @returns {Array} Array of products
   */
  getProducts() {
    return Object.values(this.products);
  }

  /**
   * Get product by ID
   * @param {string} id - Product ID
   * @returns {Object|null} Product or null if not found
   */
  getProductById(id) {
    return this.products[id] || null;
  }

  /**
   * Get products by category
   * @param {string} category - Category
   * @returns {Array} Array of products
   */
  getProductsByCategory(category) {
    return Object.values(this.products).filter(product => product.category === category);
  }

  /**
   * Search products
   * @param {string} query - Search query
   * @returns {Array} Array of matching products
   */
  searchProducts(query) {
    if (!query) return this.getProducts();
    
    const lowerQuery = query.toLowerCase();
    return Object.values(this.products).filter(product => {
      return product.name.toLowerCase().includes(lowerQuery) || 
             product.sku.toLowerCase().includes(lowerQuery) ||
             product.category.toLowerCase().includes(lowerQuery) ||
             product.description.toLowerCase().includes(lowerQuery);
    });
  }

  /**
   * Save product
   * @param {Object} product - Product data
   * @returns {boolean} Success status
   */
  saveProduct(product) {
    if (!product || !product.id) {
      return false;
    }

    this.products[product.id] = product;
    this.saveToLocalStorage();
    return true;
  }

  /**
   * Delete product
   * @param {string} id - Product ID
   * @returns {boolean} Success status
   */
  deleteProduct(id) {
    if (!this.products[id]) {
      return false;
    }

    delete this.products[id];
    this.saveToLocalStorage();
    return true;
  }

  /**
   * Get all transactions
   * @returns {Array} Array of transactions
   */
  getTransactions() {
    return Object.values(this.transactions);
  }

  /**
   * Get transaction by ID
   * @param {string} id - Transaction ID
   * @returns {Object|null} Transaction or null if not found
   */
  getTransactionById(id) {
    return this.transactions[id] || null;
  }

  /**
   * Get transactions by status
   * @param {string} status - Transaction status
   * @returns {Array} Array of transactions
   */
  getTransactionsByStatus(status) {
    return Object.values(this.transactions).filter(transaction => transaction.status === status);
  }

  /**
   * Get transactions by date range
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Array} Array of transactions
   */
  getTransactionsByDateRange(startDate, endDate) {
    return Object.values(this.transactions).filter(transaction => {
      const txnDate = new Date(transaction.createdAt);
      return txnDate >= new Date(startDate) && txnDate <= new Date(endDate);
    });
  }

  /**
   * Save transaction
   * @param {Object} transaction - Transaction data
   * @returns {boolean} Success status
   */
  saveTransaction(transaction) {
    if (!transaction || !transaction.id) {
      return false;
    }

    this.transactions[transaction.id] = transaction;
    this.saveToLocalStorage();
    return true;
  }

  /**
   * Delete transaction
   * @param {string} id - Transaction ID
   * @returns {boolean} Success status
   */
  deleteTransaction(id) {
    if (!this.transactions[id]) {
      return false;
    }

    delete this.transactions[id];
    this.saveToLocalStorage();
    return true;
  }

  /**
   * Get all users
   * @returns {Array} Array of users
   */
  getUsers() {
    return Object.values(this.users);
  }

  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Object|null} User or null if not found
   */
  getUserById(id) {
    return this.users[id] || null;
  }

  /**
   * Get user by username
   * @param {string} username - Username
   * @returns {Object|null} User or null if not found
   */
  getUserByUsername(username) {
    return Object.values(this.users).find(user => user.username === username) || null;
  }

  /**
   * Save user
   * @param {Object} user - User data
   * @returns {boolean} Success status
   */
  saveUser(user) {
    if (!user || !user.id) {
      return false;
    }

    this.users[user.id] = user;
    this.saveToLocalStorage();
    return true;
  }

  /**
   * Delete user
   * @param {string} id - User ID
   * @returns {boolean} Success status
   */
  deleteUser(id) {
    if (!this.users[id]) {
      return false;
    }

    delete this.users[id];
    this.saveToLocalStorage();
    return true;
  }

  /**
   * Get setting
   * @param {string} key - Setting key
   * @param {*} defaultValue - Default value if setting not found
   * @returns {*} Setting value
   */
  getSetting(key, defaultValue = null) {
    return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
  }

  /**
   * Save setting
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   * @returns {boolean} Success status
   */
  saveSetting(key, value) {
    if (!key) {
      return false;
    }

    this.settings[key] = value;
    this.saveToLocalStorage();
    return true;
  }

  /**
   * Get all settings
   * @returns {Object} Settings object
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Save all settings
   * @param {Object} settings - Settings object
   * @returns {boolean} Success status
   */
  saveSettings(settings) {
    if (!settings || typeof settings !== 'object') {
      return false;
    }

    this.settings = { ...settings };
    this.saveToLocalStorage();
    return true;
  }

  /**
   * Create backup
   * @returns {Object} Backup data
   */
  createBackup() {
    const backup = {
      products: this.products,
      transactions: this.transactions,
      users: this.users,
      settings: this.settings,
      timestamp: new Date().toISOString()
    };

    this.settings.lastBackup = backup.timestamp;
    this.saveToLocalStorage();

    return backup;
  }

  /**
   * Restore from backup
   * @param {Object} backup - Backup data
   * @returns {boolean} Success status
   */
  restoreFromBackup(backup) {
    if (!backup || !backup.timestamp) {
      return false;
    }

    try {
      this.products = backup.products || {};
      this.transactions = backup.transactions || {};
      this.users = backup.users || {};
      this.settings = backup.settings || {};
      this.saveToLocalStorage();
      return true;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      return false;
    }
  }
}

// Export the DatabaseService class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DatabaseService;
}
