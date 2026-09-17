import { INews } from "../models/news";
import { newsRepository } from "../repositories/newsRepository";
import logger from "../logger";
import { getPresignedViewUrl } from "../utils/s3Client";
import { deleteObject } from "./s3Service";

// אותה תיקיית יעד ב-S3 שהוגדרה עבור context "newsImage" ב-uploadController.ts -
// כל imageUrl שנשמר על כתבת חדשות חייב להצביע לשם, אחרת מדובר בקישור שרירותי
// שלא עבר דרך זרימת ההעלאה המוגנת (ולידציית type/size) של השרת.
const NEWS_IMAGE_PATH_PREFIX = "uploads/news/";

function isValidNewsImageUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const bucket = process.env.AWS_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  if (bucket && region && parsed.hostname !== `${bucket}.s3.${region}.amazonaws.com`) {
    return false;
  }

  return parsed.pathname.replace(/^\//, "").startsWith(NEWS_IMAGE_PATH_PREFIX);
}

// מוחקת תמונת חדשות קודמת מ-S3 - best-effort, לא אמורה אף פעם להפיל את
// פעולת ה-DB שכבר הצליחה (כמו כל שאר פעולות ה-S3 ה"צדדיות" בקוד הזה).
async function deleteNewsImageBestEffort(imageUrl: string, context: { id?: string }) {
  try {
    await deleteObject(imageUrl);
  } catch (error: any) {
    logger.warn("Failed to delete news image from S3", { id: context.id, error: error.message });
  }
}

// ה-bucket שבו נשמרות תמונות החדשות חוסם קריאה ציבורית ישירה, לכן בכל
// הגשה מוחלף ה-URL הקבוע בקישור צפייה חתום וזמני
async function withResolvedImage(item: INews): Promise<INews> {
  if (!item.imageUrl) return item;

  try {
    item.imageUrl = await getPresignedViewUrl(item.imageUrl);
  } catch (error: any) {
    logger.warn("Failed to sign news image URL", {
      id: item._id,
      error: error.message,
    });
  }

  return item;
}

export const newsService = {
  // Get all news
  async getAllNews(page = 1, limit = 10): Promise<INews[]> {
    logger.info("Fetching all news");
    const news = await newsRepository.findAll(page, limit);
    return Promise.all(news.map(withResolvedImage));
  },

  // Get news by ID
  async getNewsById(id: string): Promise<INews> {
    logger.info("Fetching news by ID", { id });
    const news = await newsRepository.findById(id);

    if (!news) {
      throw new Error("News not found");
    }

    return withResolvedImage(news);
  },

  // Get every distinct tag used across all news, sorted for display
  async getAllTags(): Promise<string[]> {
    logger.info("Fetching all news tags");
    const tags = await newsRepository.findAllTags();
    return tags.filter(Boolean).sort((a, b) => a.localeCompare(b, "he"));
  },

  // Create news
  async createNews(data: Partial<INews>): Promise<INews> {
    logger.info("Creating news", { data });
    if (!data.title?.trim()) {
      throw new Error("Title is required");
    }

    if (!data.content?.trim()) {
      throw new Error("Content is required");
    }

    if (data.imageUrl && !isValidNewsImageUrl(data.imageUrl)) {
      throw new Error("Invalid image URL");
    }

    const createData = {
      ...data,
      tags: data.tags || [],
    };

    logger.info("News created successfully", { createData });
    return await newsRepository.create(createData);
  },

  // Update news
  async updateNews(id: string, data: Partial<INews>): Promise<INews> {
    logger.info("Updating news", { id, data });

    if (data.imageUrl && !isValidNewsImageUrl(data.imageUrl)) {
      throw new Error("Invalid image URL");
    }

    // Read the pre-update imageUrl so a replaced/removed image can be
    // cleaned up from S3 below - findByIdAndUpdate only ever returns the
    // post-update document.
    const existing = await newsRepository.findById(id);
    const updatedNews = await newsRepository.update(id, data);

    if (!updatedNews) {
      throw new Error("News not found");
    }

    if (existing?.imageUrl && data.imageUrl !== undefined && existing.imageUrl !== data.imageUrl) {
      await deleteNewsImageBestEffort(existing.imageUrl, { id });
    }

    logger.info("News updated successfully", { id });
    return updatedNews;
  },

  // Delete news
  async deleteNews(id: string): Promise<void> {
    logger.info("Deleting news", { id });
    const deletedNews = await newsRepository.delete(id);

    if (!deletedNews) {
      throw new Error("News not found");
    }

    if (deletedNews.imageUrl) {
      await deleteNewsImageBestEffort(deletedNews.imageUrl, { id });
    }

    logger.info("News deleted successfully", { id });
  },


};