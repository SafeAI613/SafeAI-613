import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { newsService } from "../newsService";
import { newsRepository } from "../../repositories/newsRepository";
import { deleteObject } from "../s3Service";
import { INews } from "../../models/news";

jest.mock("../../repositories/newsRepository", () => ({
  newsRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../s3Service", () => ({
  deleteObject: jest.fn(),
}));

// Without this, newsService's logger.info/error calls try to write to a real
// MongoDB connection that doesn't exist in the test environment, causing each
// test to hang for ~10s on a buffering-timeout error (see practicum-session-log.md).
jest.mock("../../logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe("newsService.createNews", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a news article successfully", async () => {
    const input = {
      title: "AI News",
      content: "OpenAI released a new model",
    };

    const createdNews = {
      _id: "1",
      title: "AI News",
      content: "OpenAI released a new model",
      source: "User",
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };




    const mockedRepository = jest.mocked(newsRepository);

    mockedRepository.create.mockResolvedValue(
      createdNews as unknown as INews
    );

    const result = await newsService.createNews(input);

    expect(mockedRepository.create).toHaveBeenCalledWith({
      ...input,
      tags: [],
    });

    expect(result).toEqual(createdNews);
  });
});
    it("should throw error if title is empty", async () => {
         await expect(
         newsService.createNews({ title: "", content: "abc" })
         ).rejects.toThrow("Title is required");
    });

    it("should throw error if content is empty", async () => {
  await expect(
    newsService.createNews({ title: "t", content: "" })
  ).rejects.toThrow("Content is required");
});

it("should return all news", async () => {
  const mockedRepository = jest.mocked(newsRepository);

  mockedRepository.findAll.mockResolvedValue([]);

  const result = await newsService.getAllNews(1, 10);

  expect(mockedRepository.findAll).toHaveBeenCalledWith(1, 10);
  expect(result).toEqual([]);
});

it("should throw error if news not found by id", async () => {
  const mockedRepository = jest.mocked(newsRepository);

  mockedRepository.findById.mockResolvedValue(null as any);

  await expect(
    newsService.getNewsById("123")
  ).rejects.toThrow("News not found");
});

it("should throw error when deleting non existing news", async () => {
  const mockedRepository = jest.mocked(newsRepository);

  mockedRepository.delete.mockResolvedValue(null as any);

  await expect(
    newsService.deleteNews("123")
  ).rejects.toThrow("News not found");
});

describe("news image URL handling", () => {
  // Matches the hostname newsService.isValidNewsImageUrl checks against
  // (same shape uploadController.ts builds for a real presigned upload) -
  // built from the same env vars so this test isn't tied to whatever
  // AWS_BUCKET_NAME/AWS_REGION happen to be set to in this environment.
  const VALID_BASE = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject creating news with an image URL outside the news upload path", async () => {
    await expect(
      newsService.createNews({
        title: "t",
        content: "c",
        imageUrl: "https://evil.example.com/not-news.png",
      })
    ).rejects.toThrow("Invalid image URL");

    expect(jest.mocked(newsRepository).create).not.toHaveBeenCalled();
  });

  it("should accept creating news with a valid uploads/news image URL", async () => {
    const mockedRepository = jest.mocked(newsRepository);
    mockedRepository.create.mockResolvedValue({ _id: "1" } as unknown as INews);

    await newsService.createNews({
      title: "t",
      content: "c",
      imageUrl: `${VALID_BASE}/uploads/news/abc.png`,
    });

    expect(mockedRepository.create).toHaveBeenCalled();
  });

  it("should delete the old S3 image when a news item's image is replaced", async () => {
    const mockedRepository = jest.mocked(newsRepository);
    mockedRepository.findById.mockResolvedValue({
      _id: "1",
      imageUrl: `${VALID_BASE}/uploads/news/old.png`,
    } as unknown as INews);
    mockedRepository.update.mockResolvedValue({ _id: "1" } as unknown as INews);

    await newsService.updateNews("1", {
      imageUrl: `${VALID_BASE}/uploads/news/new.png`,
    });

    expect(deleteObject).toHaveBeenCalledWith(`${VALID_BASE}/uploads/news/old.png`);
  });

  it("should not delete the image when a news update doesn't touch imageUrl", async () => {
    const mockedRepository = jest.mocked(newsRepository);
    mockedRepository.findById.mockResolvedValue({
      _id: "1",
      imageUrl: `${VALID_BASE}/uploads/news/old.png`,
    } as unknown as INews);
    mockedRepository.update.mockResolvedValue({ _id: "1" } as unknown as INews);

    await newsService.updateNews("1", { title: "new title" });

    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("should delete the image from S3 when a news item with an image is deleted", async () => {
    const mockedRepository = jest.mocked(newsRepository);
    mockedRepository.delete.mockResolvedValue({
      _id: "1",
      imageUrl: `${VALID_BASE}/uploads/news/old.png`,
    } as unknown as INews);

    await newsService.deleteNews("1");

    expect(deleteObject).toHaveBeenCalledWith(`${VALID_BASE}/uploads/news/old.png`);
  });
});