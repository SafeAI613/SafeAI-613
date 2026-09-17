import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// קריאה ציבורית - כל אחד (כולל אורחים) צריך לראות את רשימת הקטגוריות
// כדי לסנן/ליצור פוסטים
router.get('/', getCategories);

// ניהול הקטגויות מוגבל למנהלי מערכת בלבד
router.post('/', authenticateToken, requireAdmin, createCategory);
router.put('/:id', authenticateToken, requireAdmin, updateCategory);
router.delete('/:id', authenticateToken, requireAdmin, deleteCategory);

export default router;
