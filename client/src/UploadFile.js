import React, { useState } from 'react';

function UploadFile() {
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      return alert('Please select a file');
    }

    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const fileName = `${Date.now()}-${file.name}`;

    // Initiate multipart upload
    const createUploadResponse = await fetch('http://localhost:3020/s3/multipart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: fileName }),
    });
    const { UploadId } = await createUploadResponse.json();

    const uploadParts = [];

    for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
      const start = (partNumber - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const blob = file.slice(start, end);

      // Get signed URL for each part
      // const getPartUrlResponse = await fetch(`http://localhost:3020/s3/multipart/${UploadId}/${partNumber}?key=${fileName}`);
      // const { url } = await getPartUrlResponse.json();

      // // Upload part
      // const uploadPartResponse = await fetch(url, {
      //   method: 'PUT',
      //   body: blob,
      // });
      // const etag = uploadPartResponse.headers.get('ETag');

      // uploadParts.push({ etag, partNumber });


      const uploadPartResponse = await fetch(`http://localhost:3020/s3/multipart/${UploadId}/${partNumber}?key=${fileName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: blob,
      });

      console.log(uploadPartResponse);
      const resData = uploadPartResponse.json();
      console.log(resData);
      // const etag = uploadPartResponse.headers.get('ETag');
      uploadParts.push(resData);
    }

    // Complete multipart upload
    await fetch(`http://localhost:3020/s3/multipart/${UploadId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: fileName, parts: uploadParts }),
    });

    alert('Upload complete!');
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
}

export default UploadFile;
