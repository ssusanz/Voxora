import express from "express";
import cors from "cors";
import memoriesRouter from "./routes/memories";
import uploadRouter from "./routes/upload";

const app = express();
/** 与 start_voxora_clean_dev.sh 的 BACKEND_PORT、client 中 API 端口一致 */
const port = Number(process.env.PORT) || 19091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/v1/memories', memoriesRouter);
app.use('/api/v1/upload', uploadRouter);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening at http://0.0.0.0:${port}/`);
});
