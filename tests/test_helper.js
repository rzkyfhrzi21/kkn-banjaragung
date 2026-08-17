// tests/test_helper.js
// Universal Test Helper for Express API & File Upload Testing (Zero Dependency)
process.env.NODE_ENV = 'test';
process.env.ADMIN_PASSWORD = 'test_password_123';

const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../server');

function startTestServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const url = `http://127.0.0.1:${port}`;
      resolve({
        server,
        port,
        url,
        close: () => new Promise(res => server.close(res))
      });
    });
  });
}

async function loginAdmin(baseUrl) {
  if (typeof app._resetLoginAttempts === 'function') {
    app._resetLoginAttempts();
  }
  const res = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'test_password_123' })
  });
  const data = await res.json();
  return data.token;
}

// Build multipart/form-data payload with boundaries natively
function buildMultipartPayload(fields = {}, files = {}) {
  const boundary = '----WebKitFormBoundaryTest' + Math.random().toString(36).substring(2);
  const parts = [];

  for (const [key, val] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
  }

  for (const [key, file] of Object.entries(files)) {
    const filename = file.filename || 'test.jpg';
    const contentType = file.contentType || 'image/jpeg';
    const content = file.content || Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]); // JPEG magic header
    
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`));
    parts.push(content);
    parts.push(Buffer.from('\r\n'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));
  const body = Buffer.concat(parts);

  return {
    body,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length
    }
  };
}

module.exports = {
  startTestServer,
  loginAdmin,
  buildMultipartPayload
};
