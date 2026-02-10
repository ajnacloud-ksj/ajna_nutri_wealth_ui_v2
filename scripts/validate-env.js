#!/usr/bin/env node

/**
 * Environment Configuration Validator
 * Ensures all required environment variables are properly configured before build
 */

const chalk = require('chalk');

// Define required environment variables for production
const requiredEnvVars = [
  { key: 'VITE_API_URL', description: 'Backend API URL' },
  { key: 'VITE_AUTH_MODE', description: 'Authentication mode (cognito/local)' },
  { key: 'VITE_USER_POOL_ID', description: 'Cognito User Pool ID', requiredWhen: (env) => env.VITE_AUTH_MODE === 'cognito' },
  { key: 'VITE_USER_POOL_CLIENT_ID', description: 'Cognito Client ID', requiredWhen: (env) => env.VITE_AUTH_MODE === 'cognito' },
  { key: 'VITE_AWS_REGION', description: 'AWS Region', requiredWhen: (env) => env.VITE_AUTH_MODE === 'cognito' }
];

// Placeholder patterns that indicate misconfiguration
const placeholderPatterns = [
  /your-/i,
  /xxx/i,
  /placeholder/i,
  /example/i,
  /<.*>/
];

function validateEnvironment() {
  console.log(chalk.blue('\n🔍 Validating environment configuration...\n'));

  let hasErrors = false;
  const env = process.env;

  for (const varDef of requiredEnvVars) {
    const { key, description, requiredWhen } = varDef;
    const value = env[key];

    // Check if variable is required based on conditions
    const isRequired = !requiredWhen || requiredWhen(env);

    if (!isRequired) {
      continue;
    }

    // Check if variable exists
    if (!value) {
      console.log(chalk.red(`✗ ${key} is not set`));
      console.log(chalk.gray(`  Description: ${description}`));
      hasErrors = true;
      continue;
    }

    // Check for placeholder values
    const hasPlaceholder = placeholderPatterns.some(pattern => pattern.test(value));
    if (hasPlaceholder) {
      console.log(chalk.yellow(`⚠ ${key} appears to contain a placeholder value`));
      console.log(chalk.gray(`  Current value: ${value}`));
      console.log(chalk.gray(`  Description: ${description}`));
      hasErrors = true;
      continue;
    }

    // Variable is properly set
    console.log(chalk.green(`✓ ${key} is configured`));
    console.log(chalk.gray(`  Value: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`));
  }

  // Additional validation for Cognito configuration
  if (env.VITE_AUTH_MODE === 'cognito') {
    console.log(chalk.blue('\n🔐 Validating Cognito configuration...\n'));

    // Validate User Pool ID format
    const poolIdPattern = /^[a-z]{2}-[a-z]+-\d_[A-Za-z0-9]+$/;
    if (env.VITE_USER_POOL_ID && !poolIdPattern.test(env.VITE_USER_POOL_ID)) {
      console.log(chalk.yellow(`⚠ VITE_USER_POOL_ID format looks incorrect`));
      console.log(chalk.gray(`  Expected format: region_identifier (e.g., ap-south-1_DxH2t3WLy)`));
      hasErrors = true;
    }

    // Validate Client ID format (should be alphanumeric)
    const clientIdPattern = /^[a-z0-9]+$/;
    if (env.VITE_USER_POOL_CLIENT_ID && !clientIdPattern.test(env.VITE_USER_POOL_CLIENT_ID)) {
      console.log(chalk.yellow(`⚠ VITE_USER_POOL_CLIENT_ID format looks incorrect`));
      console.log(chalk.gray(`  Expected: alphanumeric string`));
      hasErrors = true;
    }

    // Validate region format
    const regionPattern = /^[a-z]{2}-[a-z]+-\d+$/;
    if (env.VITE_AWS_REGION && !regionPattern.test(env.VITE_AWS_REGION)) {
      console.log(chalk.yellow(`⚠ VITE_AWS_REGION format looks incorrect`));
      console.log(chalk.gray(`  Expected format: region code (e.g., ap-south-1, us-east-1)`));
      hasErrors = true;
    }
  }

  // Summary
  console.log(chalk.blue('\n📋 Summary\n'));
  if (hasErrors) {
    console.log(chalk.red('✗ Environment validation failed'));
    console.log(chalk.gray('\nPlease fix the issues above and try again.'));
    console.log(chalk.gray('Set environment variables or update your .env file.\n'));
    process.exit(1);
  } else {
    console.log(chalk.green('✓ All environment variables are properly configured'));
    console.log(chalk.gray(`Auth mode: ${env.VITE_AUTH_MODE}`));
    if (env.VITE_AUTH_MODE === 'cognito') {
      console.log(chalk.gray(`Cognito Pool: ${env.VITE_USER_POOL_ID}`));
    }
    console.log(chalk.green('\nReady to build! 🚀\n'));
  }
}

// Run validation if this is the main module
if (require.main === module) {
  try {
    // Try to load .env file if it exists (for local testing)
    require('dotenv').config();
  } catch (e) {
    // Ignore if dotenv is not installed
  }

  validateEnvironment();
}

module.exports = { validateEnvironment };