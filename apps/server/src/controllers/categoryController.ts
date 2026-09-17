import { Request, Response } from 'express';
import Category from '../models/Category';
import logger from '../logger';

// קטגוריות ברירת מחדל - זהות לרשימה שהייתה קבועה בקוד ה-Frontend לפני
// שהמעבר לניהול קטגויות דרך מסך האדמין. נטענות פעם אחת באתחול השרת, רק אם
// אוסף הקטגוריות ריק, כדי שהתנהגות הפורום הקיימת לא תישבר עם השדרוג.
const DEFAULT_CATEGORY_NAMES = ['כללי', 'פיתוח', 'AI'];

export async function ensureDefaultCategories() {
  const existingCount = await Category.countDocuments();
  if (existingCount > 0) return;

  await Category.insertMany(
    DEFAULT_CATEGORY_NAMES.map((name) => ({ name })),
    { ordered: false }
  );
}

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json(categories);
  } catch (error: any) {
    logger.error('Failed to fetch categories', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'שגיאה בהבאת הקטגוריות' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'שם הקטגוריה הוא שדה חובה' });
    }

    const category = await Category.create({ name });
    res.status(201).json(category);
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'קטגוריה בשם זה כבר קיימת' });
    }
    logger.error('Failed to create category', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'שגיאה ביצירת הקטגוריה' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'שם הקטגוריה הוא שדה חובה' });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'הקטגוריה לא נמצאה' });
    }

    res.status(200).json(category);
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'קטגוריה בשם זה כבר קיימת' });
    }
    logger.error('Failed to update category', { error: error.message, stack: error.stack, categoryId: req.params.id });
    res.status(500).json({ message: 'שגיאה בעדכון הקטגוריה' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'הקטגוריה לא נמצאה' });
    }

    res.status(200).json({ message: 'הקטגוריה נמחקה בהצלחה' });
  } catch (error: any) {
    logger.error('Failed to delete category', { error: error.message, stack: error.stack, categoryId: req.params.id });
    res.status(500).json({ message: 'שגיאה במחיקת הקטגוריה' });
  }
};
