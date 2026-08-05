import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { requireApiAuth } from "@/lib/api-auth";

// Sub-folders under public/images that callers may upload into, and the prefix
// used for files stored there. Anything else falls back to the root folder.
const ALLOWED_FOLDERS: Record<string, string> = {
  broadcasts: "broadcast",
};

export async function POST(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    const folderInput = String(formData.get("folder") || "").trim();
    const folder = Object.prototype.hasOwnProperty.call(ALLOWED_FOLDERS, folderInput)
      ? folderInput
      : "";
    const filePrefix = folder ? ALLOWED_FOLDERS[folder] : "staff";

    if (!file) {
      return NextResponse.json(
        { error: "ไม่พบไฟล์" },
        { status: 400 },
      );
    }

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WEBP)" },
        { status: 400 },
      );
    }

    // ตรวจสอบขนาดไฟล์ (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "ขนาดไฟล์ต้องไม่เกิน 5MB" },
        { status: 400 },
      );
    }

    // สร้าง folder ถ้ายังไม่มี
    // ใน production build (standalone), Next.js จะ serve public folder จาก project root
    // แต่ process.cwd() อาจชี้ไปที่ .next/standalone
    // ต้องหา project root ที่มี public folder จริงๆ
    let uploadDir: string;
    
    // ตรวจสอบว่าเราอยู่ใน production build หรือไม่
    const isProduction = process.env.NODE_ENV === 'production';
    const currentDir = process.cwd();
    
    if (isProduction) {
      // ใน production standalone mode, process.cwd() อาจชี้ไปที่ .next/standalone
      // แต่ Next.js serve public folder จาก project root
      // ต้องหา project root ที่มี public folder จริงๆ
      
      let projectRoot = currentDir;
      
      // ถ้า currentDir อยู่ใน .next/standalone, ต้องขึ้นไปหา project root
      if (currentDir.includes('.next')) {
        // หา project root โดยขึ้นไปจาก .next folder
        const parts = currentDir.split(/[/\\]/);
        const nextIndex = parts.findIndex(p => p === '.next');
        if (nextIndex > 0) {
          projectRoot = parts.slice(0, nextIndex).join('/');
        }
      }
      
      // ใช้ project root/public/images (Next.js serve จากที่นี่)
      uploadDir = join(projectRoot, 'public', 'images', folder);
    } else {
      // ใน development, ใช้ process.cwd() ปกติ
      uploadDir = join(process.cwd(), "public", "images", folder);
    }
    
    try {
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }
    } catch (dirError: any) {
      console.error("Error creating upload directory:", dirError);
      console.error("Upload directory path:", uploadDir);
      return NextResponse.json(
        { error: "ไม่สามารถสร้างโฟลเดอร์สำหรับอัพโหลดได้", details: dirError.message },
        { status: 500 },
      );
    }

    // สร้างชื่อไฟล์ใหม่ (timestamp + random)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const extension = file.name.split(".").pop();
    const filename = `${filePrefix}-${timestamp}-${random}.${extension}`;
    const filepath = join(uploadDir, filename);

    // แปลง File เป็น Buffer และบันทึก
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    try {
      await writeFile(filepath, buffer);
    } catch (writeError: any) {
      console.error("Error writing file:", writeError);
      return NextResponse.json(
        { error: "ไม่สามารถบันทึกไฟล์ได้", details: writeError.message },
        { status: 500 },
      );
    }

    // ส่งกลับ path ที่ relative ต่อ public folder
    // ใน production standalone mode, ใช้ API route เพื่อ serve ไฟล์
    const folderPath = folder ? `${folder}/` : "";
    const imageUrl = isProduction
      ? `/api/images/${folderPath}${filename}`  // Use API route in production
      : `/images/${folderPath}${filename}`;     // Use static file in development

    return NextResponse.json({ url: imageUrl }, { status: 200 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "อัปโหลดไฟล์ไม่สำเร็จ", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}


