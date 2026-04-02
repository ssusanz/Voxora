import { Router } from 'express';
import multer from 'multer';
import { S3Storage } from 'coze-coding-dev-sdk';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 限制 100MB
});

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 上传单个文件
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未提供文件' });
    }

    const { buffer, originalname, mimetype } = req.file;

    // 确定存储路径
    const folder = mimetype.startsWith('image/')
      ? 'images'
      : mimetype.startsWith('video/')
        ? 'videos'
        : mimetype.startsWith('audio/')
          ? 'audios'
          : 'files';

    const fileName = `${folder}/${Date.now()}_${originalname}`;

    // 上传到对象存储
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: mimetype,
    });

    // 生成访问 URL
    const url = await storage.generatePresignedUrl({ key, expireTime: 86400 });

    res.json({
      success: true,
      data: {
        key,
        url,
        originalName: originalname,
        mimeType: mimetype,
      },
    });
  } catch (err: any) {
    console.error('上传文件失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 批量上传文件
router.post('/batch', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: '未提供文件' });
    }

    const files = req.files as Express.Multer.File[];
    const results = await Promise.all(
      files.map(async (file) => {
        const { buffer, originalname, mimetype } = file;

        const folder = mimetype.startsWith('image/')
          ? 'images'
          : mimetype.startsWith('video/')
            ? 'videos'
            : mimetype.startsWith('audio/')
              ? 'audios'
              : 'files';

        const fileName = `${folder}/${Date.now()}_${originalname}`;

        const key = await storage.uploadFile({
          fileContent: buffer,
          fileName,
          contentType: mimetype,
        });

        const url = await storage.generatePresignedUrl({ key, expireTime: 86400 });

        return {
          key,
          url,
          originalName: originalname,
          mimeType: mimetype,
        };
      })
    );

    res.json({ success: true, data: results });
  } catch (err: any) {
    console.error('批量上传文件失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Multer 错误处理中间件
router.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: '文件大小超过限制（最大 100MB）',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: '文件数量超过限制（最多 10 个）',
      });
    }
  }
  next(err);
});

export default router;
