import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.post('/', upload.single('file'), uploadController.uploadFile);

export default router;
