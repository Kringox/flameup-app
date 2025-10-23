// This is a Vercel serverless function.
// It is now used to upload a file directly to Vercel Blob.
// Accessible at: /api/generate-upload-url

import { put } from '@vercel/blob';

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ message: 'No file found in form data.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    
    const blob = await put(file.name, file, {
      access: 'public',
    });

    // Return the blob object, which includes the public URL
    return new Response(JSON.stringify(blob), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error uploading to Vercel Blob:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: "Failed to upload file.", details: errorMessage }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}