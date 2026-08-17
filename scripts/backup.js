const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const AWS = require('aws-sdk');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const OUT = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function makeBackup() {
  const date = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${date}.zip`;
  const outPath = path.join(OUT, filename);
  const output = fs.createWriteStream(outPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', async () => {
    console.log('Backup created:', outPath, archive.pointer() + ' total bytes');
    if (process.env.AWS_S3_BUCKET) {
      const s3 = new AWS.S3();
      const fileStream = fs.createReadStream(outPath);
      await s3.upload({ Bucket: process.env.AWS_S3_BUCKET, Key: `backups/${filename}`, Body: fileStream }).promise();
      console.log('Backup uploaded to S3:', filename);
    }
  });

  archive.on('error', err => { throw err; });
  archive.pipe(output);
  if (fs.existsSync(DATA_DIR)) archive.directory(DATA_DIR, 'data');
  if (fs.existsSync(UPLOAD_DIR)) archive.directory(UPLOAD_DIR, 'uploads');
  await archive.finalize();
}

makeBackup().catch(err => { console.error(err); process.exit(1); });
