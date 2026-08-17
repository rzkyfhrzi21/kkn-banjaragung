// tests/run_all_tests.js
// Standalone Master Test Runner for Pekon Banjar Agung (Node.js Universal Runner)
const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function getTestFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getTestFiles(filePath, filesList);
    } else if (file.endsWith('.test.js')) {
      filesList.push(filePath);
    }
  }
  return filesList;
}

async function main() {
  console.log(`\n${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}🚀 PEKON BANJAR AGUNG - AUTOMATED UNIT & FEATURE TEST SUITE${RESET}`);
  console.log(`${CYAN}======================================================================${RESET}\n`);

  const testsDir = __dirname;
  const testFiles = getTestFiles(testsDir);

  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const file of testFiles) {
    const relPath = path.relative(path.join(__dirname, '..'), file);
    const testName = path.basename(file);
    process.stdout.write(`Testing [${BOLD}${relPath}${RESET}] ... `);

    try {
      // Clear require cache for isolated execution
      delete require.cache[require.resolve(file)];
      const testFn = require(file);
      if (typeof testFn === 'function') {
        await testFn();
      }
      console.log(`${GREEN}${BOLD}[PASS]${RESET}`);
      passed++;
    } catch (err) {
      console.log(`${RED}${BOLD}[FAIL]${RESET}`);
      console.error(`  ${RED}Error:${RESET} ${err.message || err}`);
      if (err.stack) {
        const stackLines = err.stack.split('\n').slice(1, 4).join('\n');
        console.error(`  ${YELLOW}${stackLines}${RESET}`);
      }
      failed++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);

  console.log(`\n${CYAN}----------------------------------------------------------------------${RESET}`);
  if (failed === 0) {
    console.log(`${GREEN}${BOLD}📊 HASIL AKHIR: ${passed} Passed, ${failed} Failed (${elapsed}s) - ALL TESTS PASSED!${RESET}`);
  } else {
    console.log(`${RED}${BOLD}📊 HASIL AKHIR: ${passed} Passed, ${failed} Failed (${elapsed}s) - SOME TESTS FAILED!${RESET}`);
  }
  console.log(`${CYAN}----------------------------------------------------------------------${RESET}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
