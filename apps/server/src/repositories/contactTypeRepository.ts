import { ContactRequestType } from "../models/ContactRequestType";

export const getAllActiveTypes = async () => {
  return await ContactRequestType.find({ isActive: true }).sort({ label: 1 });
};

export const getAllTypes = async () => {
  return await ContactRequestType.find().sort({ label: 1 });
};

export interface ContactTypeInput {
  label: string;
  value: string;
  isActive?: boolean;
}

export const createType = async (data: ContactTypeInput) => {
  return await ContactRequestType.create(data);
};

export const updateType = async (id: string, data: Partial<ContactTypeInput>) => {
  return await ContactRequestType.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const deleteType = async (id: string) => {
  return await ContactRequestType.findByIdAndDelete(id);
};