const express = require('express');
const multer = require('multer');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const tar = require('tar');

const app = express();
const PORT = 3000;
const FLAG = process.env.FLAG || 'FLAG{**redected**}';

const ROOT_DIR = __dirname;
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const ISADMIN_PATH = path.join(ROOT_DIR, 'isadmin.txt');

for (const dir of [UPLOAD_DIR, PUBLIC_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
if (!fs.existsSync(ISADMIN_PATH)) {
  fs.writeFileSync(ISADMIN_PATH, 'false', 'utf8');
}

app.use('/images', express.static(PUBLIC_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, 'upload-' + Date.now() + '.tar');
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // 간단히 .tar만 허용 (MIME까지 제대로 보려면 추가 검사 필요)
    if (file.originalname.endsWith('.tar')) {
      cb(null, true);
    } else {
      cb(new Error('Only .tar files are allowed'));
    }
  }
}).single('file');

app.post('/upload', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error(err);
      return res.status(400).send('Upload error');
    }

    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    const tarPath = req.file.path;

    try {
      await tar.list({
        file: tarPath,
        onentry: (entry) => {
          console.log('Entry:', entry.path, entry.type);
        }
      });

      await tar.x({
        file: tarPath,
        cwd: PUBLIC_DIR,
        filter: (p, stat) => {
          if (stat.type !== 'File') {
            console.log('Skip non-regular entry:', p, stat.type);
            return false;
          }

          if (!p.toLowerCase().endsWith('.jpg')) {
            console.log('Skip non-jpg:', p);
            return false;
          }

          const resolved = path.resolve(PUBLIC_DIR, p);

          if (!resolved.startsWith(PUBLIC_DIR + path.sep)) {
            console.log('Path traversal detected, skip:', p, '->', resolved);
            return false;
          }

          return true;
        }
      });

      await fsp.unlink(tarPath).catch(() => {});

      res.send('Upload and extract completed (safe mode).');
    } catch (e) {
      console.error(e);
      res.status(500).send('Extraction error');
    }
  });
});

app.get('/flag', async (req, res) => {
  try {
    const content = await fsp.readFile(ISADMIN_PATH, 'utf8');
    const isAdmin = content.trim().toLowerCase() === 'true';

    if (!isAdmin) {
      return res.status(403).send('You are not admin.');
    }

    res.send(FLAG);
  } catch (e) {
    console.error(e);
    res.status(500).send('Error reading isadmin');
  }
});

app.get('/', (req, res) => {
  res.send('Node-tar image upload service (safe version).');
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


