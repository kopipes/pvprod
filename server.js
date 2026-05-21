const express = require('express');
const Database = require('better-sqlite3');
const { exec } = require('child_process');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Simple hash function for passwords
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

const app = express();
const PORT = process.env.PORT || process.argv[2] || 3000;

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));

// Initialize SQLite Database
const db = new Database('pvprod.db');

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS divisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        status TEXT NOT NULL DEFAULT 'pending',
        division_id INTEGER,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (division_id) REFERENCES divisions(id)
    );
    
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        client TEXT,
        vendor TEXT,
        location TEXT,
        division_id INTEGER,
        start_date DATE,
        end_date DATE,
        status TEXT DEFAULT 'pre-loading',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (division_id) REFERENCES divisions(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS checklist_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        text TEXT NOT NULL,
        checked INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS project_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_name TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_name TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

// Insert default data
const divisionCount = db.prepare('SELECT COUNT(*) as count FROM divisions').get().count;
if (divisionCount === 0) {
    // Divisions
    db.prepare('INSERT INTO divisions (name) VALUES (?)').run('Exhibition');
    db.prepare('INSERT INTO divisions (name) VALUES (?)').run('Event');
    db.prepare('INSERT INTO divisions (name) VALUES (?)').run('Installation');
    db.prepare('INSERT INTO divisions (name) VALUES (?)').run('Stage Design');
    db.prepare('INSERT INTO divisions (name) VALUES (?)').run('Audio Visual');
    
    // Default password for all users: "pvprod123"
    const defaultPass = hashPassword('pvprod123');
    
    // Users - Admin (approved, password: pvprod123)
    db.prepare('INSERT INTO users (name, email, phone, password, role, status, division_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Admin User', 'admin@pvprod.com', '+6281234567890', defaultPass, 'admin', 'approved', null);
    
    // Users - Head (approved)
    db.prepare('INSERT INTO users (name, email, phone, password, role, status, division_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Head User', 'head@pvprod.com', '+6281234567891', defaultPass, 'head', 'approved', null);
    db.prepare('INSERT INTO users (name, email, phone, password, role, status, division_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Sarah Johnson', 'sarah.j@pvprod.com', '+6281234567891', defaultPass, 'head', 'approved', 1);
    db.prepare('INSERT INTO users (name, email, phone, password, role, status, division_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Michael Chen', 'michael.c@pvprod.com', '+6281234567892', defaultPass, 'head', 'approved', 2);
    
    // Users - Manager (approved)
    db.prepare('INSERT INTO users (name, email, phone, password, role, status, division_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Manager A', 'manager@pvprod.com', '+6281234567893', defaultPass, 'manager', 'approved', 1);
    db.prepare('INSERT INTO users (name, email, phone, password, role, status, division_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Budi Santoso', 'budi.s@pvprod.com', '+6281234567894', defaultPass, 'manager', 'approved', 1);
    db.prepare('INSERT INTO users (name, email, phone, password, role, status, division_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Diana Putri', 'diana.p@pvprod.com', '+6281234567895', defaultPass, 'manager', 'approved', 2);
    db.prepare('INSERT INTO users (name, email, phone, password, role, status, division_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Ahmad Rizki', 'ahmad.r@pvprod.com', '+6281234567896', defaultPass, 'manager', 'approved', 3);
    
    // Users - Regular (approved)
    db.prepare('INSERT INTO users (name, email, phone, password, role, status, division_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run('User B', 'user@pvprod.com', '+6281234567897', defaultPass, 'user', 'approved', 1);
    db.prepare('INSERT INTO users (name, email, phone, password, role, status, division_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Rina Wijaya', 'rina.w@pvprod.com', '+6281234567898', defaultPass, 'user', 'approved', 1);
    db.prepare('INSERT INTO users (name, email, phone, password, role, status, division_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Dedi Kurniawan', 'dedi.k@pvprod.com', '+6281234567899', defaultPass, 'user', 'approved', 2);
    db.prepare('INSERT INTO users (name, email, phone, password, role, status, division_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Fitri Handayani', 'fitri.h@pvprod.com', '+6281234567900', defaultPass, 'user', 'approved', 2);
    db.prepare('INSERT INTO users (name, email, phone, password, role, status, division_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Andi Prasetyo', 'andi.p@pvprod.com', '+6281234567901', defaultPass, 'user', 'approved', 3);
    db.prepare('INSERT INTO users (name, email, phone, password, role, status, division_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Lisa Monica', 'lisa.m@pvprod.com', '+6281234567902', defaultPass, 'user', 'approved', 4);
    db.prepare('INSERT INTO users (name, email, phone, password, role, status, division_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Hendra Wijaya', 'hendra.w@pvprod.com', '+6281234567903', defaultPass, 'user', 'approved', 5);
    
    // Insert sample projects
    const project1 = db.prepare('INSERT INTO projects (name, client, division_id, start_date, status, created_by) VALUES (?, ?, ?, ?, ?, ?)').run('Jakarta Expo 2026', 'PT Jakarta Expo Center', 1, '2026-02-15', 'pre-loading', 1);
    const project2 = db.prepare('INSERT INTO projects (name, client, division_id, start_date, status, created_by) VALUES (?, ?, ?, ?, ?, ?)').run('Bandung Fashion Week', 'Bandung Creative City', 2, '2026-03-01', 'loading-in', 1);
    const project3 = db.prepare('INSERT INTO projects (name, client, division_id, start_date, status, created_by) VALUES (?, ?, ?, ?, ?, ?)').run('Surabaya Tech Summit', 'Surabaya Innovation Hub', 1, '2026-04-10', 'completed', 1);
    
    // Insert sample checklist items
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    
    db.prepare('INSERT INTO checklist_items (project_id, type, text, checked, created_at) VALUES (?, ?, ?, ?, ?)').run(project1.lastInsertRowid, 'loadingIn', 'Prepare electrical wiring', 1, yesterday);
    db.prepare('INSERT INTO checklist_items (project_id, type, text, checked, created_at) VALUES (?, ?, ?, ?, ?)').run(project1.lastInsertRowid, 'loadingIn', 'Set up lighting fixtures', 0, yesterday);
    db.prepare('INSERT INTO checklist_items (project_id, type, text, checked, created_at) VALUES (?, ?, ?, ?, ?)').run(project1.lastInsertRowid, 'loadingIn', 'Install signage', 0, today);
    
    db.prepare('INSERT INTO checklist_items (project_id, type, text, checked, created_at) VALUES (?, ?, ?, ?, ?)').run(project2.lastInsertRowid, 'dismantle', 'Remove display panels', 1, yesterday);
    db.prepare('INSERT INTO checklist_items (project_id, type, text, checked, created_at) VALUES (?, ?, ?, ?, ?)').run(project2.lastInsertRowid, 'dismantle', 'Pack fragile items', 1, today);
    db.prepare('INSERT INTO checklist_items (project_id, type, text, checked, created_at) VALUES (?, ?, ?, ?, ?)').run(project2.lastInsertRowid, 'finalVerify', 'Clean exhibition floor', 0, today);
    
    db.prepare('INSERT INTO checklist_items (project_id, type, text, checked, created_at) VALUES (?, ?, ?, ?, ?)').run(project3.lastInsertRowid, 'finalVerify', 'Restore venue to original state', 1, yesterday);
    db.prepare('INSERT INTO checklist_items (project_id, type, text, checked, created_at) VALUES (?, ?, ?, ?, ?)').run(project3.lastInsertRowid, 'finalVerify', 'Return borrowed equipment', 1, yesterday);
    
    console.log('✅ Sample data created!');
}

// ============ API ROUTES ============

// Divisions
app.get('/api/divisions', (req, res) => {
    try {
        const divisions = db.prepare('SELECT * FROM divisions ORDER BY created_at DESC').all();
        res.json(divisions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/divisions', (req, res) => {
    try {
        const { name, user_name } = req.body;
        const result = db.prepare('INSERT INTO divisions (name) VALUES (?)').run(name);
        if (user_name) logAudit(null, user_name, 'CREATE', 'Division', name, 'Created new division');
        res.json({ id: result.lastInsertRowid, name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/divisions/:id', (req, res) => {
    try {
        const { name, user_name } = req.body;
        const old = db.prepare('SELECT name FROM divisions WHERE id = ?').get(req.params.id);
        db.prepare('UPDATE divisions SET name = ? WHERE id = ?').run(name, req.params.id);
        if (user_name) logAudit(null, user_name, 'UPDATE', 'Division', name, `Changed from "${old?.name}" to "${name}"`);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/divisions/:id', (req, res) => {
    try {
        const body = req.body || {};
        const { user_name, division_name } = body;
        // Clear foreign key references first
        db.prepare('UPDATE users SET division_id = NULL WHERE division_id = ?').run(req.params.id);
        db.prepare('UPDATE projects SET division_id = NULL WHERE division_id = ?').run(req.params.id);
        db.prepare('DELETE FROM divisions WHERE id = ?').run(req.params.id);
        if (user_name) logAudit(null, user_name, 'DELETE', 'Division', division_name, 'Deleted division');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Users
app.get('/api/users', (req, res) => {
    try {
        const users = db.prepare(`
            SELECT u.*, d.name as division_name 
            FROM users u 
            LEFT JOIN divisions d ON u.division_id = d.id 
            ORDER BY u.created_at DESC
        `).all();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users/:id', (req, res) => {
    try {
        const user = db.prepare(`
            SELECT u.*, d.name as division_name 
            FROM users u 
            LEFT JOIN divisions d ON u.division_id = d.id 
            WHERE u.id = ?
        `).get(req.params.id);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', (req, res) => {
    try {
        const { name, email, phone, role, division_id } = req.body;
        // Default password for admin-created users
        const defaultPassword = hashPassword('pvprod123');
        const result = db.prepare('INSERT INTO users (name, email, phone, role, division_id, password, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(name, email, phone, role, division_id || null, defaultPassword, 'approved');
        res.json({ id: result.lastInsertRowid, name, email, phone, role, division_id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:id', (req, res) => {
    try {
        const { name, email, phone, role, division_id, password } = req.body;
        db.prepare('UPDATE users SET name = ?, email = ?, phone = ?, role = ?, division_id = ? WHERE id = ?').run(name, email, phone, role, division_id || null, req.params.id);
        if (password) {
            const hashedPassword = hashPassword(password);
            db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.params.id);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/users/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User Settings (profile update)
app.put('/api/users/:id/settings', (req, res) => {
    try {
        const { name, email, phone } = req.body;
        db.prepare('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?').run(name, email, phone, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Projects
app.get('/api/projects', (req, res) => {
    try {
        const projects = db.prepare(`
            SELECT p.*, d.name as division_name, u.name as creator_name
            FROM projects p
            LEFT JOIN divisions d ON p.division_id = d.id
            LEFT JOIN users u ON p.created_by = u.id
            ORDER BY p.created_at DESC
        `).all();
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/projects', (req, res) => {
    try {
        const { name, client, vendor, location, division_id, start_date, created_by } = req.body;
        const result = db.prepare(`
            INSERT INTO projects (name, client, vendor, location, division_id, start_date, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(name, client, vendor, location, division_id, start_date, created_by);
        res.json({ id: result.lastInsertRowid, name, client, vendor, location, division_id, start_date, status: 'pre-loading' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/projects/:id', (req, res) => {
    try {
        const project = db.prepare(`
            SELECT p.*, d.name as division_name
            FROM projects p
            LEFT JOIN divisions d ON p.division_id = d.id
            WHERE p.id = ?
        `).get(req.params.id);
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        project.photos = db.prepare('SELECT * FROM photos WHERE project_id = ? ORDER BY created_at DESC').all(project.id).map(p => ({ ...p, filepath: '/uploads/' + p.filepath }));
        project.checklist = db.prepare('SELECT * FROM checklist_items WHERE project_id = ? ORDER BY created_at DESC').all(project.id);
        
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/projects/:id', (req, res) => {
    try {
        const { name, client, vendor, location, division_id, start_date, end_date, status } = req.body;
        // Handle null/empty division_id to avoid FOREIGN KEY constraint
        const divId = (division_id === '' || division_id === null || division_id === undefined) ? null : division_id;
        db.prepare('UPDATE projects SET name = ?, client = ?, vendor = ?, location = ?, division_id = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?').run(name, client, vendor, location, divId, start_date, end_date, status, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/projects/:id', (req, res) => {
    try {
        const photos = db.prepare('SELECT filepath FROM photos WHERE project_id = ?').all(req.params.id);
        photos.forEach(photo => {
            const filepath = path.join(uploadsDir, photo.filepath);
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        });
        db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/projects/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        db.prepare('UPDATE projects SET status = ? WHERE id = ?').run(status, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function to convert HEIC to JPEG using macOS sips (native support)
function convertHeicToJpeg(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        // Use macOS native sips tool which properly handles HEIC
        exec(`sips -s format jpeg "${inputPath}" --out "${outputPath}"`, (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
}

// Photos Upload - Convert HEIC to JPEG for compatibility
app.post('/api/projects/:id/photos', upload.array('files', 20), async (req, res) => {
    try {
        const { type, note, user_name } = req.body;
        const photos = [];
        
        for (const file of req.files) {
            const ext = path.extname(file.originalname).toLowerCase();
            const isHeic = ['.heic', '.heif', '.avif', '.heics'].includes(ext);
            
            if (isHeic) {
                // Convert HEIC to JPEG
                const jpegFilename = file.filename.replace(ext, '.jpg');
                const jpegPath = path.join(uploadsDir, jpegFilename);
                
                try {
                    await convertHeicToJpeg(file.path, jpegPath);
                    fs.unlinkSync(file.path); // Remove original HEIC
                    
                    const result = db.prepare(`
                        INSERT INTO photos (project_id, type, filename, filepath, note)
                        VALUES (?, ?, ?, ?, ?)
                    `).run(req.params.id, type, file.originalname, jpegFilename, note || '');
                    
                    photos.push({
                        id: result.lastInsertRowid,
                        project_id: parseInt(req.params.id),
                        type,
                        filename: file.originalname,
                        filepath: '/uploads/' + jpegFilename,
                        note: note || '',
                        created_at: new Date().toISOString()
                    });
                } catch (err) {
                    console.error('HEIC conversion failed:', err);
                    // Save as-is if conversion fails
                    const result = db.prepare(`
                        INSERT INTO photos (project_id, type, filename, filepath, note)
                        VALUES (?, ?, ?, ?, ?)
                    `).run(req.params.id, type, file.originalname, file.filename, note || '');
                    
                    photos.push({
                        id: result.lastInsertRowid,
                        project_id: parseInt(req.params.id),
                        type,
                        filename: file.originalname,
                        filepath: '/uploads/' + file.filename,
                        note: note || '',
                        created_at: new Date().toISOString()
                    });
                }
            } else {
                // Save other files as-is
                const result = db.prepare(`
                    INSERT INTO photos (project_id, type, filename, filepath, note)
                    VALUES (?, ?, ?, ?, ?)
                `).run(req.params.id, type, file.originalname, file.filename, note || '');
                
                photos.push({
                    id: result.lastInsertRowid,
                    project_id: parseInt(req.params.id),
                    type,
                    filename: file.originalname,
                    filepath: '/uploads/' + file.filename,
                    note: note || '',
                    created_at: new Date().toISOString()
                });
            }
        }
        
        if (user_name) logAudit(null, user_name, 'CREATE', 'Photo', `${photos.length} ${type} photo(s)`, `Uploaded ${photos.length} photo(s) for ${type}`);
        res.json(photos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/photos/:id', (req, res) => {
    try {
        const { note, filename, user_name } = req.body;
        const old = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
        db.prepare('UPDATE photos SET note = ?, filename = ? WHERE id = ?').run(note || '', filename || '', req.params.id);
        if (user_name && old) {
            const changes = [];
            if (old.note !== note) changes.push(`note: "${old.note || ''}" → "${note || ''}"`);
            if (old.filename !== filename) changes.push(`filename: "${old.filename}" → "${filename}"`);
            logAudit(null, user_name, 'UPDATE', 'Photo', old.filename, changes.join(', ') || 'No changes detected');
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/photos/:id', (req, res) => {
    try {
        const { user_name } = req.body;
        const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
        if (photo) {
            const filepath = path.join(uploadsDir, photo.filepath.replace('/uploads/', ''));
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
            if (user_name) logAudit(null, user_name, 'DELETE', 'Photo', photo.filename, `Deleted ${photo.type} photo`);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Checklist Items
app.post('/api/projects/:id/checklist', (req, res) => {
    try {
        const { type, text, user_name } = req.body;
        const result = db.prepare(`
            INSERT INTO checklist_items (project_id, type, text)
            VALUES (?, ?, ?)
        `).run(req.params.id, type, text);
        if (user_name) logAudit(null, user_name, 'CREATE', 'Checklist', text.substring(0, 50), `Added "${text}" to ${type}`);
        res.json({ id: result.lastInsertRowid, project_id: parseInt(req.params.id), type, text, checked: 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/checklist/:id', (req, res) => {
    try {
        const { checked, text, user_name } = req.body;
        const old = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(req.params.id);
        
        if (text) {
            db.prepare('UPDATE checklist_items SET checked = ?, text = ? WHERE id = ?').run(checked ? 1 : 0, text, req.params.id);
        } else {
            db.prepare('UPDATE checklist_items SET checked = ? WHERE id = ?').run(checked ? 1 : 0, req.params.id);
        }
        
        if (user_name && old) {
            const changes = [];
            if (old.text !== text) changes.push(`text: "${old.text}" → "${text}"`);
            if (old.checked !== (checked ? 1 : 0)) changes.push(`checked: ${old.checked ? '✓' : '✗'} → ${checked ? '✓' : '✗'}`);
            logAudit(null, user_name, 'UPDATE', 'Checklist', old.text.substring(0, 50), changes.join(', ') || 'No changes detected');
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/checklist/:id', (req, res) => {
    try {
        const { user_name } = req.body;
        const item = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(req.params.id);
        db.prepare('DELETE FROM checklist_items WHERE id = ?').run(req.params.id);
        if (user_name && item) logAudit(null, user_name, 'DELETE', 'Checklist', item.text.substring(0, 50), `Deleted from ${item.type}`);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Project Members
app.get('/api/projects/:id/members', (req, res) => {
    try {
        const members = db.prepare(`
            SELECT u.id, u.name, u.email, u.role, pm.created_at
            FROM project_members pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
            ORDER BY pm.created_at DESC
        `).all(req.params.id);
        res.json(members);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/projects/:id/members', (req, res) => {
    try {
        const { user_id } = req.body;
        db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)').run(req.params.id, user_id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/projects/:id/members/:userId', (req, res) => {
    try {
        db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Audit Logs
app.get('/api/audit', (req, res) => {
    try {
        const logs = db.prepare(`
            SELECT * FROM audit_logs 
            ORDER BY created_at DESC 
            LIMIT 100
        `).all();
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function to log audit
function logAudit(userId, userName, action, entityType, entityName, details) {
    try {
        db.prepare(`
            INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_name, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, userName, action, entityType, entityName, details);
    } catch (error) {
        console.error('Audit log error:', error.message);
    }
}

// ============ AUTH ROUTES ============

// Login
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const hashedPassword = hashPassword(password);
        
        if (user.password !== hashedPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        if (user.status !== 'approved') {
            return res.status(403).json({ error: 'Your account is pending approval. Please wait for admin/manager to approve.' });
        }
        
        // Don't send password back
        delete user.password;
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Register
app.post('/api/auth/register', (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        
        // Check if email already exists
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        const hashedPassword = hashPassword(password);
        const result = db.prepare(`
            INSERT INTO users (name, email, phone, password, role, status) 
            VALUES (?, ?, ?, ?, 'user', 'pending')
        `).run(name, email, phone || '', hashedPassword);
        
        res.json({ 
            id: result.lastInsertRowid, 
            message: 'Registration successful! Please wait for admin/manager approval.' 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get pending registrations (for Admin/Manager)
app.get('/api/auth/pending', (req, res) => {
    try {
        const users = db.prepare(`
            SELECT u.*, d.name as division_name 
            FROM users u 
            LEFT JOIN divisions d ON u.division_id = d.id 
            WHERE u.status = 'pending'
            ORDER BY u.created_at DESC
        `).all();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve user
app.post('/api/auth/approve/:id', (req, res) => {
    try {
        db.prepare('UPDATE users SET status = ? WHERE id = ?').run('approved', req.params.id);
        logAudit(null, req.body.approver_name || 'System', 'APPROVE', 'User', 'User ID: ' + req.params.id, 'User approved');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reject user
app.post('/api/auth/reject/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM users WHERE id = ? AND status = ?').run(req.params.id, 'pending');
        logAudit(null, req.body.approver_name || 'System', 'REJECT', 'User', 'User ID: ' + req.params.id, 'User registration rejected');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user status
app.put('/api/users/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stats
app.get('/api/stats', (req, res) => {
    try {
        const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
        const activeProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status != 'completed'").get().count;
        const totalPhotos = db.prepare('SELECT COUNT(*) as count FROM photos').get().count;
        const totalChecklist = db.prepare('SELECT COUNT(*) as count FROM checklist_items').get().count;
        const checkedItems = db.prepare('SELECT COUNT(*) as count FROM checklist_items WHERE checked = 1').get().count;
        
        res.json({
            totalProjects,
            activeProjects,
            totalPhotos,
            totalChecklist,
            checkedItems
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve index.html for all other routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🚀 PVPROD Server running at http://localhost:${PORT}\n`);
});