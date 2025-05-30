/**
 * API Service for Advanced POS System
 * Provides a comprehensive set of API endpoints for data access and manipulation
 */

class APIService {
  /**
   * Create a new APIService
   * @param {Object} databaseService - Database service instance
   * @param {Object} authService - Authentication service instance
   */
  constructor(databaseService, authService) {
    this.db = databaseService;
    this.auth = authService;
    this.endpoints = {};
    this.initialized = false;
  }

  /**
   * Initialize the API service
   * @returns {boolean} Success status
   */
  initialize() {
    try {
      // Register endpoints
      this.registerEndpoints();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing API service:', error);
      return false;
    }
  }

  /**
   * Register API endpoints
   * @returns {void}
   */
  registerEndpoints() {
    // Product endpoints
    this.registerEndpoint('GET /api/products', this.getProducts.bind(this), ['products:read']);
    this.registerEndpoint('GET /api/products/:id', this.getProductById.bind(this), ['products:read']);
    this.registerEndpoint('POST /api/products', this.createProduct.bind(this), ['products:create']);
    this.registerEndpoint('PUT /api/products/:id', this.updateProduct.bind(this), ['products:update']);
    this.registerEndpoint('DELETE /api/products/:id', this.deleteProduct.bind(this), ['products:delete']);
    this.registerEndpoint('GET /api/products/category/:category', this.getProductsByCategory.bind(this), ['products:read']);
    this.registerEndpoint('GET /api/products/search/:query', this.searchProducts.bind(this), ['products:read']);

    // Transaction endpoints
    this.registerEndpoint('GET /api/transactions', this.getTransactions.bind(this), ['transactions:read']);
    this.registerEndpoint('GET /api/transactions/:id', this.getTransactionById.bind(this), ['transactions:read']);
    this.registerEndpoint('POST /api/transactions', this.createTransaction.bind(this), ['transactions:create']);
    this.registerEndpoint('PUT /api/transactions/:id', this.updateTransaction.bind(this), ['transactions:update']);
    this.registerEndpoint('POST /api/transactions/:id/complete', this.completeTransaction.bind(this), ['transactions:update']);
    this.registerEndpoint('POST /api/transactions/:id/void', this.voidTransaction.bind(this), ['transactions:void']);

    // User endpoints
    this.registerEndpoint('GET /api/users', this.getUsers.bind(this), ['users:read']);
    this.registerEndpoint('GET /api/users/:id', this.getUserById.bind(this), ['users:read']);
    this.registerEndpoint('POST /api/users', this.createUser.bind(this), ['users:create']);
    this.registerEndpoint('PUT /api/users/:id', this.updateUser.bind(this), ['users:update']);
    this.registerEndpoint('DELETE /api/users/:id', this.deleteUser.bind(this), ['users:delete']);
    this.registerEndpoint('POST /api/users/:id/reset-password', this.resetUserPassword.bind(this), ['users:update']);

    // Authentication endpoints
    this.registerEndpoint('POST /api/auth/login', this.login.bind(this), []);
    this.registerEndpoint('POST /api/auth/logout', this.logout.bind(this), []);
    this.registerEndpoint('GET /api/auth/current-user', this.getCurrentUser.bind(this), []);
    this.registerEndpoint('POST /api/auth/change-password', this.changePassword.bind(this), []);

    // Settings endpoints
    this.registerEndpoint('GET /api/settings', this.getSettings.bind(this), ['settings:read']);
    this.registerEndpoint('PUT /api/settings', this.updateSettings.bind(this), ['settings:update']);
    this.registerEndpoint('GET /api/settings/:key', this.getSetting.bind(this), ['settings:read']);
    this.registerEndpoint('PUT /api/settings/:key', this.updateSetting.bind(this), ['settings:update']);

    // Vision AI endpoints
    this.registerEndpoint('POST /api/vision/process', this.processImage.bind(this), ['products:read']);
    this.registerEndpoint('POST /api/vision/train', this.trainModel.bind(this), ['products:update']);
    this.registerEndpoint('GET /api/vision/model-info', this.getModelInfo.bind(this), ['products:read']);
    this.registerEndpoint('PUT /api/vision/threshold', this.setConfidenceThreshold.bind(this), ['settings:update']);
  }

  /**
   * Register an API endpoint
   * @param {string} path - Endpoint path
   * @param {Function} handler - Endpoint handler
   * @param {Array} permissions - Required permissions
   * @returns {void}
   */
  registerEndpoint(path, handler, permissions = []) {
    this.endpoints[path] = {
      handler,
      permissions
    };
  }

  /**
   * Handle API request
   * @param {string} path - Request path
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async handleRequest(path, params = {}, data = {}) {
    try {
      // Extract endpoint pattern from path
      const pathParts = path.split(' ');
      const method = pathParts[0];
      const pathPattern = pathParts[1];

      // Find matching endpoint
      const endpoint = this.findEndpoint(method, pathPattern, params);
      if (!endpoint) {
        return {
          success: false,
          status: 404,
          message: 'Endpoint not found'
        };
      }

      // Check authentication for protected endpoints
      if (endpoint.permissions.length > 0) {
        if (!this.auth.isAuthenticated()) {
          return {
            success: false,
            status: 401,
            message: 'Authentication required'
          };
        }

        // Check permissions
        const hasPermission = endpoint.permissions.every(permission => this.auth.hasPermission(permission));
        if (!hasPermission) {
          return {
            success: false,
            status: 403,
            message: 'Permission denied'
          };
        }
      }

      // Call endpoint handler
      const result = await endpoint.handler(params, data);
      return result;
    } catch (error) {
      console.error('Error handling API request:', error);
      return {
        success: false,
        status: 500,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Find matching endpoint
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @param {Object} params - Path parameters
   * @returns {Object|null} Matching endpoint
   */
  findEndpoint(method, path, params) {
    // Try exact match first
    const exactPath = `${method} ${path}`;
    if (this.endpoints[exactPath]) {
      return this.endpoints[exactPath];
    }

    // Try pattern matching
    for (const [pattern, endpoint] of Object.entries(this.endpoints)) {
      const patternParts = pattern.split(' ');
      const patternMethod = patternParts[0];
      const patternPath = patternParts[1];

      // Check method
      if (patternMethod !== method) {
        continue;
      }

      // Check path pattern
      const match = this.matchPathPattern(patternPath, path);
      if (match) {
        // Add path parameters to params
        Object.assign(params, match);
        return endpoint;
      }
    }

    return null;
  }

  /**
   * Match path pattern
   * @param {string} pattern - Path pattern
   * @param {string} path - Request path
   * @returns {Object|null} Path parameters
   */
  matchPathPattern(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    // Check if number of parts match
    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params = {};

    // Check each part
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      // Check if part is a parameter
      if (patternPart.startsWith(':')) {
        const paramName = patternPart.substring(1);
        params[paramName] = pathPart;
      } else if (patternPart !== pathPart) {
        // Parts don't match
        return null;
      }
    }

    return params;
  }

  // Product endpoints

  /**
   * Get all products
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async getProducts(params, data) {
    try {
      const products = this.db.getProducts();
      return {
        success: true,
        status: 200,
        data: products
      };
    } catch (error) {
      console.error('Error getting products:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to get products'
      };
    }
  }

  /**
   * Get product by ID
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async getProductById(params, data) {
    try {
      const product = this.db.getProductById(params.id);
      if (!product) {
        return {
          success: false,
          status: 404,
          message: 'Product not found'
        };
      }

      return {
        success: true,
        status: 200,
        data: product
      };
    } catch (error) {
      console.error('Error getting product:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to get product'
      };
    }
  }

  /**
   * Create product
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async createProduct(params, data) {
    try {
      // Validate product data
      if (!data.name || data.price === undefined) {
        return {
          success: false,
          status: 400,
          message: 'Name and price are required'
        };
      }

      // Create product
      const Product = require('../models/Product');
      const product = new Product(data);

      // Validate product
      const validation = product.validate();
      if (!validation.isValid) {
        return {
          success: false,
          status: 400,
          message: validation.errors.join(', ')
        };
      }

      // Save product
      const saved = this.db.saveProduct(product.toObject());
      if (!saved) {
        return {
          success: false,
          status: 500,
          message: 'Failed to save product'
        };
      }

      return {
        success: true,
        status: 201,
        data: product.toObject()
      };
    } catch (error) {
      console.error('Error creating product:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to create product'
      };
    }
  }

  /**
   * Update product
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async updateProduct(params, data) {
    try {
      // Get product
      const existingProduct = this.db.getProductById(params.id);
      if (!existingProduct) {
        return {
          success: false,
          status: 404,
          message: 'Product not found'
        };
      }

      // Update product
      const Product = require('../models/Product');
      const product = Product.fromObject(existingProduct);
      product.update(data);

      // Validate product
      const validation = product.validate();
      if (!validation.isValid) {
        return {
          success: false,
          status: 400,
          message: validation.errors.join(', ')
        };
      }

      // Save product
      const saved = this.db.saveProduct(product.toObject());
      if (!saved) {
        return {
          success: false,
          status: 500,
          message: 'Failed to save product'
        };
      }

      return {
        success: true,
        status: 200,
        data: product.toObject()
      };
    } catch (error) {
      console.error('Error updating product:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to update product'
      };
    }
  }

  /**
   * Delete product
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async deleteProduct(params, data) {
    try {
      // Check if product exists
      const product = this.db.getProductById(params.id);
      if (!product) {
        return {
          success: false,
          status: 404,
          message: 'Product not found'
        };
      }

      // Delete product
      const deleted = this.db.deleteProduct(params.id);
      if (!deleted) {
        return {
          success: false,
          status: 500,
          message: 'Failed to delete product'
        };
      }

      return {
        success: true,
        status: 200,
        message: 'Product deleted'
      };
    } catch (error) {
      console.error('Error deleting product:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to delete product'
      };
    }
  }

  /**
   * Get products by category
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async getProductsByCategory(params, data) {
    try {
      const products = this.db.getProductsByCategory(params.category);
      return {
        success: true,
        status: 200,
        data: products
      };
    } catch (error) {
      console.error('Error getting products by category:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to get products'
      };
    }
  }

  /**
   * Search products
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async searchProducts(params, data) {
    try {
      const products = this.db.searchProducts(params.query);
      return {
        success: true,
        status: 200,
        data: products
      };
    } catch (error) {
      console.error('Error searching products:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to search products'
      };
    }
  }

  // Transaction endpoints

  /**
   * Get all transactions
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async getTransactions(params, data) {
    try {
      const transactions = this.db.getTransactions();
      return {
        success: true,
        status: 200,
        data: transactions
      };
    } catch (error) {
      console.error('Error getting transactions:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to get transactions'
      };
    }
  }

  /**
   * Get transaction by ID
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async getTransactionById(params, data) {
    try {
      const transaction = this.db.getTransactionById(params.id);
      if (!transaction) {
        return {
          success: false,
          status: 404,
          message: 'Transaction not found'
        };
      }

      return {
        success: true,
        status: 200,
        data: transaction
      };
    } catch (error) {
      console.error('Error getting transaction:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to get transaction'
      };
    }
  }

  /**
   * Create transaction
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async createTransaction(params, data) {
    try {
      // Validate transaction data
      if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        return {
          success: false,
          status: 400,
          message: 'Transaction must have at least one item'
        };
      }

      // Create transaction
      const Transaction = require('../models/Transaction');
      const transaction = new Transaction(data);

      // Validate transaction
      const validation = transaction.validate();
      if (!validation.isValid) {
        return {
          success: false,
          status: 400,
          message: validation.errors.join(', ')
        };
      }

      // Save transaction
      const saved = this.db.saveTransaction(transaction.toObject());
      if (!saved) {
        return {
          success: false,
          status: 500,
          message: 'Failed to save transaction'
        };
      }

      return {
        success: true,
        status: 201,
        data: transaction.toObject()
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to create transaction'
      };
    }
  }

  /**
   * Update transaction
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async updateTransaction(params, data) {
    try {
      // Get transaction
      const existingTransaction = this.db.getTransactionById(params.id);
      if (!existingTransaction) {
        return {
          success: false,
          status: 404,
          message: 'Transaction not found'
        };
      }

      // Check if transaction is completed or voided
      if (existingTransaction.status === 'completed' || existingTransaction.status === 'voided') {
        return {
          success: false,
          status: 400,
          message: 'Cannot update completed or voided transaction'
        };
      }

      // Update transaction
      const Transaction = require('../models/Transaction');
      const transaction = Transaction.fromObject({
        ...existingTransaction,
        ...data,
        id: existingTransaction.id // Ensure ID doesn't change
      });

      // Validate transaction
      const validation = transaction.validate();
      if (!validation.isValid) {
        return {
          success: false,
          status: 400,
          message: validation.errors.join(', ')
        };
      }

      // Save transaction
      const saved = this.db.saveTransaction(transaction.toObject());
      if (!saved) {
        return {
          success: false,
          status: 500,
          message: 'Failed to save transaction'
        };
      }

      return {
        success: true,
        status: 200,
        data: transaction.toObject()
      };
    } catch (error) {
      console.error('Error updating transaction:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to update transaction'
      };
    }
  }

  /**
   * Complete transaction
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async completeTransaction(params, data) {
    try {
      // Get transaction
      const existingTransaction = this.db.getTransactionById(params.id);
      if (!existingTransaction) {
        return {
          success: false,
          status: 404,
          message: 'Transaction not found'
        };
      }

      // Check if transaction is already completed or voided
      if (existingTransaction.status === 'completed') {
        return {
          success: false,
          status: 400,
          message: 'Transaction is already completed'
        };
      }

      if (existingTransaction.status === 'voided') {
        return {
          success: false,
          status: 400,
          message: 'Cannot complete voided transaction'
        };
      }

      // Check if payment methods are provided
      if (!data.paymentMethods || !Array.isArray(data.paymentMethods) || data.paymentMethods.length === 0) {
        return {
          success: false,
          status: 400,
          message: 'Payment methods are required'
        };
      }

      // Create transaction object
      const Transaction = require('../models/Transaction');
      const transaction = Transaction.fromObject(existingTransaction);

      // Add payment methods
      data.paymentMethods.forEach(method => {
        transaction.addPaymentMethod(method);
      });

      // Complete transaction
      const completed = transaction.complete();
      if (!completed) {
        return {
          success: false,
          status: 400,
          message: 'Failed to complete transaction'
        };
      }

      // Update product stock
      transaction.items.forEach(item => {
        const product = this.db.getProductById(item.productId);
        if (product) {
          product.stock -= item.quantity;
          this.db.saveProduct(product);
        }
      });

      // Save transaction
      const saved = this.db.saveTransaction(transaction.toObject());
      if (!saved) {
        return {
          success: false,
          status: 500,
          message: 'Failed to save transaction'
        };
      }

      return {
        success: true,
        status: 200,
        data: transaction.toObject()
      };
    } catch (error) {
      console.error('Error completing transaction:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to complete transaction'
      };
    }
  }

  /**
   * Void transaction
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async voidTransaction(params, data) {
    try {
      // Get transaction
      const existingTransaction = this.db.getTransactionById(params.id);
      if (!existingTransaction) {
        return {
          success: false,
          status: 404,
          message: 'Transaction not found'
        };
      }

      // Check if transaction is already voided
      if (existingTransaction.status === 'voided') {
        return {
          success: false,
          status: 400,
          message: 'Transaction is already voided'
        };
      }

      // Create transaction object
      const Transaction = require('../models/Transaction');
      const transaction = Transaction.fromObject(existingTransaction);

      // Void transaction
      const voided = transaction.void(data.reason || '');
      if (!voided) {
        return {
          success: false,
          status: 400,
          message: 'Failed to void transaction'
        };
      }

      // If transaction was completed, restore product stock
      if (existingTransaction.status === 'completed') {
        transaction.items.forEach(item => {
          const product = this.db.getProductById(item.productId);
          if (product) {
            product.stock += item.quantity;
            this.db.saveProduct(product);
          }
        });
      }

      // Save transaction
      const saved = this.db.saveTransaction(transaction.toObject());
      if (!saved) {
        return {
          success: false,
          status: 500,
          message: 'Failed to save transaction'
        };
      }

      return {
        success: true,
        status: 200,
        data: transaction.toObject()
      };
    } catch (error) {
      console.error('Error voiding transaction:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to void transaction'
      };
    }
  }

  // User endpoints

  /**
   * Get all users
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async getUsers(params, data) {
    try {
      const users = this.db.getUsers().map(user => {
        // Remove password hash
        const { passwordHash, ...userData } = user;
        return userData;
      });

      return {
        success: true,
        status: 200,
        data: users
      };
    } catch (error) {
      console.error('Error getting users:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to get users'
      };
    }
  }

  /**
   * Get user by ID
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async getUserById(params, data) {
    try {
      const user = this.db.getUserById(params.id);
      if (!user) {
        return {
          success: false,
          status: 404,
          message: 'User not found'
        };
      }

      // Remove password hash
      const { passwordHash, ...userData } = user;

      return {
        success: true,
        status: 200,
        data: userData
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to get user'
      };
    }
  }

  /**
   * Create user
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async createUser(params, data) {
    try {
      // Check if username already exists
      const existingUser = this.db.getUserByUsername(data.username);
      if (existingUser) {
        return {
          success: false,
          status: 400,
          message: 'Username already exists'
        };
      }

      // Create user
      const result = this.auth.registerUser(data, data.password);
      if (!result.success) {
        return {
          success: false,
          status: 400,
          message: result.error
        };
      }

      // Remove password hash
      const { passwordHash, ...userData } = result.user;

      return {
        success: true,
        status: 201,
        data: userData
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to create user'
      };
    }
  }

  /**
   * Update user
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async updateUser(params, data) {
    try {
      // Get user
      const existingUser = this.db.getUserById(params.id);
      if (!existingUser) {
        return {
          success: false,
          status: 404,
          message: 'User not found'
        };
      }

      // Check if username is being changed and already exists
      if (data.username && data.username !== existingUser.username) {
        const userWithSameUsername = this.db.getUserByUsername(data.username);
        if (userWithSameUsername) {
          return {
            success: false,
            status: 400,
            message: 'Username already exists'
          };
        }
      }

      // Update user
      const User = require('../models/User');
      const user = User.fromObject(existingUser);
      user.update(data);

      // Update role if provided
      if (data.role) {
        user.setRole(data.role, data.resetPermissions !== false);
      }

      // Update permissions if provided
      if (data.permissions && Array.isArray(data.permissions)) {
        // Clear existing permissions
        user.permissions = [];
        
        // Add new permissions
        data.permissions.forEach(permission => {
          user.addPermission(permission);
        });
      }

      // Validate user
      const validation = user.validate();
      if (!validation.isValid) {
        return {
          success: false,
          status: 400,
          message: validation.errors.join(', ')
        };
      }

      // Save user
      const saved = this.db.saveUser(user.toObject());
      if (!saved) {
        return {
          success: false,
          status: 500,
          message: 'Failed to save user'
        };
      }

      // Remove password hash
      const { passwordHash, ...userData } = user.toObject();

      return {
        success: true,
        status: 200,
        data: userData
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to update user'
      };
    }
  }

  /**
   * Delete user
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async deleteUser(params, data) {
    try {
      // Check if user exists
      const user = this.db.getUserById(params.id);
      if (!user) {
        return {
          success: false,
          status: 404,
          message: 'User not found'
        };
      }

      // Check if user is trying to delete themselves
      const currentUser = this.auth.getCurrentUser();
      if (currentUser && currentUser.id === params.id) {
        return {
          success: false,
          status: 400,
          message: 'Cannot delete your own account'
        };
      }

      // Delete user
      const deleted = this.db.deleteUser(params.id);
      if (!deleted) {
        return {
          success: false,
          status: 500,
          message: 'Failed to delete user'
        };
      }

      return {
        success: true,
        status: 200,
        message: 'User deleted'
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to delete user'
      };
    }
  }

  /**
   * Reset user password
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async resetUserPassword(params, data) {
    try {
      // Check if new password is provided
      if (!data.newPassword) {
        return {
          success: false,
          status: 400,
          message: 'New password is required'
        };
      }

      // Reset password
      const result = this.auth.resetPassword(params.id, data.newPassword);
      if (!result.success) {
        return {
          success: false,
          status: 400,
          message: result.error
        };
      }

      return {
        success: true,
        status: 200,
        message: 'Password reset successfully'
      };
    } catch (error) {
      console.error('Error resetting password:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to reset password'
      };
    }
  }

  // Authentication endpoints

  /**
   * Login
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async login(params, data) {
    try {
      // Check if username and password are provided
      if (!data.username || !data.password) {
        return {
          success: false,
          status: 400,
          message: 'Username and password are required'
        };
      }

      // Login
      const result = this.auth.login(data.username, data.password);
      if (!result.success) {
        return {
          success: false,
          status: 401,
          message: result.error
        };
      }

      return {
        success: true,
        status: 200,
        data: {
          user: result.user,
          token: result.token,
          expiry: result.expiry
        }
      };
    } catch (error) {
      console.error('Error logging in:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to log in'
      };
    }
  }

  /**
   * Logout
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async logout(params, data) {
    try {
      // Logout
      const result = this.auth.logout();
      if (!result) {
        return {
          success: false,
          status: 500,
          message: 'Failed to log out'
        };
      }

      return {
        success: true,
        status: 200,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('Error logging out:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to log out'
      };
    }
  }

  /**
   * Get current user
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async getCurrentUser(params, data) {
    try {
      // Get current user
      const user = this.auth.getCurrentUser();
      if (!user) {
        return {
          success: false,
          status: 401,
          message: 'Not authenticated'
        };
      }

      return {
        success: true,
        status: 200,
        data: user
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to get current user'
      };
    }
  }

  /**
   * Change password
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async changePassword(params, data) {
    try {
      // Check if current and new passwords are provided
      if (!data.currentPassword || !data.newPassword) {
        return {
          success: false,
          status: 400,
          message: 'Current and new passwords are required'
        };
      }

      // Get current user
      const user = this.auth.getCurrentUser();
      if (!user) {
        return {
          success: false,
          status: 401,
          message: 'Not authenticated'
        };
      }

      // Change password
      const result = this.auth.changePassword(user.id, data.currentPassword, data.newPassword);
      if (!result.success) {
        return {
          success: false,
          status: 400,
          message: result.error
        };
      }

      return {
        success: true,
        status: 200,
        message: 'Password changed successfully'
      };
    } catch (error) {
      console.error('Error changing password:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to change password'
      };
    }
  }

  // Settings endpoints

  /**
   * Get all settings
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async getSettings(params, data) {
    try {
      const settings = this.db.getSettings();
      return {
        success: true,
        status: 200,
        data: settings
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to get settings'
      };
    }
  }

  /**
   * Update settings
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async updateSettings(params, data) {
    try {
      // Update settings
      const saved = this.db.saveSettings(data);
      if (!saved) {
        return {
          success: false,
          status: 500,
          message: 'Failed to save settings'
        };
      }

      return {
        success: true,
        status: 200,
        data: this.db.getSettings()
      };
    } catch (error) {
      console.error('Error updating settings:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to update settings'
      };
    }
  }

  /**
   * Get setting by key
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async getSetting(params, data) {
    try {
      const value = this.db.getSetting(params.key);
      if (value === null) {
        return {
          success: false,
          status: 404,
          message: 'Setting not found'
        };
      }

      return {
        success: true,
        status: 200,
        data: {
          key: params.key,
          value
        }
      };
    } catch (error) {
      console.error('Error getting setting:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to get setting'
      };
    }
  }

  /**
   * Update setting
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async updateSetting(params, data) {
    try {
      // Check if value is provided
      if (data.value === undefined) {
        return {
          success: false,
          status: 400,
          message: 'Value is required'
        };
      }

      // Update setting
      const saved = this.db.saveSetting(params.key, data.value);
      if (!saved) {
        return {
          success: false,
          status: 500,
          message: 'Failed to save setting'
        };
      }

      return {
        success: true,
        status: 200,
        data: {
          key: params.key,
          value: data.value
        }
      };
    } catch (error) {
      console.error('Error updating setting:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to update setting'
      };
    }
  }

  // Vision AI endpoints

  /**
   * Process image
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async processImage(params, data) {
    try {
      // Check if image data is provided
      if (!data.imageData) {
        return {
          success: false,
          status: 400,
          message: 'Image data is required'
        };
      }

      // Get Vision AI service
      const VisionAIService = require('./VisionAIService');
      const visionAI = new VisionAIService(this.db);
      await visionAI.initialize();

      // Process image
      const results = await visionAI.processImage(data.imageData);

      return {
        success: true,
        status: 200,
        data: results
      };
    } catch (error) {
      console.error('Error processing image:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to process image'
      };
    }
  }

  /**
   * Train model
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async trainModel(params, data) {
    try {
      // Check if product ID and images are provided
      if (!data.productId || !data.images || !Array.isArray(data.images) || data.images.length === 0) {
        return {
          success: false,
          status: 400,
          message: 'Product ID and images are required'
        };
      }

      // Get Vision AI service
      const VisionAIService = require('./VisionAIService');
      const visionAI = new VisionAIService(this.db);
      await visionAI.initialize();

      // Train model
      const result = await visionAI.trainModel(data.productId, data.images);
      if (!result.success) {
        return {
          success: false,
          status: 400,
          message: result.message
        };
      }

      return {
        success: true,
        status: 200,
        data: result
      };
    } catch (error) {
      console.error('Error training model:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to train model'
      };
    }
  }

  /**
   * Get model info
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async getModelInfo(params, data) {
    try {
      // Get Vision AI service
      const VisionAIService = require('./VisionAIService');
      const visionAI = new VisionAIService(this.db);
      await visionAI.initialize();

      // Get model info
      const modelInfo = visionAI.getModelInfo();

      return {
        success: true,
        status: 200,
        data: modelInfo
      };
    } catch (error) {
      console.error('Error getting model info:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to get model info'
      };
    }
  }

  /**
   * Set confidence threshold
   * @param {Object} params - Path parameters
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Response
   */
  async setConfidenceThreshold(params, data) {
    try {
      // Check if threshold is provided
      if (data.threshold === undefined) {
        return {
          success: false,
          status: 400,
          message: 'Threshold is required'
        };
      }

      // Get Vision AI service
      const VisionAIService = require('./VisionAIService');
      const visionAI = new VisionAIService(this.db);
      await visionAI.initialize();

      // Set threshold
      const result = visionAI.setConfidenceThreshold(data.threshold);
      if (!result) {
        return {
          success: false,
          status: 400,
          message: 'Invalid threshold value'
        };
      }

      return {
        success: true,
        status: 200,
        data: {
          threshold: visionAI.getConfidenceThreshold()
        }
      };
    } catch (error) {
      console.error('Error setting confidence threshold:', error);
      return {
        success: false,
        status: 500,
        message: 'Failed to set confidence threshold'
      };
    }
  }
}

// Export the APIService class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIService;
}
