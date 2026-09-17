import { Types } from 'mongoose';
import { ContactMessage } from "../models/ContactMessage";

export const create = async (data: any) => {
  return await ContactMessage.create(data);
};


export const findByUserId = async (userId: string) => {
  const query: Record<string, unknown> = { userId: userId };
  return await ContactMessage.find(query).sort({ createdAt: -1 });
};

export interface ContactRequestFilters {
  status?: string;
  requestType?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

// Escapes regex metacharacters in free-text search input so it's treated as
// a literal substring match instead of being interpreted as a regex pattern.
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const findAllWithFilters = async (filters: ContactRequestFilters) => {
  const query: Record<string, any> = {};

  if (filters.status) query.status = filters.status;
  if (filters.requestType) query.requestType = filters.requestType;

  if (filters.search?.trim()) {
    const regex = new RegExp(escapeRegExp(filters.search.trim()), 'i');
    query.$or = [{ title: regex }, { description: regex }];
  }

  if (filters.fromDate || filters.toDate) {
    const createdAt: Record<string, Date> = {};
    if (filters.fromDate) createdAt.$gte = new Date(filters.fromDate);
    if (filters.toDate) {
      const to = new Date(filters.toDate);
      to.setHours(23, 59, 59, 999);
      createdAt.$lte = to;
    }
    query.createdAt = createdAt;
  }

  return await ContactMessage.find(query)
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });
};



export const updateStatus = async (id: string, userId: string, status: string, isAdmin = false) => {
  const objectId = new Types.ObjectId(id);
   const filter: Record<string, any> = isAdmin
    ? { _id: objectId }
    : { _id: objectId, userId: new Types.ObjectId(userId) };


  return await ContactMessage.findOneAndUpdate(
    filter,
    { status: status },
    { new: true }
  );
};

  export const addReplyToRequest = async (id: string, replyData: any) => {
  const objectId = new Types.ObjectId(id);
  return await ContactMessage.findByIdAndUpdate(
    objectId,
    { $push: { replies: replyData } },
    { new: true }
  );
};

export const deleteRequestById = async (id: string) => {
  const objectId = new Types.ObjectId(id);
  return await ContactMessage.findByIdAndDelete(objectId);
};
