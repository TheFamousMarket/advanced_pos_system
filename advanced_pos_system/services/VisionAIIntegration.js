/**
 * Vision AI Integration for Advanced POS System
 * Integrates camera functionality with product recognition workflow
 */

class VisionAIIntegration {
  /**
   * Create a new VisionAIIntegration
   * @param {Object} visionAIService - Vision AI service instance
   * @param {Object} cartService - Cart service instance
   * @param {Object} uiService - UI service instance
   */
  constructor(visionAIService, cartService, uiService) {
    this.visionAI = visionAIService;
    this.cart = cartService;
    this.ui = uiService;
    this.videoElement = null;
    this.canvasElement = null;
    this.stream = null;
    this.isCapturing = false;
    this.autoCapture = false;
    this.autoCaptureInterval = null;
    this.lastResults = [];
    this.initialized = false;
  }

  /**
   * Initialize the Vision AI integration
   * @param {HTMLVideoElement} videoElement - Video element for camera feed
   * @param {HTMLCanvasElement} canvasElement - Canvas element for image capture
   * @returns {Promise<boolean>} Success status
   */
  async initialize(videoElement, canvasElement) {
    try {
      this.videoElement = videoElement;
      this.canvasElement = canvasElement;
      
      // Initialize Vision AI service
      await this.visionAI.initialize();
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing Vision AI integration:', error);
      return false;
    }
  }

  /**
   * Start camera
   * @param {boolean} useRearCamera - Whether to use rear camera (mobile devices)
   * @returns {Promise<boolean>} Success status
   */
  async startCamera(useRearCamera = true) {
    try {
      if (!this.initialized) {
        throw new Error('Vision AI integration not initialized');
      }
      
      // Stop any existing stream
      await this.stopCamera();
      
      // Get user media
      const constraints = {
        video: {
          facingMode: useRearCamera ? 'environment' : 'user'
        }
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;
      
      // Wait for video to be ready
      await new Promise(resolve => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play();
          resolve();
        };
      });
      
      return true;
    } catch (error) {
      console.error('Error starting camera:', error);
      this.ui.showToast('Failed to access camera', 'error');
      return false;
    }
  }

  /**
   * Stop camera
   * @returns {Promise<boolean>} Success status
   */
  async stopCamera() {
    try {
      // Stop auto-capture if active
      this.stopAutoCapture();
      
      // Stop stream
      if (this.stream) {
        const tracks = this.stream.getTracks();
        tracks.forEach(track => track.stop());
        this.stream = null;
      }
      
      // Clear video source
      if (this.videoElement) {
        this.videoElement.srcObject = null;
      }
      
      return true;
    } catch (error) {
      console.error('Error stopping camera:', error);
      return false;
    }
  }

  /**
   * Capture image from camera
   * @returns {Promise<string>} Base64 encoded image data
   */
  async captureImage() {
    try {
      if (!this.initialized || !this.stream) {
        throw new Error('Camera not started');
      }
      
      // Set canvas dimensions to match video
      const width = this.videoElement.videoWidth;
      const height = this.videoElement.videoHeight;
      this.canvasElement.width = width;
      this.canvasElement.height = height;
      
      // Draw video frame to canvas
      const context = this.canvasElement.getContext('2d');
      context.drawImage(this.videoElement, 0, 0, width, height);
      
      // Get image data
      const imageData = this.canvasElement.toDataURL('image/jpeg', 0.9);
      
      return imageData;
    } catch (error) {
      console.error('Error capturing image:', error);
      throw error;
    }
  }

  /**
   * Process captured image
   * @returns {Promise<Object>} Processing result
   */
  async processCapture() {
    try {
      this.isCapturing = true;
      this.ui.showLoading('Processing image...');
      
      // Capture image
      const imageData = await this.captureImage();
      
      // Process image
      const results = await this.visionAI.processImage(imageData);
      this.lastResults = results;
      
      // Draw bounding boxes
      this.drawBoundingBoxes(results);
      
      this.ui.hideLoading();
      this.isCapturing = false;
      
      return {
        success: true,
        imageData,
        results
      };
    } catch (error) {
      console.error('Error processing capture:', error);
      this.ui.hideLoading();
      this.ui.showToast('Failed to process image', 'error');
      this.isCapturing = false;
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Draw bounding boxes on canvas
   * @param {Array} results - Recognition results
   * @returns {void}
   */
  drawBoundingBoxes(results) {
    if (!this.canvasElement || !results || results.length === 0) {
      return;
    }
    
    const context = this.canvasElement.getContext('2d');
    const width = this.canvasElement.width;
    const height = this.canvasElement.height;
    
    // Clear previous drawings
    context.clearRect(0, 0, width, height);
    
    // Draw video frame
    context.drawImage(this.videoElement, 0, 0, width, height);
    
    // Draw bounding boxes
    results.forEach(result => {
      const { boundingBox, confidence, name } = result;
      const { x1, y1, x2, y2 } = boundingBox;
      
      // Calculate pixel coordinates
      const boxX = Math.floor(x1 * width);
      const boxY = Math.floor(y1 * height);
      const boxWidth = Math.floor((x2 - x1) * width);
      const boxHeight = Math.floor((y2 - y1) * height);
      
      // Set color based on confidence
      let color = '#FF0000'; // Red for low confidence
      if (confidence >= 0.9) {
        color = '#00FF00'; // Green for high confidence
      } else if (confidence >= 0.7) {
        color = '#FFFF00'; // Yellow for medium confidence
      }
      
      // Draw rectangle
      context.lineWidth = 3;
      context.strokeStyle = color;
      context.strokeRect(boxX, boxY, boxWidth, boxHeight);
      
      // Draw label background
      context.fillStyle = color;
      const label = `${name} (${Math.floor(confidence * 100)}%)`;
      const labelWidth = context.measureText(label).width + 10;
      const labelHeight = 20;
      context.fillRect(boxX, boxY - labelHeight, labelWidth, labelHeight);
      
      // Draw label text
      context.fillStyle = '#000000';
      context.font = '14px Arial';
      context.fillText(label, boxX + 5, boxY - 5);
    });
  }

  /**
   * Add recognized product to cart
   * @param {string} productId - Product ID
   * @param {number} confidence - Recognition confidence
   * @returns {Promise<Object>} Result
   */
  async addRecognizedProductToCart(productId, confidence) {
    try {
      // Add product to cart
      const result = this.cart.addItem(productId, 1, 'vision', confidence);
      
      if (result.success) {
        this.ui.showToast(`Added ${result.item.name} to cart`, 'success');
      } else {
        this.ui.showToast(result.message, 'error');
      }
      
      return result;
    } catch (error) {
      console.error('Error adding product to cart:', error);
      this.ui.showToast('Failed to add product to cart', 'error');
      
      return {
        success: false,
        message: 'Failed to add product to cart'
      };
    }
  }

  /**
   * Add all recognized products to cart
   * @returns {Promise<Object>} Result
   */
  async addAllRecognizedProductsToCart() {
    try {
      if (!this.lastResults || this.lastResults.length === 0) {
        this.ui.showToast('No products recognized', 'warning');
        return {
          success: false,
          message: 'No products recognized'
        };
      }
      
      const threshold = this.visionAI.getConfidenceThreshold();
      const highConfidenceResults = this.lastResults.filter(result => result.confidence >= threshold);
      
      if (highConfidenceResults.length === 0) {
        this.ui.showToast('No products with high confidence', 'warning');
        return {
          success: false,
          message: 'No products with high confidence'
        };
      }
      
      // Add each product to cart
      const results = [];
      for (const result of highConfidenceResults) {
        const addResult = await this.addRecognizedProductToCart(result.productId, result.confidence);
        results.push({
          productId: result.productId,
          name: result.name,
          success: addResult.success
        });
      }
      
      const successCount = results.filter(r => r.success).length;
      this.ui.showToast(`Added ${successCount} of ${highConfidenceResults.length} products to cart`, 'info');
      
      return {
        success: successCount > 0,
        message: `Added ${successCount} of ${highConfidenceResults.length} products to cart`,
        results
      };
    } catch (error) {
      console.error('Error adding products to cart:', error);
      this.ui.showToast('Failed to add products to cart', 'error');
      
      return {
        success: false,
        message: 'Failed to add products to cart'
      };
    }
  }

  /**
   * Start auto-capture
   * @param {number} interval - Capture interval in milliseconds
   * @returns {boolean} Success status
   */
  startAutoCapture(interval = 3000) {
    try {
      if (this.autoCapture) {
        this.stopAutoCapture();
      }
      
      this.autoCapture = true;
      this.ui.showToast('Auto-capture started', 'info');
      
      // Start interval
      this.autoCaptureInterval = setInterval(async () => {
        if (!this.isCapturing) {
          const result = await this.processCapture();
          if (result.success) {
            await this.addAllRecognizedProductsToCart();
          }
        }
      }, interval);
      
      return true;
    } catch (error) {
      console.error('Error starting auto-capture:', error);
      this.ui.showToast('Failed to start auto-capture', 'error');
      return false;
    }
  }

  /**
   * Stop auto-capture
   * @returns {boolean} Success status
   */
  stopAutoCapture() {
    try {
      if (this.autoCaptureInterval) {
        clearInterval(this.autoCaptureInterval);
        this.autoCaptureInterval = null;
      }
      
      this.autoCapture = false;
      this.ui.showToast('Auto-capture stopped', 'info');
      
      return true;
    } catch (error) {
      console.error('Error stopping auto-capture:', error);
      return false;
    }
  }

  /**
   * Toggle auto-capture
   * @param {number} interval - Capture interval in milliseconds
   * @returns {boolean} New auto-capture state
   */
  toggleAutoCapture(interval = 3000) {
    if (this.autoCapture) {
      this.stopAutoCapture();
      return false;
    } else {
      this.startAutoCapture(interval);
      return true;
    }
  }

  /**
   * Train product with captured images
   * @param {string} productId - Product ID
   * @param {number} imageCount - Number of images to capture
   * @returns {Promise<Object>} Training result
   */
  async trainProduct(productId, imageCount = 5) {
    try {
      if (!this.initialized || !this.stream) {
        throw new Error('Camera not started');
      }
      
      this.ui.showLoading(`Training product (0/${imageCount} images)...`);
      
      // Capture multiple images
      const images = [];
      for (let i = 0; i < imageCount; i++) {
        // Update loading message
        this.ui.showLoading(`Training product (${i}/${imageCount} images)...`);
        
        // Capture image
        const imageData = await this.captureImage();
        images.push(imageData);
        
        // Wait a bit between captures
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Train model
      this.ui.showLoading('Processing images...');
      const result = await this.visionAI.trainModel(productId, images);
      
      this.ui.hideLoading();
      
      if (result.success) {
        this.ui.showToast('Product trained successfully', 'success');
      } else {
        this.ui.showToast(result.message, 'error');
      }
      
      return result;
    } catch (error) {
      console.error('Error training product:', error);
      this.ui.hideLoading();
      this.ui.showToast('Failed to train product', 'error');
      
      return {
        success: false,
        message: 'Failed to train product: ' + error.message
      };
    }
  }

  /**
   * Switch camera (front/rear)
   * @returns {Promise<boolean>} Success status
   */
  async switchCamera() {
    try {
      // Get current facing mode
      const currentFacingMode = this.getCurrentFacingMode();
      
      // Switch to opposite facing mode
      const useRearCamera = currentFacingMode !== 'environment';
      
      // Restart camera with new facing mode
      return await this.startCamera(useRearCamera);
    } catch (error) {
      console.error('Error switching camera:', error);
      this.ui.showToast('Failed to switch camera', 'error');
      return false;
    }
  }

  /**
   * Get current camera facing mode
   * @returns {string} Facing mode ('user' or 'environment')
   */
  getCurrentFacingMode() {
    if (!this.stream) {
      return null;
    }
    
    const videoTrack = this.stream.getVideoTracks()[0];
    if (!videoTrack) {
      return null;
    }
    
    const settings = videoTrack.getSettings();
    return settings.facingMode;
  }

  /**
   * Check if camera is available
   * @returns {Promise<boolean>} Is camera available
   */
  async isCameraAvailable() {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }
      
      // Try to access camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Stop stream immediately
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('Camera not available:', error);
      return false;
    }
  }
}

// Export the VisionAIIntegration class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VisionAIIntegration;
}
