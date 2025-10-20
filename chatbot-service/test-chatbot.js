const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/chatbot';
const SESSION_ID = `test_${Date.now()}`;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

async function testHealthCheck() {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}Test 1: Health Check${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log(`${colors.green}✓ Health check passed${colors.reset}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(`${colors.red}✗ Health check failed${colors.reset}`);
    console.error('Error:', error.message);
  }
}

async function testChat(message, description) {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${description}${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.yellow}👤 User: ${message}${colors.reset}`);
  
  try {
    const response = await axios.post(`${BASE_URL}/chat`, {
      message,
      sessionId: SESSION_ID
    });
    
    console.log(`${colors.green}✓ Chat successful${colors.reset}`);
    console.log(`${colors.blue}🤖 Assistant:${colors.reset}`, response.data.message);
    console.log(`${colors.yellow}Intent:${colors.reset}`, response.data.intent);
    
    if (response.data.data && Object.keys(response.data.data).length > 0) {
      console.log(`${colors.yellow}Data Keys:${colors.reset}`, Object.keys(response.data.data));
    }
  } catch (error) {
    console.log(`${colors.red}✗ Chat failed${colors.reset}`);
    console.error('Error:', error.message);
  }
}

async function testHistory() {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}Test: Get Conversation History${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  try {
    const response = await axios.get(`${BASE_URL}/history/${SESSION_ID}?limit=10`);
    console.log(`${colors.green}✓ History retrieved${colors.reset}`);
    console.log(`Total messages: ${response.data.history.length}`);
    
    response.data.history.forEach((msg, index) => {
      const roleColor = msg.role === 'user' ? colors.yellow : colors.blue;
      console.log(`${roleColor}[${msg.role.toUpperCase()}]:${colors.reset} ${msg.content.substring(0, 100)}...`);
    });
  } catch (error) {
    console.log(`${colors.red}✗ History retrieval failed${colors.reset}`);
    console.error('Error:', error.message);
  }
}

async function runAllTests() {
  console.log(`\n${colors.bright}${colors.green}╔════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.green}║   🤖 KOOKA CHATBOT SERVICE - TEST SUITE 🤖   ║${colors.reset}`);
  console.log(`${colors.bright}${colors.green}╚════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`Session ID: ${SESSION_ID}\n`);

  // Test 1: Health Check
  await testHealthCheck();

  // Đợi 1 giây
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Tìm món ăn
  await testChat(
    'Tìm món phở bò cho tôi',
    'Test 2: Tìm kiếm món ăn'
  );

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Gợi ý từ nguyên liệu
  await testChat(
    'Tôi có gà, khoai tây và hành tây. Nên nấu món gì?',
    'Test 3: Gợi ý từ nguyên liệu'
  );

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Hỏi về danh mục
  await testChat(
    'Có những loại món ăn nào?',
    'Test 4: Hỏi về danh mục'
  );

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 5: Câu hỏi chung
  await testChat(
    'Làm thế nào để thịt gà mềm hơn?',
    'Test 5: Câu hỏi nấu ăn chung'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 6: Get History
  await testHistory();

  console.log(`\n${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${colors.green}✓ All tests completed!${colors.reset}`);
  console.log(`${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

// Run tests
runAllTests().catch(error => {
  console.error(`${colors.red}Test suite failed:${colors.reset}`, error.message);
  process.exit(1);
});
