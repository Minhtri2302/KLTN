import { UserModel } from '../models/user.model.ts';
import mongoose from 'mongoose';
import { CreateUserBody, UpdateUserBody, AddAddressBody, UpdateAddressBody } from '../interface/user.interface.ts';

export const listUsersService = async (search?: string) => {
  const filter: any = {};
  if (search && String(search).trim()) {
    const q = String(search).trim();
    filter.$or = [
      { name: { $regex: `.*${q}.*`, $options: 'i' } },
      { email: { $regex: `.*${q}.*`, $options: 'i' } },
      { phone: { $regex: `.*${q}.*`, $options: 'i' } },
    ];
  }

  const users = await UserModel.find(filter);
  return { users, total: users.length };
};

export const createUserService = async (userData: CreateUserBody) => {
  const { accountId, name, email, phone, avatar, gender, dateOfBirth, address } = userData;

  if (accountId && !mongoose.Types.ObjectId.isValid(accountId)) {
    throw new Error('Invalid accountId');
  }

  if (accountId) {
    const existing = await UserModel.findOne({ accountId });
    if (existing) {
      throw new Error('Profile for this account already exists');
    }
  }

  // Tạo user mới với tất cả các trường thông tin
  const created = await UserModel.create({ 
    accountId, 
    name, 
    email, 
    phone, 
    avatar,
    gender,
    dateOfBirth,
    address,
    addresses: [] // Mảng rỗng - user tự thêm địa chỉ sau
  });

  return created;
};

export const getUserByIdService = async (id: string) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid id');
  }

  const user = await UserModel.findById(id);
  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

export const updateUserService = async (id: string, updateData: UpdateUserBody) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid id');
  }

  const update = { ...updateData } as any;
  if (update._id) delete update._id;
  
  if (update.accountId && !mongoose.Types.ObjectId.isValid(update.accountId)) {
    throw new Error('Invalid accountId');
  }

  const updated = await UserModel.findByIdAndUpdate(id, update, { new: true });
  if (!updated) {
    throw new Error('User not found');
  }

  return updated;
};

export const deleteUserService = async (id: string) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid id');
  }

  const deleted = await UserModel.findByIdAndDelete(id);
  if (!deleted) {
    throw new Error('User not found');
  }

  return deleted;
};

// ========== ADDRESS MANAGEMENT ==========

export const addAddressService = async (userId: string, addressData: AddAddressBody) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid userId');
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Nếu địa chỉ mới là default, bỏ default của các địa chỉ khác
  if (addressData.isDefault && user.addresses) {
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
  }

  // Nếu đây là địa chỉ đầu tiên, tự động set làm default
  if (!user.addresses || user.addresses.length === 0) {
    addressData.isDefault = true;
  }

  user.addresses = user.addresses || [];
  user.addresses.push(addressData as any);
  await user.save();

  return user;
};

export const updateAddressService = async (
  userId: string, 
  addressId: string, 
  updateData: UpdateAddressBody
) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid userId');
  }
  if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
    throw new Error('Invalid addressId');
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const addressIndex = user.addresses?.findIndex(
    addr => addr._id?.toString() === addressId
  );

  if (addressIndex === undefined || addressIndex === -1) {
    throw new Error('Address not found');
  }

  // Nếu set địa chỉ này làm default, bỏ default của các địa chỉ khác
  if (updateData.isDefault && user.addresses) {
    user.addresses.forEach((addr, idx) => {
      addr.isDefault = idx === addressIndex ? true : false;
    });
  }

  // Update địa chỉ
  Object.assign(user.addresses[addressIndex], updateData);

  await user.save();
  return user;
};

export const deleteAddressService = async (userId: string, addressId: string) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid userId');
  }
  if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
    throw new Error('Invalid addressId');
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const addressIndex = user.addresses?.findIndex(
    addr => addr._id?.toString() === addressId
  );

  if (addressIndex === undefined || addressIndex === -1) {
    throw new Error('Address not found');
  }

  const wasDefault = user.addresses[addressIndex].isDefault;

  // Xóa địa chỉ
  user.addresses.splice(addressIndex, 1);

  // Nếu địa chỉ bị xóa là default và còn địa chỉ khác, set địa chỉ đầu tiên làm default
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  return user;
};

export const setDefaultAddressService = async (userId: string, addressId: string) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid userId');
  }
  if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
    throw new Error('Invalid addressId');
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const addressExists = user.addresses?.some(
    addr => addr._id?.toString() === addressId
  );

  if (!addressExists) {
    throw new Error('Address not found');
  }

  // Set tất cả địa chỉ thành không default, trừ địa chỉ được chọn
  if (user.addresses) {
    user.addresses.forEach(addr => {
      addr.isDefault = addr._id?.toString() === addressId;
    });
  }

  await user.save();
  return user;
};
