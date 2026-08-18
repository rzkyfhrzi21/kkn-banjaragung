// tests/feature/file_upload.test.js
// Pengujian Khusus Validasi Inputan File Media & Upload Handler
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  startTestServer,
  loginAdmin,
  buildMultipartPayload,
} = require("../test_helper");

async function run() {
  console.log("  Testing File Upload & Input Media Validation...");
  const appInstance = await startTestServer();
  const baseUrl = appInstance.url;

  try {
    const token = await loginAdmin(baseUrl);
    assert.ok(token, "Admin token must be obtained");

    // 1. Uji Upload File Gambar Valid (JPEG/PNG)
    const validJpegContent = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xd9,
    ]);

    const { body, headers } = buildMultipartPayload(
      {},
      {
        foto: {
          filename: "test_kades.jpg",
          contentType: "image/jpeg",
          content: validJpegContent,
        },
      },
    );

    const uploadRes = await fetch(`${baseUrl}/api/admin/upload`, {
      method: "POST",
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
      },
      body,
    });

    assert.strictEqual(
      uploadRes.status,
      200,
      "Upload image must return HTTP 200",
    );
    const uploadData = await uploadRes.json();
    assert.strictEqual(
      uploadData.success,
      true,
      "Upload response success must be true",
    );
    assert.ok(
      uploadData.url.startsWith("/uploads/"),
      "Returned URL must be relative /uploads/ path",
    );
    assert.ok(
      uploadData.url.endsWith(".jpg") || uploadData.url.endsWith(".jpeg"),
      "Returned URL must preserve image extension",
    );

    // Verifikasi bahwa file fisik benar-benar tersimpan di disk
    const savedFilename = path.basename(uploadData.url);
    const uploadDir = path.join(__dirname, "../../uploads");
    const savedFilePath = path.join(uploadDir, savedFilename);
    assert.strictEqual(
      fs.existsSync(savedFilePath),
      true,
      "Uploaded file must physically exist in uploads directory",
    );

    // 2. Uji Tolak Upload File Palsu / Ekstensi Bukan Gambar (.exe / .php / .txt)
    const fakePhpContent = Buffer.from('<?php echo "malicious code"; ?>');
    const fakePayload = buildMultipartPayload(
      {},
      {
        foto: {
          filename: "malicious.php",
          contentType: "application/x-php",
          content: fakePhpContent,
        },
      },
    );

    const rejectRes = await fetch(`${baseUrl}/api/admin/upload`, {
      method: "POST",
      headers: {
        ...fakePayload.headers,
        Authorization: `Bearer ${token}`,
      },
      body: fakePayload.body,
    });

    // Multer fileFilter melempar error jika bukan gambar
    assert.ok(
      rejectRes.status === 400 || rejectRes.status === 500,
      "Non-image file must be rejected",
    );

    // 3. Uji Upload Tanpa File (Empty Body)
    const emptyPayload = buildMultipartPayload({}, {});
    const emptyRes = await fetch(`${baseUrl}/api/admin/upload`, {
      method: "POST",
      headers: {
        ...emptyPayload.headers,
        Authorization: `Bearer ${token}`,
      },
      body: emptyPayload.body,
    });
    assert.strictEqual(
      emptyRes.status,
      400,
      "Uploading with no file must return HTTP 400",
    );

    // Cleanup file test jika ada
    try {
      if (fs.existsSync(savedFilePath)) fs.unlinkSync(savedFilePath);
    } catch (e) {}
  } finally {
    await appInstance.close();
  }
}

module.exports = run;

if (require.main === module) {
  run()
    .then(() => console.log("File Upload Feature Test: PASS"))
    .catch((e) => {
      console.error("File Upload Feature Test: FAIL", e);
      process.exit(1);
    });
}
