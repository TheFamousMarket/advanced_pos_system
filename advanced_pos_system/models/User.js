/**
 * User Model for Advanced POS System
 * Represents system users with authentication credentials and role-based permissions
 */

class User {
  /**
   * Create a new User
   * @param {Object} data - User data
   */
  constructor(data = {}) {
    this.id = data.id || 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    this.username = data.username || '';
    this.passwordHash = data.passwordHash || '';
    this.firstName = data.firstName || '';
    this.lastName = data.lastName || '';
    this.email = data.email || '';
    this.role = data.role || 'cashier'; // admin, manager, cashier
    this.permissions = data.permissions || this.getDefaultPermissions(data.role || 'cashier');
    this.createdAt = data.createdAt || new Date().toISOString();
    this.lastLogin = data.lastLogin || null;
  }

  /**
   * Validate user data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.username) {
      errors.push('Username is required');
    }

    if (!this.passwordHash) {
      errors.push('Password is required');
    }

    if (!this.email) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(this.email)) {
      errors.push('Email is invalid');
    }

    if (!['admin', 'manager', 'cashier'].includes(this.role)) {
      errors.push('Role must be admin, manager, or cashier');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if email is valid
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid email
   */
  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Get default permissions for role
   * @param {string} role - User role
   * @returns {Array} Default permissions
   */
  getDefaultPermissions(role) {
    switch (role) {
      case 'admin':
        return [
          'users:read', 'users:create', 'users:update', 'users:delete',
          'products:read', 'products:create', 'products:update', 'products:delete',
          'transactions:read', 'transactions:create', 'transactions:update', 'transactions:void',
          'reports:read', 'settings:read', 'settings:update'
        ];
      case 'manager':
        return [
          'users:read',
          'products:read', 'products:create', 'products:update',
          'transactions:read', 'transactions:create', 'transactions:update', 'transactions:void',
          'reports:read', 'settings:read'
        ];
      case 'cashier':
        return [
          'products:read',
          'transactions:read', 'transactions:create'
        ];
      default:
        return [];
    }
  }

  /**
   * Check if user has permission
   * @param {string} permission - Permission to check
   * @returns {boolean} Has permission
   */
  hasPermission(permission) {
    return this.permissions.includes(permission);
  }

  /**
   * Add permission
   * @param {string} permission - Permission to add
   * @returns {boolean} Success status
   */
  addPermission(permission) {
    if (!permission || this.permissions.includes(permission)) {
      return false;
    }

    this.permissions.push(permission);
    return true;
  }

  /**
   * Remove permission
   * @param {string} permission - Permission to remove
   * @returns {boolean} Success status
   */
  removePermission(permission) {
    const initialLength = this.permissions.length;
    this.permissions = this.permissions.filter(p => p !== permission);
    return this.permissions.length !== initialLength;
  }

  /**
   * Set role and update permissions
   * @param {string} role - New role
   * @param {boolean} resetPermissions - Whether to reset permissions to defaults
   * @returns {boolean} Success status
   */
  setRole(role, resetPermissions = true) {
    if (!['admin', 'manager', 'cashier'].includes(role)) {
      return false;
    }

    this.role = role;
    
    if (resetPermissions) {
      this.permissions = this.getDefaultPermissions(role);
    }
    
    return true;
  }

  /**
   * Update last login timestamp
   * @returns {void}
   */
  updateLastLogin() {
    this.lastLogin = new Date().toISOString();
  }

  /**
   * Get full name
   * @returns {string} Full name
   */
  getFullName() {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /**
   * Update user data
   * @param {Object} data - User data
   * @returns {boolean} Success status
   */
  update(data) {
    if (data.username !== undefined) this.username = data.username;
    if (data.firstName !== undefined) this.firstName = data.firstName;
    if (data.lastName !== undefined) this.lastName = data.lastName;
    if (data.email !== undefined) this.email = data.email;
    
    return true;
  }

  /**
   * Convert to plain object
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      username: this.username,
      passwordHash: this.passwordHash,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      role: this.role,
      permissions: this.permissions,
      createdAt: this.createdAt,
      lastLogin: this.lastLogin
    };
  }

  /**
   * Create User from plain object
   * @param {Object} obj - Plain object
   * @returns {User} User instance
   */
  static fromObject(obj) {
    return new User(obj);
  }
}

// Export the User class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = User;
}
