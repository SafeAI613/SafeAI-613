import { Router } from 'express';
import { getPosts, getPostById, createPost, incrementView, searchSimilarPosts,searchStrictSimilarPosts, searchPosts, createComment, deleteCommentByAdmin, moderatePost, ratePost, generateAiAssistance } from '../controllers/postController';
import { authenticateToken, requireAdmin, requireForumPermission } from '../middleware/auth';
const router = Router();

// הערה: אין יותר צורך ב-multer/diskStorage כאן.
// קבצים מצורפים לתגובות עולים ישירות ל-S3 מה-Frontend (בדיוק כמו בפוסטים),
// והשרת מקבל רק את ה-fileUrl הסופי בגוף הבקשה (JSON), לא קובץ בפועל.

router.get('/', getPosts);
router.get('/search', searchPosts);
router.get('/search-similar', searchSimilarPosts);
router.get('/search-strict-similar', searchStrictSimilarPosts);
router.post('/ai-assist', authenticateToken, generateAiAssistance);
router.post('/', authenticateToken, requireForumPermission('canCreatePosts'), createPost);
// זהות המדרג נלקחת מהטוקן המאומת (req.user) ולא מגוף הבקשה
router.post('/:id/rate', authenticateToken, ratePost); // לדירוג פוסט
router.get('/:id', getPostById);
router.post('/:id/view', incrementView);

// כעת מגיע JSON רגיל עם fileUrl (הקובץ עצמו עלה כבר ישירות ל-S3 מה-Frontend)
router.post('/:id/comment', authenticateToken, requireForumPermission('canComment'), createComment);
// פעולות ניהול - מנהלי מערכת בלבד. ההרשאה נבדקת מול ה-JWT, לא מול userId שנשלח בגוף הבקשה
router.delete('/comment/:commentId', authenticateToken, requireAdmin, deleteCommentByAdmin); // למחיקת תגובה
router.patch('/:id/moderation', authenticateToken, requireAdmin, moderatePost); // לחסימה/נעילה/ביטול חסימה של פוסט

export default router;