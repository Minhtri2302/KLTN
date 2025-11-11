import mongoose from 'mongoose';

const AddressSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  street: { type: String, required: true, trim: true },
  ward: { type: String, trim: true },
  district: { type: String, trim: true },
  city: { type: String, trim: true },
  isDefault: { type: Boolean, default: false },
}, { _id: true, timestamps: true });

const UserSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', index: true, unique: true, sparse: true },
  name: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true, index: true },
  phone: { type: String, trim: true },
  avatar: { type: String, trim: true },
  gender: { type: String, trim: true },
  dateOfBirth: { type: Date },
  address: { type: String, trim: true },
  addresses: [AddressSchema], // Mảng địa chỉ mới
}, { timestamps: true });

export const UserModel = mongoose.model('User', UserSchema);
