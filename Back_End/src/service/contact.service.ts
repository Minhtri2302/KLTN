import { ContactModel } from '../models/contact.model.ts';
import mongoose from 'mongoose';
import { Contact, CreateContactBody, UpdateContactBody } from '../interface/contact.interface.ts';

export class ContactService {
  async createContact(data: CreateContactBody): Promise<Contact> {
    const { name, email, message } = data;
    if (!name || !email || !message) {
      throw { status: 400, message: 'Missing fields' };
    }
    const doc = await ContactModel.create({ name, email, message });
    return doc;
  }

  async getContacts(): Promise<Contact[]> {
    const list = await ContactModel.find().sort({ createdAt: -1 });
    return list;
  }

  async getContactById(id: string): Promise<Contact> {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw { status: 400, message: 'Invalid id' };
    }
    const doc = await ContactModel.findById(id);
    if (!doc) {
      throw { status: 404, message: 'Not found' };
    }
    return doc;
  }

  async updateContact(id: string, data: UpdateContactBody): Promise<Contact> {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw { status: 400, message: 'Invalid id' };
    }
    const updated = await ContactModel.findByIdAndUpdate(id, data || {}, { new: true });
    if (!updated) {
      throw { status: 404, message: 'Not found' };
    }
    return updated;
  }

  async deleteContact(id: string): Promise<{ message: string; id: any }> {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw { status: 400, message: 'Invalid id' };
    }
    const deleted = await ContactModel.findByIdAndDelete(id);
    if (!deleted) {
      throw { status: 404, message: 'Not found' };
    }
    return { message: 'Deleted', id: deleted._id };
  }
}

export const contactService = new ContactService();
