import express from "express";
import cors from "cors";
import memoriesRouter from "./routes/memories";
import familiesRouter from "./routes/families";
import petsRouter from "./routes/pets";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/memories', memoriesRouter);
app.use('/api/v1/families', familiesRouter);
app.use('/api/v1/pets', petsRouter);

// User routes (简化版)
app.get('/api/v1/users/me', (req, res) => {
  res.json({
    id: '1',
    name: '小明',
    email: 'xiaoming@example.com',
    familyId: 'family_1',
    avatar: '',
    createdAt: '2023-01-15T00:00:00Z',
  });
});

app.put('/api/v1/users/me', (req, res) => {
  const { name, avatar } = req.body;
  res.json({
    id: '1',
    name: name || '小明',
    email: 'xiaoming@example.com',
    familyId: 'family_1',
    avatar: avatar || '',
    updatedAt: new Date().toISOString(),
  });
});

// NFC tag routes
app.get('/api/v1/nfc/:tagId', (req, res) => {
  const { tagId } = req.params;
  // 返回标签绑定的回忆 ID
  res.json({
    tagId,
    memoryId: '1',
    familyId: 'family_1',
  });
});

app.post('/api/v1/nfc/:tagId/bind', (req, res) => {
  const { tagId } = req.params;
  const { memoryId } = req.body;
  
  res.json({
    success: true,
    tagId,
    memoryId,
    boundAt: new Date().toISOString(),
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
  console.log(`API available at http://localhost:${port}/api/v1/`);
});
