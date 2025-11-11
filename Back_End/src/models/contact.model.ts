import mongoose from 'mongoose';
import { ContactSchema } from '../schema/contact.schema.ts';
import { Contact } from '../interface/contact.interface.ts';

export const ContactModel = mongoose.model<Contact>('Contact', ContactSchema, 'contacts');
