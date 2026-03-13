const express = require('express');
const multer = require('multer');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const tar = require('tar');

const app = express();
const PORT = 3000;
const FLAG = process.env.FLAG || 'FLAG{fake_flag}';

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
    const ext = path.extname(file.originalname) || '';
    cb(null, 'upload-' + Date.now() + ext);
  }
});
const upload = multer({
  storage
}).single('file');

app.get('/', (req, res) => {
  res.send('you can upload your img\ndo not upload other file');
});

app.get('/public/:filename', async (req, res) => {
  const filePath = path.join(PUBLIC_DIR, req.params.filename);
  try {
    const ext = path.extname(req.params.filename).toLowerCase();

    if (ext === '.jpg') {
      const content = await fsp.readFile(filePath);
      res.setHeader('Content-Type', 'image/jpeg');
      res.send(content);
    } else {
      const content = await fsp.readFile(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/plain');
      res.send(content);
    }
  } catch (e) {
    res.status(404).send('File not found');
  }
});

app.get('/upload', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Upload jpg or tar</h1>
        <form action="/upload" method="post" enctype="multipart/form-data">
          <input type="file" name="file" />
          <button type="submit">Upload</button>
        </form>
      </body>
    </html>
  `);
});

app.post('/upload', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error(err);
      return res.status(400).send('Upload error');
    }

    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    const originalName = req.file.originalname.toLowerCase();
    const ext = path.extname(originalName);

    if (ext === '.jpg') {
      const targetPath = path.join(PUBLIC_DIR, path.basename(originalName));

      try {
        const resolved = path.resolve(PUBLIC_DIR, path.basename(originalName));
        if (!resolved.startsWith(PUBLIC_DIR + path.sep)) {
          return res.status(400).send('Invalid file name');
        }

        await fsp.copyFile(req.file.path, targetPath);
        await fsp.unlink(req.file.path).catch(() => {});

        return res.send('Single JPG uploaded.');
      } catch (e) {
        console.error(e);
        return res.status(500).send('Error saving jpg');
      }
    }

if (ext === '.tar') {
  const tarPath = req.file.path;

  try {
    await tar.list({
      file: tarPath,
      onentry: (entry) => {
        console.log('Entry:', entry.path, entry.type);
      }
    });

    const extractedPaths = [];

    await tar.x({
      file: tarPath,
      cwd: PUBLIC_DIR,
      onentry: (entry) => {
        const resolved = path.resolve(PUBLIC_DIR, entry.path);

        if (!resolved.startsWith(PUBLIC_DIR + path.sep)) {
          console.log('Path traversal detected, skip:', entry.path, '->', resolved);
          entry.resume();
          return;
        }

        extractedPaths.push({
          resolved,
          isJpg: entry.path.toLowerCase().endsWith('.jpg')
        });
      }
    });

    for (const { resolved, isJpg } of extractedPaths) {
      if (!isJpg) {
        console.log('Overwriting non-jpg with nope:', resolved);
        await fsp.writeFile(resolved, 'nope');
      }
    }

    await fsp.unlink(tarPath).catch(() => {});

    return res.send('Tar uploaded and extracted (safe mode).');
  } catch (e) {
    console.error(e);
    return res.status(500).send('Extraction error');
  }
}
    try {
      await fsp.unlink(req.file.path).catch(() => {});
    } catch {}

    return res.status(400).send('Only jpg or tar files are allowed');
  });
});

app.get('/flag', async (req, res) => {
  try {
    const content = await fsp.readFile(ISADMIN_PATH, 'utf8');
    const isAdmin = content.trim().toLowerCase() !== 'false';

    if (!isAdmin) {
      return res.status(403).send('You are not admin.');
    }

    res.send(FLAG);
  } catch (e) {
    console.error(e);
    res.status(500).send('Error reading isadmin');
  }
});

app.get('/dir', async (req, res) => {
  try {
    const entries = await fsp.readdir(ROOT_DIR, { withFileTypes: true });
    const list = entries.map(e => ({
      name: e.name,
      path: path.join(ROOT_DIR, e.name),
      type: e.isDirectory() ? 'dir' : 'file',
    }));
    res.json(list);
  } catch (e) {
    res.status(500).send('Failed to read directory');
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
