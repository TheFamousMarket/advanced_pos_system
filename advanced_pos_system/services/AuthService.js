/**
 * Authentication Service for Advanced POS System
 * Manages user authentication, authorization, and role-based access control
 */

class AuthService {
  /**
   * Create a new AuthService
   * @param {Object} databaseService - Database service instance
   */
  constructor(databaseService) {
    this.db = databaseService;
    this.currentUser = null;
    this.token = null;
    this.tokenExpiry = null;
    this.initialized = false;
  }

  /**
   * Initialize the authentication service
   * @returns {boolean} Success status
   */
  initialize() {
    try {
      // Check for stored token
      if (typeof localStorage !== 'undefined') {
        const storedToken = localStorage.getItem('pos_auth_token');
        const storedUserId = localStorage.getItem('pos_auth_user_id');
        const storedExpiry = localStorage.getItem('pos_auth_expiry');
        
        if (storedToken && storedUserId && storedExpiry) {
          // Check if token is still valid
          if (new Date(storedExpiry) > new Date()) {
            const user = this.db.getUserById(storedUserId);
            if (user) {
              this.currentUser = user;
              this.token = storedToken;
              this.tokenExpiry = new Date(storedExpiry);
            }
          }
        }
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing authentication service:', error);
      return false;
    }
  }

  /**
   * Register a new user
   * @param {Object} userData - User data
   * @param {string} password - User password
   * @returns {Object} Registration result
   */
  registerUser(userData, password) {
    try {
      // Check if username already exists
      const existingUser = this.db.getUserByUsername(userData.username);
      if (existingUser) {
        return {
          success: false,
          error: 'Username already exists'
        };
      }

      // Create new user
      const User = require('../models/User');
      const bcrypt = require('bcryptjs') || { hashSync: pwd => pwd }; // Fallback if bcryptjs is not available
      
      const user = new User({
        ...userData,
        passwordHash: bcrypt.hashSync(password, 10)
      });

      // Validate user data
      const validation = user.validate();
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Save user
      const saved = this.db.saveUser(user.toObject());
      if (!saved) {
        return {
          success: false,
          error: 'Failed to save user'
        };
      }

      return {
        success: true,
        user: user.toObject()
      };
    } catch (error) {
      console.error('Error registering user:', error);
      return {
        success: false,
        error: 'Registration failed'
      };
    }
  }

  /**
   * Login user
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Object} Login result
   */
  login(username, password) {
    try {
      // Get user by username
      const user = this.db.getUserByUsername(username);
      if (!user) {
        return {
          success: false,
          error: 'Invalid username or password'
        };
      }

      // Verify password
      const bcrypt = require('bcryptjs') || { compareSync: (pwd, hash) => pwd === hash }; // Fallback if bcryptjs is not available
      const passwordMatch = bcrypt.compareSync(password, user.passwordHash);
      if (!passwordMatch) {
        return {
          success: false,
          error: 'Invalid username or password'
        };
      }

      // Create token
      const token = this.generateToken();
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24); // Token valid for 24 hours

      // Update user's last login
      const User = require('../models/User');
      const userObj = User.fromObject(user);
      userObj.updateLastLogin();
      this.db.saveUser(userObj.toObject());

      // Set current user and token
      this.currentUser = user;
      this.token = token;
      this.tokenExpiry = expiry;

      // Store token in localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('pos_auth_token', token);
        localStorage.setItem('pos_auth_user_id', user.id);
        localStorage.setItem('pos_auth_expiry', expiry.toISOString());
      }

      return {
        success: true,
        user: { ...user, passwordHash: undefined },
        token,
        expiry
      };
    } catch (error) {
      console.error('Error logging in:', error);
      return {
        success: false,
        error: 'Login failed'
      };
    }
  }

  /**
   * Logout current user
   * @returns {boolean} Success status
   */
  logout() {
    try {
      this.currentUser = null;
      this.token = null;
      this.tokenExpiry = null;

      // Remove token from localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('pos_auth_token');
        localStorage.removeItem('pos_auth_user_id');
        localStorage.removeItem('pos_auth_expiry');
      }

      return true;
    } catch (error) {
      console.error('Error logging out:', error);
      return false;
    }
  }

  /**
   * Get current user
   * @returns {Object|null} Current user or null if not logged in
   */
  getCurrentUser() {
    if (!this.currentUser || !this.token || !this.tokenExpiry || new Date() > this.tokenExpiry) {
      return null;
    }
    
    return { ...this.currentUser, passwordHash: undefined };
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Is authenticated
   */
  isAuthenticated() {
    return !!this.getCurrentUser();
  }

  /**
   * Check if current user has permission
   * @param {string} permission - Permission to check
   * @returns {boolean} Has permission
   */
  hasPermission(permission) {
    const user = this.getCurrentUser();
    if (!user) {
      return false;
    }
    
    return user.permissions.includes(permission);
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Object} Change result
   */
  changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user
      const user = this.db.getUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Verify current password
      const bcrypt = require('bcryptjs') || { compareSync: (pwd, hash) => pwd === hash, hashSync: pwd => pwd }; // Fallback if bcryptjs is not available
      const passwordMatch = bcrypt.compareSync(currentPassword, user.passwordHash);
      if (!passwordMatch) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }

      // Update password
      const User = require('../models/User');
      const userObj = User.fromObject(user);
      userObj.passwordHash = bcrypt.hashSync(newPassword, 10);
      
      // Save user
      const saved = this.db.saveUser(userObj.toObject());
      if (!saved) {
        return {
          success: false,
          error: 'Failed to save user'
        };
      }

      // Update current user if it's the same user
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = userObj.toObject();
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error changing password:', error);
      return {
        success: false,
        error: 'Password change failed'
      };
    }
  }

  /**
   * Reset user password (admin only)
   * @param {string} userId - User ID
   * @param {string} newPassword - New password
   * @returns {Object} Reset result
   */
  resetPassword(userId, newPassword) {
    try {
      // Check if current user is admin
      if (!this.hasPermission('users:update')) {
        return {
          success: false,
          error: 'Permission denied'
        };
      }

      // Get user
      const user = this.db.getUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Update password
      const User = require('../models/User');
      const userObj = User.fromObject(user);
      const bcrypt = require('bcryptjs') || { hashSync: pwd => pwd }; // Fallback if bcryptjs is not available
      userObj.passwordHash = bcrypt.hashSync(newPassword, 10);
      
      // Save user
      const saved = this.db.saveUser(userObj.toObject());
      if (!saved) {
        return {
          success: false,
          error: 'Failed to save user'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error resetting password:', error);
      return {
        success: false,
        error: 'Password reset failed'
      };
    }
  }

  /**
   * Generate authentication token
   * @returns {string} Authentication token
   */
  generateToken() {
    return 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  }
}

// Export the AuthService class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthService;
}
