require('dotenv').config();
const express = require('express');
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

app.post('/s3/multipart', async (req, res) => {
  const { key } = req.body;
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  };

  try {
    const createMultipartUpload = await s3.createMultipartUpload(params).promise();
    res.json(createMultipartUpload);
  } catch (error) {
    console.error('Error creating multipart upload:', error);
    res.status(500).send(error);
  }
});

app.get('/s3/multipart/:uploadId/:partNumber', async (req, res) => {
  const { uploadId, partNumber } = req.params;
  const { key } = req.query;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  };

  try {
    const uploadPart = await s3.getSignedUrlPromise('uploadPart', params);
    res.json({ url: uploadPart });
  } catch (error) {
    console.error('Error getting signed URL for part:', error);
    res.status(500).send(error);
  }
});


app.post('/s3/multipart/:uploadId/:partNumber', async (req, res) => {
  const { uploadId, partNumber } = req.params;
  const { key } = req.query;
  const { data } = req.body;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  };
  let uploadPart;

  try {
    uploadPart = await s3.getSignedUrlPromise('uploadPart', params);
    const uploadPartResponse = await fetch(uploadPart, {
      method: 'PUT',
      body: data,
    });
    const etag = uploadPartResponse.headers.get('ETag');
    res.json({ etag, partNumber });
  } catch (error) {
    console.error('Error uploading part:', error);
    res.status(500).send(error);
  }
});
    

app.post('/s3/multipart/:uploadId/complete', async (req, res) => {
  const { uploadId } = req.params;
  const { key, parts } = req.body;

  if (!key) {
    return res.status(400).send({ error: 'Key is required' });
  }

  const formattedParts = parts.map(part => ({
    ETag: part.etag,
    PartNumber: part.partNumber,
  }));

  const completeMultipartUploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: formattedParts,
    },
  };

  try {
    const data = await s3.completeMultipartUpload(completeMultipartUploadParams).promise();
    res.json(data);
  } catch (error) {
    console.error('Error completing multipart upload:', error);
    res.status(500).send(error);
  }
});

const port = 3020;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
