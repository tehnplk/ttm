import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Serve images from project root/public/images in production
// This ensures uploaded images are accessible even in standalone mode
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const filename = path.join('/');
    
    // Security: prevent path traversal
    if (filename.includes('..') || filename.startsWith('/')) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 400 }
      );
    }
    
    // Find project root
    const isProduction = process.env.NODE_ENV === 'production';
    const currentDir = process.cwd();
    
    let projectRoot = currentDir;
    if (isProduction && currentDir.includes('.next')) {
      // In standalone mode, find project root
      const parts = currentDir.split(/[/\\]/);
      const nextIndex = parts.findIndex(p => p === '.next');
      if (nextIndex > 0) {
        projectRoot = parts.slice(0, nextIndex).join('/');
      }
    }
    
    // Build file path
    const filePath = join(projectRoot, 'public', 'images', filename);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }
    
    // Read file
    const fileBuffer = await readFile(filePath);
    
    // Determine content type
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType = 
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      ext === 'png' ? 'image/png' :
      ext === 'gif' ? 'image/gif' :
      ext === 'webp' ? 'image/webp' :
      'application/octet-stream';
    
    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error("Error serving image:", error);
    return NextResponse.json(
      { error: "Failed to serve image", details: error.message },
      { status: 500 }
    );
  }
}

