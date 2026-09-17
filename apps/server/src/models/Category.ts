import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  createdAt: Date;
}

const CategorySchema: Schema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ICategory>('Category', CategorySchema);
