import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const uploadDirectory = path.join(projectRoot, 'public', 'uploads');

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const extensionByMimeType = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    const safeBaseName = path
      .parse(file.originalname)
      .name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'item';

    const extension = extensionByMimeType[file.mimetype] || 'bin';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    callback(null, `${safeBaseName}-${uniqueSuffix}.${extension}`);
  }
});

function fileFilter(_req, file, callback) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
  }

  return callback(null, true);
}

export const uploadSingleItemImage = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 1
  },
  fileFilter
}).single('image');

export function getUploadErrorMessage(error) {
  if (!error) {
    return '';
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return 'Image must be 3 MB or smaller.';
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return 'Only JPG, PNG, or WebP image files are allowed.';
    }
  }

  return 'Unable to upload the selected image. Please try again.';
}
