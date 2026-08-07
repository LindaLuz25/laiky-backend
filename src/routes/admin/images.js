const express = require("express");
const { randomUUID } = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const router = express.Router();
const s3 = new S3Client({});
const BUCKET_NAME = process.env.IMAGES_BUCKET;

// GET /admin/images/upload-url?fileName=foto.jpg&contentType=image/jpeg
router.get("/upload-url", async (req, res) => {
  const { fileName = `${randomUUID()}.jpg`, contentType = "application/octet-stream" } = req.query;
  const key = `products/${randomUUID()}-${fileName}`;
  const command = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  res.json({ uploadUrl, key, expiresIn: 300 });
});

module.exports = router;
