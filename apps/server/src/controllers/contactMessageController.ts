import { Response } from 'express';
import * as contactMessageService from '../services/contactMessageService';
import { ContactUrgency, ContactCategory } from '../models/ContactMessage';
import { User } from '../models/user';
import * as s3Service from '../services/s3Service';
import { sendContactReplyEmail } from '../utils/email';
import logger from '../logger';

// The bucket is private - the `url` saved on a ContactMessage's attachment is
// the raw S3 object URL with no signature, so it 403s if used directly as an
// <img>/<video> src. Sign each one into a temporary download URL right before
// the response goes out (data-URI fallback attachments pass through signAttachments
// unchanged - see s3Service.generatePresignedDownloadUrl's catch-all).
async function withSignedAttachments(doc: any) {
  const plain = typeof doc?.toObject === "function" ? doc.toObject() : doc;
  if (Array.isArray(plain?.attachments) && plain.attachments.length > 0) {
    const signedUrls = await s3Service.signAttachments(plain.attachments.map((a: any) => a.url));
    plain.attachments = plain.attachments.map((a: any, i: number) => ({ ...a, url: signedUrls[i] }));
  }
  return plain;
}

// פונקציה להחזרת כל הפניות של המשתמש המחובר
export const getMyRequests = async (req: any, res: Response) => {
  try {
    // השגת ה-ID של המשתמש מתוך האובייקט שנוצר ב-Middleware של האותנטיקציה
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "משתמש לא מזוהה" });
    }
    
    // קריאה לשירות שכתבנו
    const requests = await contactMessageService.getRequestsByUserId(userId);
    
    // החזרת הנתונים ללקוח
    res.status(200).json(requests);
  } catch (error) {
    // טיפול בשגיאה במידה והתהליך נכשל
    res.status(500).json({ message: "שגיאה בטעינת הפניות האישיות" });
  }
};

export const getRequestById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === "admin";

    const request = await contactMessageService.getRequestById(id);

    if (!request) {
      return res.status(404).json({ message: "פנייה לא נמצאה" });
    }

    if (!isAdmin && request.userId?.toString() !== userId) {
      return res.status(403).json({ message: "אין לך גישה לפנייה זו" });
    }

    res.status(200).json(await withSignedAttachments(request));
  } catch (error) {
    res.status(500).json({ message: "שגיאה בטעינת פרטי הפנייה" });
  }
};

export const closeRequestById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === "admin";

    if (!userId) {
      return res.status(401).json({ message: "משתמש לא מזוהה" });
    }

    const existingRequest = await contactMessageService.getRequestById(id);

    if (!existingRequest) {
      return res.status(404).json({ message: "פנייה לא נמצאה" });
    }

    if (!isAdmin && existingRequest.userId?.toString() !== userId) {
      return res.status(403).json({ message: "אין לך גישה לסגור פנייה זו" });
    }

    const request = await contactMessageService.closeRequestById(id, userId, isAdmin);

    if (!request) {
      return res.status(404).json({ message: "פנייה לא נמצאה" });
    }

    res.status(200).json({ success: true, message: "הפנייה נסגרה בהצלחה", request });
  } catch (error) {
    res.status(500).json({ message: "שגיאה בסגירת הפנייה" });
  }
};

export const deleteRequestById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const deletedRequest = await contactMessageService.deleteRequestById(id);

    if (!deletedRequest) {
      return res.status(404).json({ message: "פנייה לא נמצאה למחיקה" });
    }

    res.status(200).json({ success: true, message: "הפנייה נמחקה בהצלחה" });
  } catch (error) {
    res.status(500).json({ message: "שגיאה במחיקת הפנייה" });
  }
};

export const addReply = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user?.userId || req.user?.id;
   
    const senderRole = req.user?.role || 'user';
    const isAdmin = senderRole === "admin";

    if (!userId) return res.status(401).json({ message: "משתמש לא מזוהה" });

    const existingRequest = await contactMessageService.getRequestById(id);

    if (!existingRequest) return res.status(404).json({ message: "פנייה לא נמצאה" });

    if (!isAdmin && existingRequest.userId?.toString() !== userId) {
      return res.status(403).json({ message: "אין לך גישה להשיב לפנייה זו" });
    }

    const request = await contactMessageService.addReplyToRequest(id, userId, text, senderRole);

    if (!request) return res.status(404).json({ message: "פנייה לא נמצאה" });

    if (isAdmin) {
      // Best-effort: notify the request's owner that an admin (or the
      // inquiry-agent, sending on an admin's behalf after approval) replied.
      // Never fails the request itself - the reply is already saved above.
      try {
        const owner = await User.findById(request.userId).select("email name").lean();
        if (owner?.email) {
          await sendContactReplyEmail({
            userEmail: owner.email,
            userName: owner.name || owner.email,
            title: request.title,
            replyText: text,
          });
        }
      } catch (emailError) {
        logger.error("Failed to send contact reply notification email:", {
          error: emailError instanceof Error ? emailError.message : String(emailError),
          requestId: id,
        });
      }
    }

    res.status(200).json({ success: true, message: "התגובה נוספה בהצלחה", request });
  } catch (error) {
    res.status(500).json({ message: "שגיאה בהוספת התגובה" });
  }
};

// PATCH /contact/my-requests/:id/classification - admin (or the inquiry-agent
// via AGENT_SERVICE_TOKEN) sets the urgency/category the triage agent assigned.
export const updateClassification = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { urgency, category } = req.body;

    const VALID_URGENCY: ContactUrgency[] = ["urgent", "normal", "low"];
    const VALID_CATEGORY: ContactCategory[] = ["bug", "feature", "feedback"];

    if (urgency === undefined && category === undefined) {
      return res.status(400).json({ message: "יש לספק urgency ו/או category" });
    }
    if (urgency !== undefined && !VALID_URGENCY.includes(urgency)) {
      return res.status(400).json({ message: `urgency לא תקין - ערכים אפשריים: ${VALID_URGENCY.join(", ")}` });
    }
    if (category !== undefined && !VALID_CATEGORY.includes(category)) {
      return res.status(400).json({ message: `category לא תקין - ערכים אפשריים: ${VALID_CATEGORY.join(", ")}` });
    }

    const classification: { urgency?: ContactUrgency; category?: ContactCategory } = {};
    if (urgency !== undefined) classification.urgency = urgency;
    if (category !== undefined) classification.category = category;

    const request = await contactMessageService.updateClassification(id, classification);

    if (!request) return res.status(404).json({ message: "פנייה לא נמצאה" });

    res.status(200).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ message: "שגיאה בעדכון סיווג הפנייה" });
  }
};

export const getAllRequests = async (req: any, res: Response) => {
  try {
    const { status, requestType, search, fromDate, toDate } = req.query;

    const filters: contactMessageService.ContactRequestFilters = {};
    if (typeof status === "string") filters.status = status;
    if (typeof requestType === "string") filters.requestType = requestType;
    if (typeof search === "string") filters.search = search;
    if (typeof fromDate === "string") filters.fromDate = fromDate;
    if (typeof toDate === "string") filters.toDate = toDate;

    const allRequests = await contactMessageService.getAllRequests(filters);

    res.status(200).json(allRequests);
  } catch (error) {
    res.status(500).json({ message: "שגיאה בטעינת כל הפניות" });
  }
};