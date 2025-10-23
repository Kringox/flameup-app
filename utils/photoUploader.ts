/**
 * Uploads files to Vercel Blob storage via our backend API.
 * @param files - An array of File objects to upload.
 * @returns A promise that resolves to an array of public URLs for the uploaded files.
 */
export const uploadPhotos = async (files: File[]): Promise<string[]> => {
  const uploadedUrls: string[] = [];
  for (const file of files) {
    try {
      // POST the file to our serverless function. Filename is in the query.
      const response = await fetch(`/api/generate-upload-url?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed for ${file.name}: ${errorText}`);
      }
      
      const newBlob = await response.json();
      
      // The response from Vercel Blob's `put` function includes the public URL.
      if (!newBlob.url) {
        throw new Error(`Upload succeeded but no URL was returned for ${file.name}`);
      }
      uploadedUrls.push(newBlob.url);

    } catch (error) {
      console.error('Error uploading file:', file.name, error);
      throw error; // Re-throw to be handled by the UI
    }
  }
  return uploadedUrls;
};
