import * as repo from "../repositories/contactTypeRepository";

export const getContactTypes = async () => {
  return await repo.getAllActiveTypes();
};

export const getAllContactTypes = async () => {
  return await repo.getAllTypes();
};

export const createContactType = async (data: repo.ContactTypeInput) => {
  return await repo.createType(data);
};

export const updateContactType = async (id: string, data: Partial<repo.ContactTypeInput>) => {
  return await repo.updateType(id, data);
};

export const deleteContactType = async (id: string) => {
  return await repo.deleteType(id);
};
