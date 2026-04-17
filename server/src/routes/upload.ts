import { Router } from 'express';
import multer from 'multer';
import { S3Storage } from 'coze-coding-dev-sdk';

const router = Router();

// 初始化 S3 存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 配置 multer 内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// 上传图片接口
router.post('/image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    const { buffer, originalname, mimetype } = req.file;
    const timestamp = Date.now();
    const safeName = originalname.replace(/[^\x00-\x7F]/g, '_') || 'image';
    const fileName = `memories/${timestamp}_${safeName}`;

    // 上传到对象存储
    const fileKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: fileName,
      contentType: mimetype,
    });

    // 生成签名 URL（7天有效期）
    const signedUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 7 * 24 * 60 * 60,
    });

    console.log('图片上传成功:', fileKey);
    res.json({ success: true, url: signedUrl, key: fileKey });
  } catch (error: any) {
    console.error('图片上传失败:', error);
    res.status(500).json({ error: error.message || '图片上传失败' });
  }
});

// 错误处理中间件
router.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件大小超过限制（最大 50MB）' });
  }
  next(err);
});

export default router;
