import { Schema, model, Document } from 'mongoose';

export type ContactUrgency = 'urgent' | 'normal' | 'low';
export type ContactCategory = 'bug' | 'feature' | 'feedback';

export interface IContactMessage extends Document {
  title: string;
  description: string;
  requestType: string;
  userId: Schema.Types.ObjectId;
  createdAt: Date;
  status: 'open' | 'closed';
  replies: IReply[];
  attachments?: IAttachment[];
  // Set by apps/agents/inquiry-agent's classify_node after triage - absent on
  // messages the agent hasn't looked at yet, or ones submitted before this field existed.
  urgency?: ContactUrgency;
  category?: ContactCategory;
}

export interface IAttachment {
  url: string;
  type: 'image' | 'video';
}

export interface IReply {
  senderId: Schema.Types.ObjectId;
  text: string;
  createdAt: Date;
  senderRole: 'user' | 'admin';
}

const contactMessageSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  requestType: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  urgency: { type: String, enum: ['urgent', 'normal', 'low'] },
  category: { type: String, enum: ['bug', 'feature', 'feedback'] },
  attachments: [{
    _id: false,
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], required: true }
  }],
  replies: [{
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    senderRole: { type: String, enum: ['user', 'admin'], required: true }
  }]
});

export const ContactMessage = model<IContactMessage>('ContactMessage', contactMessageSchema, 'contactmessages');