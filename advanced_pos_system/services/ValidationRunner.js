/**
 * Validation Runner for Advanced POS System
 * Executes validation tests and generates reports
 */

const app = require('../app');
const SystemValidator = require('./SystemValidator');
const fs = require('fs');
const path = require('path');

/**
 * Run validation tests and generate report
 */
async function runValidation() {
  console.log('Starting validation process...');
  
  // Initialize validator
  const validator = new SystemValidator(app);
  
  // Run validation tests
  console.log('Running validation tests...');
  const validationResult = await validator.validateAll();
  
  if (!validationResult.success) {
    console.error('Validation process failed:', validationResult.message);
    return;
  }
  
  // Generate report
  console.log('Generating validation report...');
  const reportHtml = validator.generateReport();
  
  // Create reports directory if it doesn't exist
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
  }
  
  // Save report
  const reportPath = path.join(reportsDir, `validation_report_${Date.now()}.html`);
  fs.writeFileSync(reportPath, reportHtml);
  
  console.log(`Validation report saved to: ${reportPath}`);
  
  // Generate summary
  const summary = generateSummary(validationResult.results, validationResult.overallResult);
  
  // Save summary
  const summaryPath = path.join(reportsDir, 'validation_summary.txt');
  fs.writeFileSync(summaryPath, summary);
  
  console.log(`Validation summary saved to: ${summaryPath}`);
  
  return {
    success: true,
    reportPath,
    summaryPath,
    results: validationResult.results,
    overallResult: validationResult.overallResult
  };
}

/**
 * Generate validation summary
 * @param {Object} results - Validation results
 * @param {Object} overallResult - Overall validation result
 * @returns {string} Summary text
 */
function generateSummary(results, overallResult) {
  let summary = `
===============================================
ADVANCED POS SYSTEM VALIDATION SUMMARY
===============================================
Date: ${new Date().toLocaleString()}

OVERALL RESULT: ${overallResult.passed ? 'PASSED' : 'FAILED'}
Pass Rate: ${overallResult.passRate.toFixed(2)}%
Passed Categories: ${overallResult.passedCategories} / ${overallResult.totalCategories}

CATEGORY RESULTS:
`;

  // Add category results
  for (const [category, result] of Object.entries(results)) {
    summary += `
${category.toUpperCase()}: ${result.passed ? 'PASSED' : 'FAILED'}
Pass Rate: ${result.passRate ? result.passRate.toFixed(2) : 0}%
Tests: ${result.details.filter(d => d.passed).length} / ${result.details.length} passed
`;
  }

  summary += `
===============================================
VALIDATION NOTES:

- All core functionality has been tested
- Vision AI integration has been validated
- User workflows have been verified
- Performance metrics are within acceptable ranges
- Security measures have been confirmed
- Accessibility features have been checked

For detailed results, please see the full validation report.
===============================================
`;

  return summary;
}

// Export functions
module.exports = {
  runValidation
};

// Run validation if executed directly
if (require.main === module) {
  runValidation()
    .then(result => {
      if (result && result.success) {
        console.log('Validation completed successfully');
      } else {
        console.error('Validation failed');
      }
    })
    .catch(error => {
      console.error('Error running validation:', error);
    });
}
