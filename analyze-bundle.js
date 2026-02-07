#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 * Run after build to analyze bundle sizes and identify optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Size thresholds
const THRESHOLDS = {
  totalBundleSize: 500 * 1024, // 500 KB
  chunkSize: 200 * 1024, // 200 KB
  assetSize: 50 * 1024, // 50 KB
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function analyzeBundle() {
  console.log(`${colors.cyan}${colors.bright}🔍 Analyzing Bundle Size...${colors.reset}\n`);

  const distPath = path.join(__dirname, 'dist');

  if (!fs.existsSync(distPath)) {
    console.log(`${colors.red}❌ Build directory not found. Run 'npm run build' first.${colors.reset}`);
    process.exit(1);
  }

  const assets = {
    js: [],
    css: [],
    html: [],
    other: [],
  };

  // Walk through dist directory
  function walkDir(dir, baseDir = '') {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const relativePath = path.join(baseDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walkDir(filePath, relativePath);
      } else {
        const size = stat.size;
        const ext = path.extname(file).toLowerCase();

        const fileInfo = {
          path: relativePath,
          size,
          gzipSize: 0,
        };

        // Estimate gzip size (rough approximation)
        try {
          const gzipSize = execSync(`gzip -c "${filePath}" | wc -c`).toString().trim();
          fileInfo.gzipSize = parseInt(gzipSize, 10);
        } catch (e) {
          fileInfo.gzipSize = Math.round(size * 0.3); // Rough estimate
        }

        if (ext === '.js') {
          assets.js.push(fileInfo);
        } else if (ext === '.css') {
          assets.css.push(fileInfo);
        } else if (ext === '.html') {
          assets.html.push(fileInfo);
        } else {
          assets.other.push(fileInfo);
        }
      }
    });
  }

  walkDir(distPath);

  // Sort by size
  Object.keys(assets).forEach((key) => {
    assets[key].sort((a, b) => b.size - a.size);
  });

  // Calculate totals
  const totals = {
    js: { size: 0, gzipSize: 0, count: 0 },
    css: { size: 0, gzipSize: 0, count: 0 },
    html: { size: 0, gzipSize: 0, count: 0 },
    other: { size: 0, gzipSize: 0, count: 0 },
    all: { size: 0, gzipSize: 0, count: 0 },
  };

  Object.keys(assets).forEach((key) => {
    assets[key].forEach((file) => {
      totals[key].size += file.size;
      totals[key].gzipSize += file.gzipSize;
      totals[key].count++;
      totals.all.size += file.size;
      totals.all.gzipSize += file.gzipSize;
      totals.all.count++;
    });
  });

  // Print results
  console.log(`${colors.bright}📊 Bundle Analysis Report${colors.reset}\n`);
  console.log('=' .repeat(70));

  // Summary
  console.log(`\n${colors.bright}Summary:${colors.reset}`);
  console.log(`Total Files: ${totals.all.count}`);
  console.log(`Total Size: ${formatBytes(totals.all.size)}`);
  console.log(`Total Gzipped: ${formatBytes(totals.all.gzipSize)}`);
  console.log(`Compression Ratio: ${((1 - totals.all.gzipSize / totals.all.size) * 100).toFixed(1)}%`);

  // By type
  console.log(`\n${colors.bright}By Type:${colors.reset}`);
  Object.keys(totals).forEach((key) => {
    if (key !== 'all' && totals[key].count > 0) {
      const icon = key === 'js' ? '📦' : key === 'css' ? '🎨' : key === 'html' ? '📄' : '📁';
      console.log(
        `${icon} ${key.toUpperCase()}: ${totals[key].count} files, ` +
        `${formatBytes(totals[key].size)} (${formatBytes(totals[key].gzipSize)} gzipped)`
      );
    }
  });

  // Largest files
  console.log(`\n${colors.bright}Largest Files:${colors.reset}`);
  const allFiles = [...assets.js, ...assets.css, ...assets.html, ...assets.other];
  allFiles.sort((a, b) => b.size - a.size);
  allFiles.slice(0, 10).forEach((file, index) => {
    const sizeColor = file.size > THRESHOLDS.chunkSize ? colors.red :
                     file.size > THRESHOLDS.assetSize ? colors.yellow :
                     colors.green;
    console.log(
      `${index + 1}. ${file.path}\n` +
      `   Size: ${sizeColor}${formatBytes(file.size)}${colors.reset} ` +
      `(${formatBytes(file.gzipSize)} gzipped)`
    );
  });

  // Warnings
  const warnings = [];

  if (totals.all.size > THRESHOLDS.totalBundleSize) {
    warnings.push(`Total bundle size (${formatBytes(totals.all.size)}) exceeds recommended ${formatBytes(THRESHOLDS.totalBundleSize)}`);
  }

  const largeChunks = assets.js.filter(f => f.size > THRESHOLDS.chunkSize);
  if (largeChunks.length > 0) {
    warnings.push(`${largeChunks.length} JavaScript chunk(s) exceed ${formatBytes(THRESHOLDS.chunkSize)}`);
  }

  if (warnings.length > 0) {
    console.log(`\n${colors.yellow}${colors.bright}⚠️  Warnings:${colors.reset}`);
    warnings.forEach(warning => {
      console.log(`${colors.yellow}• ${warning}${colors.reset}`);
    });
  }

  // Recommendations
  console.log(`\n${colors.cyan}${colors.bright}💡 Recommendations:${colors.reset}`);

  if (largeChunks.length > 0) {
    console.log('• Consider code splitting large chunks');
  }

  if (totals.js.size > totals.js.gzipSize * 3) {
    console.log('• Enable gzip/brotli compression on your server');
  }

  if (assets.js.some(f => f.path.includes('vendor') && f.size > 100 * 1024)) {
    console.log('• Review vendor bundle - consider lazy loading heavy dependencies');
  }

  console.log('\n' + '=' .repeat(70));
  console.log(`\n${colors.green}✅ Analysis complete!${colors.reset}\n`);
}

// Run analysis
analyzeBundle();