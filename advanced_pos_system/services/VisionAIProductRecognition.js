/**
 * Vision AI Product Recognition Module for Advanced POS System
 * Implements the core product recognition functionality using computer vision
 */

class VisionAIProductRecognition {
  /**
   * Create a new VisionAIProductRecognition instance
   * @param {Object} visionAIService - Vision AI service instance
   */
  constructor(visionAIService) {
    this.visionAI = visionAIService;
    this.modelStatus = {
      isLoaded: false,
      lastUpdated: null,
      productCount: 0,
      signatureCount: 0
    };
    this.processingStats = {
      totalProcessed: 0,
      successfulRecognitions: 0,
      averageConfidence: 0,
      processingTime: 0
    };
  }

  /**
   * Initialize the product recognition module
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      // Initialize Vision AI service if not already initialized
      if (!this.visionAI.isInitialized) {
        await this.visionAI.initialize();
      }

      // Get model info
      const modelInfo = this.visionAI.getModelInfo();
      
      // Update model status
      this.modelStatus.isLoaded = true;
      this.modelStatus.lastUpdated = modelInfo.lastTraining || new Date().toISOString();
      
      // Count products with signatures
      const productSignatures = Object.keys(this.visionAI.productSignatures || {}).length;
      this.modelStatus.productCount = productSignatures;
      
      // Count total signatures
      let signatureCount = 0;
      Object.values(this.visionAI.productSignatures || {}).forEach(signatures => {
        signatureCount += signatures.length;
      });
      this.modelStatus.signatureCount = signatureCount;
      
      return true;
    } catch (error) {
      console.error('Error initializing product recognition:', error);
      return false;
    }
  }

  /**
   * Recognize products in an image
   * @param {string} imageData - Base64 encoded image data
   * @returns {Promise<Object>} Recognition results
   */
  async recognizeProducts(imageData) {
    try {
      const startTime = performance.now();
      
      // Process image with Vision AI service
      const recognitionResults = await this.visionAI.processImage(imageData);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Update processing stats
      this.processingStats.totalProcessed++;
      this.processingStats.successfulRecognitions += recognitionResults.length > 0 ? 1 : 0;
      
      // Calculate average confidence
      if (recognitionResults.length > 0) {
        const totalConfidence = recognitionResults.reduce((sum, result) => sum + result.confidence, 0);
        const averageConfidence = totalConfidence / recognitionResults.length;
        
        // Update rolling average
        this.processingStats.averageConfidence = 
          (this.processingStats.averageConfidence * (this.processingStats.successfulRecognitions - 1) + averageConfidence) / 
          this.processingStats.successfulRecognitions;
      }
      
      // Update average processing time
      this.processingStats.processingTime = 
        (this.processingStats.processingTime * (this.processingStats.totalProcessed - 1) + processingTime) / 
        this.processingStats.totalProcessed;
      
      return {
        success: true,
        results: recognitionResults,
        processingTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error recognizing products:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get products above confidence threshold
   * @param {Array} recognitionResults - Recognition results
   * @param {number} threshold - Confidence threshold (optional)
   * @returns {Array} Filtered results
   */
  getConfidentProducts(recognitionResults, threshold = null) {
    // Use provided threshold or get from Vision AI service
    const confidenceThreshold = threshold !== null ? threshold : this.visionAI.getConfidenceThreshold();
    
    // Filter results by confidence
    return recognitionResults.filter(result => result.confidence >= confidenceThreshold);
  }

  /**
   * Train model with new product images
   * @param {string} productId - Product ID
   * @param {Array} images - Array of base64 encoded image data
   * @param {Object} productInfo - Additional product information
   * @returns {Promise<Object>} Training result
   */
  async trainProductModel(productId, images, productInfo = {}) {
    try {
      // Train model with Vision AI service
      const trainingResult = await this.visionAI.trainModel(productId, images);
      
      if (trainingResult.success) {
        // Update model status
        this.modelStatus.lastUpdated = new Date().toISOString();
        this.modelStatus.productCount = Object.keys(this.visionAI.productSignatures || {}).length;
        
        // Count total signatures
        let signatureCount = 0;
        Object.values(this.visionAI.productSignatures || {}).forEach(signatures => {
          signatureCount += signatures.length;
        });
        this.modelStatus.signatureCount = signatureCount;
      }
      
      return {
        ...trainingResult,
        modelStatus: { ...this.modelStatus }
      };
    } catch (error) {
      console.error('Error training product model:', error);
      return {
        success: false,
        error: error.message,
        modelStatus: { ...this.modelStatus }
      };
    }
  }

  /**
   * Get model status
   * @returns {Object} Model status
   */
  getModelStatus() {
    return { ...this.modelStatus };
  }

  /**
   * Get processing statistics
   * @returns {Object} Processing statistics
   */
  getProcessingStats() {
    return { ...this.processingStats };
  }

  /**
   * Reset processing statistics
   * @returns {void}
   */
  resetProcessingStats() {
    this.processingStats = {
      totalProcessed: 0,
      successfulRecognitions: 0,
      averageConfidence: 0,
      processingTime: 0
    };
  }

  /**
   * Evaluate recognition quality
   * @param {Array} recognitionResults - Recognition results
   * @param {Array} groundTruth - Ground truth product IDs
   * @returns {Object} Evaluation metrics
   */
  evaluateRecognition(recognitionResults, groundTruth) {
    // Filter results by confidence threshold
    const confidenceThreshold = this.visionAI.getConfidenceThreshold();
    const predictions = this.getConfidentProducts(recognitionResults, confidenceThreshold)
      .map(result => result.productId);
    
    // Calculate true positives, false positives, false negatives
    const truePositives = predictions.filter(id => groundTruth.includes(id)).length;
    const falsePositives = predictions.filter(id => !groundTruth.includes(id)).length;
    const falseNegatives = groundTruth.filter(id => !predictions.includes(id)).length;
    
    // Calculate precision, recall, F1 score
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * precision * recall / (precision + recall) || 0;
    
    return {
      precision,
      recall,
      f1Score,
      truePositives,
      falsePositives,
      falseNegatives,
      confidenceThreshold
    };
  }
}

// Export the VisionAIProductRecognition class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VisionAIProductRecognition;
}
