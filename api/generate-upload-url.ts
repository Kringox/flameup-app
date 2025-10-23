// This is a Vercel serverless function.
// It is now used to upload a file directly to Vercel Blob.
// Accessible at: /api/generate-upload-url

import { put } from '@vercel/blob';

export async function POST(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename || !request.body) {
    return new Response(
      JSON.stringify({ message: 'Missing filename or request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    // The Vercel Blob SDK reads the BLOB_READ_WRITE_TOKEN from the environment automatically.
    const blob = await put(filename, request.body, {
      access: 'public',
      // The `Content-Type` header from the client's request is automatically forwarded.
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
