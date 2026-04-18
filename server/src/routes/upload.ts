import { Router, type Request } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const router = Router();

let s3Singleton: S3Client | undefined;

function bucketEndpoint(): string {
  return (process.env.VOXORA_S3_ENDPOINT_URL || process.env.COZE_BUCKET_ENDPOINT_URL || '').trim();
}

function bucketName(): string {
  return (process.env.VOXORA_S3_BUCKET || process.env.COZE_BUCKET_NAME || '').trim();
}

function isBucketConfigured(): boolean {
  return Boolean(bucketEndpoint() && bucketName());
}

function shouldForcePathStyle(endpointUrl: string): boolean {
  if ((process.env.VOXORA_S3_FORCE_PATH_STYLE || '').trim().toLowerCase() === '0') {
    return false;
  }
  if ((process.env.VOXORA_S3_FORCE_PATH_STYLE || '').trim().toLowerCase() === '1') {
    return true;
  }
  return !/amazonaws\.com(\/|$)/i.test(endpointUrl);
}

function getS3Client(): S3Client {
  if (s3Singleton) return s3Singleton;
  const endpointUrl = bucketEndpoint();
  const region = (process.env.VOXORA_S3_REGION || process.env.AWS_REGION || 'us-east-1').trim();
  const accessKeyId = (process.env.VOXORA_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.VOXORA_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '').trim();
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      '已配置对象存储端点与桶名，但未设置访问密钥。请设置 VOXORA_S3_ACCESS_KEY_ID / VOXORA_S3_SECRET_ACCESS_KEY（或 AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY）。'
    );
  }
  s3Singleton = new S3Client({
    region,
    endpoint: endpointUrl,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: shouldForcePathStyle(endpointUrl),
  });
  return s3Singleton;
}

function getLocalMemoriesDir(): string {
  return path.resolve(process.cwd(), 'data', 'local-uploads', 'memories');
}

function publicBaseUrl(req: Request): string {
  const xf = req.get('x-forwarded-proto');
  const proto = (xf && xf.split(',')[0].trim()) || req.protocol || 'http';
  const host = req.get('host') || `127.0.0.1:${process.env.PORT || 9091}`;
  return `${proto}://${host}`;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post('/image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    const { buffer, originalname, mimetype } = req.file;
    const timestamp = Date.now();
    const safeName = originalname.replace(/[^\x00-\x7F]/g, '_') || 'image';
    const baseName = `${timestamp}_${safeName}`;
    const bucket = bucketName();
    const Key = `memories/${baseName}`;

    if (isBucketConfigured()) {
      const client = getS3Client();
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key,
          Body: buffer,
          ContentType: mimetype || 'application/octet-stream',
        })
      );
      const signedUrl = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key }),
        { expiresIn: 7 * 24 * 60 * 60 }
      );
      console.log('图片上传成功(S3):', Key);
      return res.json({ success: true, url: signedUrl, key: Key, storage: 's3' });
    }

    const dir = getLocalMemoriesDir();
    fs.mkdirSync(dir, { recursive: true });
    const diskPath = path.join(dir, baseName);
    fs.writeFileSync(diskPath, buffer);
    const url = `${publicBaseUrl(req)}/uploads/local-memories/${encodeURIComponent(baseName)}`;
    console.log('图片上传成功(本机回退):', url);
    return res.json({ success: true, url, key: baseName, storage: 'local' });
  } catch (error: any) {
    console.error('图片上传失败:', error);
    res.status(500).json({ error: error.message || '图片上传失败' });
  }
});

router.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件大小超过限制（最大 50MB）' });
  }
  next(err);
});

export default router;
