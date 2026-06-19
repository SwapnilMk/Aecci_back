import multer from 'multer';
import multerS3 from 'multer-s3';
import { s3Client } from '../config/s3.config';
import { config } from '../config/config';
import path from 'path';

export const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: config.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, 'aecciglobal/' + Date.now().toString() + '-' + file.originalname);
    },
  }),
});
