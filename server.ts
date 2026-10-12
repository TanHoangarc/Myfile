import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'files.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface StoredServerFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  category?: string;
  createdAt: string;
  updatedAt?: string;
  validFrom?: string;
  expiresAt?: string;
  notes?: string;
  tags?: string[];
  uploader?: string;
  uploaderEmail?: string;
  fileData?: string;
  shareCount?: number;
  isSyncedToCloud?: boolean;
}

// In-memory + file-backed storage
let fileStore: Map<string, StoredServerFile> = new Map();

function loadFromDisk() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((f) => fileStore.set(f.id, f));
        console.log(`Loaded ${fileStore.size} files from persistent disk storage.`);
      }
    }
  } catch (err) {
    console.error('Error loading files from disk:', err);
  }
}

function saveToDisk() {
  try {
    const list = Array.from(fileStore.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(list), 'utf-8');
  } catch (err) {
    console.error('Error saving files to disk:', err);
  }
}

async function seedFromFirestoreIfEmpty() {
  if (fileStore.size > 0) return;
  try {
    const { initializeApp } = await import('firebase/app');
    const { getFirestore, collection, getDocs } = await import('firebase/firestore');
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      const fapp = initializeApp(cfg, 'server-seed-' + Date.now());
      const fdb = getFirestore(fapp, cfg.firestoreDatabaseId);
      const snap = await getDocs(collection(fdb, 'files'));
      snap.forEach((d) => {
        const data = d.data() as StoredServerFile;
        if (data && data.id && data.name) {
          fileStore.set(data.id, { ...data, isSyncedToCloud: true });
        }
      });
      if (fileStore.size > 0) {
        saveToDisk();
        console.log(`Successfully seeded ${fileStore.size} existing files from Firestore into server storage.`);
      }
    }
  } catch (err) {
    console.warn('Seed from Firestore skipped or non-fatal:', err);
  }
}

loadFromDisk();
seedFromFirestoreIfEmpty();

async function startServer() {
  const app = express();

  // Support large PDF uploads up to 50MB
  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ extended: true, limit: '60mb' }));

  // API Routes for cross-device shared storage (Machine A <-> Machine B)
  
  // Server-Sent Events (SSE) for instant real-time sync across all devices
  const clients: Array<(data: string) => void> = [];

  function broadcastChange(type: string, fileId?: string) {
    const payload = JSON.stringify({ type, fileId, timestamp: Date.now() });
    clients.forEach((c) => {
      try { c(payload); } catch {}
    });
  }

  app.get('/api/files-events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const client = (data: string) => {
      res.write(`data: ${data}\n\n`);
    };
    clients.push(client);

    req.on('close', () => {
      const idx = clients.indexOf(client);
      if (idx !== -1) clients.splice(idx, 1);
    });
  });

  // 1. Get all files list (metadata or with content)
  app.get('/api/files', (req, res) => {
    const includeContent = req.query.includeContent === 'true';
    const list = Array.from(fileStore.values()).map((f) => {
      if (includeContent) return f;
      const { fileData, ...meta } = f;
      return meta;
    });
    res.json(list);
  });

  // 2. Get specific file with content
  app.get('/api/files/:id', (req, res) => {
    const file = fileStore.get(req.params.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(file);
  });

  // 3. Save or update file (Auto-save on upload)
  app.post('/api/files', (req, res) => {
    const file: StoredServerFile = req.body;
    if (!file || !file.id || !file.name) {
      return res.status(400).json({ error: 'Invalid file payload' });
    }

    const existing = fileStore.get(file.id);
    const updated: StoredServerFile = {
      ...(existing || {}),
      ...file,
      updatedAt: new Date().toISOString(),
      isSyncedToCloud: true
    };

    // If fileData is provided, keep it, else keep existing fileData
    if (file.fileData) {
      updated.fileData = file.fileData;
    } else if (existing?.fileData) {
      updated.fileData = existing.fileData;
    }

    fileStore.set(file.id, updated);
    saveToDisk();
    broadcastChange('update', file.id);

    console.log(`Auto-saved file "${updated.name}" (${updated.id}) across all devices. Total files: ${fileStore.size}`);
    res.json({ success: true, file: { ...updated, fileData: undefined } });
  });

  // 4. Batch sync multiple files
  app.post('/api/files/batch-sync', (req, res) => {
    const incoming: StoredServerFile[] = req.body.files;
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ error: 'Expected array of files' });
    }

    let savedCount = 0;
    incoming.forEach((file) => {
      if (file && file.id && file.name) {
        const existing = fileStore.get(file.id);
        const merged: StoredServerFile = {
          ...(existing || {}),
          ...file,
          isSyncedToCloud: true
        };
        if (!file.fileData && existing?.fileData) {
          merged.fileData = existing.fileData;
        }
        fileStore.set(file.id, merged);
        savedCount++;
      }
    });

    if (savedCount > 0) {
      saveToDisk();
      broadcastChange('batch', undefined);
    }

    res.json({ success: true, count: savedCount, total: fileStore.size });
  });

  // 5. Delete file
  app.delete('/api/files/:id', (req, res) => {
    const id = req.params.id;
    if (fileStore.has(id)) {
      fileStore.delete(id);
      saveToDisk();
      broadcastChange('delete', id);
      console.log(`Deleted file ${id} across all devices.`);
    }
    res.json({ success: true });
  });

  // Mount Vite middlewares for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production serve dist
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 DocuVault Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
