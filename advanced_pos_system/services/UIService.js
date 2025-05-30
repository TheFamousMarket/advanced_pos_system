/**
 * UI Service for Advanced POS System
 * Manages user interface components, notifications, and theme management
 */

class UIService {
  /**
   * Create a new UIService
   * @param {Object} databaseService - Database service instance
   */
  constructor(databaseService) {
    this.db = databaseService;
    this.theme = 'light'; // light or dark
    this.toasts = [];
    this.modals = [];
    this.loadingIndicators = [];
    this.eventListeners = {};
    this.initialized = false;
  }

  /**
   * Initialize the UI service
   * @returns {boolean} Success status
   */
  initialize() {
    try {
      // Load theme preference from database
      const savedTheme = this.db.getSetting('theme', 'light');
      this.theme = savedTheme;
      
      // Apply theme to document
      this.applyTheme();
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing UI service:', error);
      return false;
    }
  }

  /**
   * Set theme
   * @param {string} theme - Theme name (light or dark)
   * @returns {boolean} Success status
   */
  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') {
      return false;
    }
    
    this.theme = theme;
    this.db.saveSetting('theme', theme);
    this.applyTheme();
    
    // Trigger theme change event
    this.triggerEvent('themeChanged', { theme });
    
    return true;
  }

  /**
   * Toggle theme between light and dark
   * @returns {string} New theme
   */
  toggleTheme() {
    const newTheme = this.theme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  }

  /**
   * Apply current theme to document
   * @returns {void}
   */
  applyTheme() {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', this.theme);
      
      // Add/remove dark class from body
      if (this.theme === 'dark') {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    }
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (info, success, warning, error)
   * @param {number} duration - Duration in milliseconds
   * @returns {string} Toast ID
   */
  showToast(message, type = 'info', duration = 3000) {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    
    const toast = {
      id,
      message,
      type,
      duration,
      timestamp: Date.now()
    };
    
    this.toasts.push(toast);
    
    // Trigger toast event
    this.triggerEvent('toastAdded', { toast });
    
    // Auto-hide toast after duration
    if (duration > 0) {
      setTimeout(() => {
        this.hideToast(id);
      }, duration);
    }
    
    return id;
  }

  /**
   * Hide toast notification
   * @param {string} id - Toast ID
   * @returns {boolean} Success status
   */
  hideToast(id) {
    const index = this.toasts.findIndex(toast => toast.id === id);
    
    if (index === -1) {
      return false;
    }
    
    const toast = this.toasts[index];
    this.toasts.splice(index, 1);
    
    // Trigger toast event
    this.triggerEvent('toastRemoved', { toast });
    
    return true;
  }

  /**
   * Show modal dialog
   * @param {Object} options - Modal options
   * @returns {string} Modal ID
   */
  showModal(options) {
    const id = 'modal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    
    const modal = {
      id,
      title: options.title || '',
      content: options.content || '',
      buttons: options.buttons || [],
      closable: options.closable !== false,
      onClose: options.onClose || null,
      timestamp: Date.now()
    };
    
    this.modals.push(modal);
    
    // Trigger modal event
    this.triggerEvent('modalShown', { modal });
    
    return id;
  }

  /**
   * Hide modal dialog
   * @param {string} id - Modal ID
   * @param {*} result - Result to pass to onClose callback
   * @returns {boolean} Success status
   */
  hideModal(id, result) {
    const index = this.modals.findIndex(modal => modal.id === id);
    
    if (index === -1) {
      return false;
    }
    
    const modal = this.modals[index];
    this.modals.splice(index, 1);
    
    // Call onClose callback
    if (typeof modal.onClose === 'function') {
      modal.onClose(result);
    }
    
    // Trigger modal event
    this.triggerEvent('modalHidden', { modal, result });
    
    return true;
  }

  /**
   * Show loading indicator
   * @param {string} message - Loading message
   * @returns {string} Loading indicator ID
   */
  showLoading(message = 'Loading...') {
    const id = 'loading_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    
    const loading = {
      id,
      message,
      timestamp: Date.now()
    };
    
    this.loadingIndicators.push(loading);
    
    // Trigger loading event
    this.triggerEvent('loadingStarted', { loading });
    
    return id;
  }

  /**
   * Hide loading indicator
   * @param {string} id - Loading indicator ID (if null, hides all indicators)
   * @returns {boolean} Success status
   */
  hideLoading(id = null) {
    if (id === null) {
      // Hide all loading indicators
      const indicators = [...this.loadingIndicators];
      this.loadingIndicators = [];
      
      // Trigger events for each indicator
      indicators.forEach(loading => {
        this.triggerEvent('loadingEnded', { loading });
      });
      
      return indicators.length > 0;
    }
    
    const index = this.loadingIndicators.findIndex(loading => loading.id === id);
    
    if (index === -1) {
      return false;
    }
    
    const loading = this.loadingIndicators[index];
    this.loadingIndicators.splice(index, 1);
    
    // Trigger loading event
    this.triggerEvent('loadingEnded', { loading });
    
    return true;
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   * @returns {string} Listener ID
   */
  addEventListener(event, callback) {
    if (typeof callback !== 'function') {
      return null;
    }
    
    const id = 'listener_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    
    this.eventListeners[event].push({
      id,
      callback
    });
    
    return id;
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {string} id - Listener ID
   * @returns {boolean} Success status
   */
  removeEventListener(event, id) {
    if (!this.eventListeners[event]) {
      return false;
    }
    
    const initialLength = this.eventListeners[event].length;
    this.eventListeners[event] = this.eventListeners[event].filter(listener => listener.id !== id);
    
    return this.eventListeners[event].length !== initialLength;
  }

  /**
   * Trigger event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @returns {void}
   */
  triggerEvent(event, data = {}) {
    if (!this.eventListeners[event]) {
      return;
    }
    
    this.eventListeners[event].forEach(listener => {
      try {
        listener.callback(data);
      } catch (error) {
        console.error(`Error in ${event} event listener:`, error);
      }
    });
  }

  /**
   * Show confirmation dialog
   * @param {string} message - Confirmation message
   * @param {string} title - Dialog title
   * @param {Function} onConfirm - Confirm callback
   * @param {Function} onCancel - Cancel callback
   * @returns {string} Modal ID
   */
  showConfirmation(message, title = 'Confirmation', onConfirm = null, onCancel = null) {
    return this.showModal({
      title,
      content: message,
      buttons: [
        {
          text: 'Cancel',
          type: 'secondary',
          onClick: (modal) => {
            this.hideModal(modal.id, false);
            if (typeof onCancel === 'function') {
              onCancel();
            }
          }
        },
        {
          text: 'Confirm',
          type: 'primary',
          onClick: (modal) => {
            this.hideModal(modal.id, true);
            if (typeof onConfirm === 'function') {
              onConfirm();
            }
          }
        }
      ],
      onClose: (result) => {
        if (result === false && typeof onCancel === 'function') {
          onCancel();
        }
      }
    });
  }

  /**
   * Show alert dialog
   * @param {string} message - Alert message
   * @param {string} title - Dialog title
   * @param {Function} onClose - Close callback
   * @returns {string} Modal ID
   */
  showAlert(message, title = 'Alert', onClose = null) {
    return this.showModal({
      title,
      content: message,
      buttons: [
        {
          text: 'OK',
          type: 'primary',
          onClick: (modal) => {
            this.hideModal(modal.id, true);
          }
        }
      ],
      onClose
    });
  }

  /**
   * Format currency
   * @param {number} amount - Amount to format
   * @param {string} currencyCode - Currency code
   * @returns {string} Formatted currency
   */
  formatCurrency(amount, currencyCode = null) {
    if (currencyCode === null) {
      currencyCode = this.db.getSetting('currency', 'USD');
    }
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode
      }).format(amount);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return `${currencyCode} ${amount.toFixed(2)}`;
    }
  }
}

// Export the UIService class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIService;
}
