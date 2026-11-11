import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const isImageMime = file.mimetype && file.mimetype.startsWith('image/');
    const isImageExt = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalname) || file.originalname.includes('scaled_') || file.originalname.includes('CAP_');
    if (isImageMime || isImageExt || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

/**
 * POST /api/security/upload
 * Upload an image file from mobile app
 */
router.post('/', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file provided' });
    }
    
    // Construct the relative path that will be saved in the database
    // For example: /uploads/photo-1629837498.jpg
    const photoUrl = `/uploads/${req.file.filename}`;
    
    res.status(201).json({ 
      success: true, 
      photo_path: photoUrl,
      message: 'Photo uploaded successfully' 
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

export default router;
