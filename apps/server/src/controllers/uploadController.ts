import { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { v4 as uuidv4 } from "uuid";
import logger from "../logger";
import { getOrganizationIdForLog } from "../utils/forumLogContext";
import { s3 } from "../utils/s3Client";

// הגדרת המבנה הצפוי של גוף הבקשה (Interface)
interface UploadRequestBody {
  fileName: string;
  fileType: string;
  fileSize?: number;
  context?: string;
}

type FileCategory = "video" | "image" | "document";

const VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "webm", "wmv", "flv", "m4v", "3gp"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];

/**
 * מסווגת קובץ לפי הסיומת שלו ולפי ה-MIME type שהדפדפן דיווח. שני המקורות
 * לא אמינים לחלוטין (אפשר "לשקר" בהם בקלות ע"י שינוי שם קובץ) - זו הגנה
 * סבירה נגד טעות/שימוש בתום לב, לא הגנה מוחלטת נגד מי שממש מנסה לעקוף.
 */
function getFileCategory(fileName: string, fileType: string): FileCategory {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  if (fileType.startsWith("video/") || VIDEO_EXTENSIONS.includes(extension)) {
    return "video";
  }
  if (fileType.startsWith("image/") || IMAGE_EXTENSIONS.includes(extension)) {
    return "image";
  }
  return "document";
}

function getMaxSizeBytesForCategory(category: FileCategory): number {
  const MB = 1024 * 1024;
  const GB = 1024 * MB;

  if (category === "image") {
    return (Number(process.env.MAX_UPLOAD_SIZE_IMAGE_MB) || 20) * MB;
  }
  if (category === "video") {
    return (Number(process.env.MAX_UPLOAD_SIZE_VIDEO_GB) || 2.5) * GB;
  }
  return (Number(process.env.MAX_UPLOAD_SIZE_DOCUMENT_MB) || 50) * MB;
}

function formatMaxSizeLabel(maxSizeBytes: number, category: FileCategory): string {
  return category === "video"
    ? `${(maxSizeBytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
    : `${Math.round(maxSizeBytes / (1024 * 1024))}MB`;
}

// הגדרות ייעודיות לפי הקשר העלאה - תיקיית יעד ב-S3 וכללי ולידציה.
// שני סוגי הקשר: הקשרים "סטטיים" (allowedTypes/maxSizeBytes קבועים - קורות
// חיים, תמונת חדשות) שממשיכים על PUT חתום כמו קודם, והקשרי הפורום
// (categorySizeLimits) שבהם הגבול תלוי בסוג הקובץ (וידאו/תמונה/מסמך) ונאכף
// ע"י S3 עצמו דרך POST חתום עם content-length-range.
interface UploadContextConfig {
  prefix: string;
  allowedTypes?: string[];
  maxSizeBytes?: number;
  categorySizeLimits?: boolean;
  videoAllowed?: boolean;
}

const UPLOAD_CONTEXTS: Record<string, UploadContextConfig> = {
  tenderResume: {
    prefix: "uploads/tenders",
    allowedTypes: ["application/pdf"],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  newsImage: {
    prefix: "uploads/news",
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  post: {
    prefix: "uploads/forum",
    categorySizeLimits: true,
    videoAllowed: true,
  },
  comment: {
    prefix: "uploads/forum",
    categorySizeLimits: true,
    videoAllowed: false,
  },
};

// הפונקציה המרכזית שמייצרת את הקישור הזמני
export const getPresignedUrl = async (
  req: Request<Record<string, never>, Record<string, never>, UploadRequestBody>,
  res: Response
): Promise<Response | void> => {
  try {
    const { fileName, fileType, fileSize, context } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: "שם וסוג הקובץ נדרשים" });
    }

    if (context !== undefined && !UPLOAD_CONTEXTS[context]) {
      return res.status(400).json({ error: "הקשר העלאה לא מוכר" });
    }

    const contextConfig = context ? UPLOAD_CONTEXTS[context] : undefined;
    const fileExtension = fileName.split(".").pop();
    const uniqueKey = `${contextConfig?.prefix || "uploads"}/${uuidv4()}.${fileExtension}`;
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueKey}`;

    // הקשרי פורום (post/comment): גבול גודל תלוי-קטגוריה, ואכיפה אמיתית
    // ע"י S3 עצמו דרך POST חתום עם content-length-range - כדי שהגבול ייאכף
    // גם אם מישהו עוקף את הבדיקות בצד הלקוח/שרת ומעלה ישירות מול הקישור.
    if (contextConfig?.categorySizeLimits) {
      if (typeof fileSize !== "number" || !Number.isFinite(fileSize) || fileSize <= 0) {
        return res.status(400).json({ error: "גודל הקובץ נדרש" });
      }

      const category = getFileCategory(fileName, fileType);

      if (category === "video" && !contextConfig.videoAllowed) {
        return res.status(400).json({ error: "העלאת קבצי וידאו אינה נתמכת בתגובות" });
      }

      const maxSizeBytes = getMaxSizeBytesForCategory(category);
      if (fileSize > maxSizeBytes) {
        return res.status(400).json({
          error: `הקובץ חורג מהגודל המרבי המותר (${formatMaxSizeLabel(maxSizeBytes, category)}) עבור סוג קובץ זה`,
        });
      }

      const { url, fields } = await createPresignedPost(s3, {
        Bucket: process.env.AWS_BUCKET_NAME || "",
        Key: uniqueKey,
        Conditions: [["content-length-range", 0, maxSizeBytes]],
        Fields: {
          "Content-Type": fileType,
        },
        Expires: 300, // בתוקף ל-5 דקות
      });

      return res.json({ url, fields, fileUrl });
    }

    // שאר ההקשרים (קורות חיים, תמונת חדשות) וללא הקשר כלל - ממשיכים כמו
    // קודם על PUT חתום יחיד.
    if (contextConfig) {
      if (!contextConfig.allowedTypes!.includes(fileType)) {
        return res.status(400).json({ error: "סוג הקובץ אינו נתמך" });
      }
      if (typeof fileSize === "number" && fileSize > contextConfig.maxSizeBytes!) {
        return res.status(400).json({ error: "הקובץ חורג מהגודל המותר" });
      }
    }

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: uniqueKey,
      ContentType: fileType,
    });

    // יצירת הקישור החתום (בתוקף ל-5 דקות / 300 שניות)
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return res.json({ uploadUrl, fileUrl });

  } catch (error: any) {
    logger.error("Failed to generate presigned upload URL", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: await getOrganizationIdForLog((req as any).user?.userId),
      requestId: (req as any).requestId,
      fileName: req.body.fileName,
      fileType: req.body.fileType,
    });
    return res.status(500).json({ error: "נכשלה הפקת קישור מאובטח" });
  }
};
