import { Request, Response } from "express";
import * as service from "../services/contactTypeService";

export const getContactTypes = async (req: Request, res: Response) => {
  try {
    const types = await service.getContactTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: "שגיאה בשליפת סוגי פניות" });
  }
};

// GET /contact-types/all - admin only, includes inactive types so they can be re-enabled
export const getAllContactTypesAdmin = async (req: Request, res: Response) => {
  try {
    const types = await service.getAllContactTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: "שגיאה בשליפת כל סוגי הפניות" });
  }
};

export const createContactType = async (req: Request, res: Response) => {
  try {
    const { label, value, isActive } = req.body;

    if (!label?.trim() || !value?.trim()) {
      return res.status(400).json({ success: false, message: "יש למלא שם תצוגה וערך עבור סוג הפנייה" });
    }

    const type = await service.createContactType({
      label: label.trim(),
      value: value.trim(),
      ...(isActive !== undefined ? { isActive: !!isActive } : {}),
    });

    res.status(201).json({ success: true, data: type });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "כבר קיים סוג פנייה עם אותו ערך" });
    }
    res.status(500).json({ success: false, message: "שגיאה ביצירת סוג פנייה" });
  }
};

export const updateContactType = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { label, value, isActive } = req.body;

    const update: Partial<{ label: string; value: string; isActive: boolean }> = {};
    if (label !== undefined) {
      if (!label.trim()) return res.status(400).json({ success: false, message: "שם התצוגה לא יכול להיות ריק" });
      update.label = label.trim();
    }
    if (value !== undefined) {
      if (!value.trim()) return res.status(400).json({ success: false, message: "הערך לא יכול להיות ריק" });
      update.value = value.trim();
    }
    if (isActive !== undefined) update.isActive = !!isActive;

    const type = await service.updateContactType(id, update);

    if (!type) {
      return res.status(404).json({ success: false, message: "סוג הפנייה לא נמצא" });
    }

    res.json({ success: true, data: type });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "כבר קיים סוג פנייה עם אותו ערך" });
    }
    res.status(500).json({ success: false, message: "שגיאה בעדכון סוג פנייה" });
  }
};

export const deleteContactType = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await service.deleteContactType(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "סוג הפנייה לא נמצא" });
    }

    res.json({ success: true, message: "סוג הפנייה נמחק בהצלחה" });
  } catch (error) {
    res.status(500).json({ success: false, message: "שגיאה במחיקת סוג פנייה" });
  }
};
