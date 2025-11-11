import { AccountModel } from "../models/account.model.ts";
import { UserModel } from "../models/user.model.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { 
  RegisterBody, 
  LoginBody, 
  UpdateAccountBody, 
  ChangePasswordBody 
} from "../interface/account.interface.ts";
import { createUserService } from "./user.service.ts";

class AccountService {
  async register(data: RegisterBody): Promise<{ id: any; username: string | undefined; role: string | undefined; profile: any }> {
    try {
      const { username, password, role, name, email, phone } = data; // Bỏ address
      
      if (!username || !password) {
        throw { status: 400, message: "Vui lòng nhập tên đăng nhập và mật khẩu" };
      }

      const existing = await AccountModel.findOne({ username });
      if (existing) {
        throw { status: 409, message: "Tên đăng nhập đã tồn tại" };
      }

      const hash = await bcrypt.hash(password, 10);
      const acc = await AccountModel.create({ username, password: hash, role: role || 'user' });
      
      // create linked user profile using createUserService - KHÔNG có address
      let createdProfile = null;
      try {
        createdProfile = await createUserService({
          accountId: acc._id,
          name: name || undefined,
          email: email || undefined,
          phone: phone || undefined,
          avatar: undefined
          // Không có address - user sẽ thêm địa chỉ sau trong profile
        });
      } catch (err) {
        console.warn('create linked user profile failed', err);
      }

      return { id: acc._id, username: acc.username, role: acc.role, profile: createdProfile };
    } catch (error) {
      throw error;
    }
  }

  async getAccounts(): Promise<any[]> {
    try {
      const accounts = await AccountModel.find().select('-password');
      return accounts;
    } catch (error) {
      throw error;
    }
  }

  async getAccountById(id: string): Promise<{ id: any; username: string | undefined; role: string | undefined; profile: any }> {
    try {
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw { status: 400, message: 'ID không hợp lệ' };
      }
      
      const acc = await AccountModel.findById(id).select('-password');
      if (!acc) {
        throw { status: 404, message: 'Không tìm thấy tài khoản' };
      }
      
      let profile = null;
      try {
        profile = await UserModel.findOne({ accountId: acc._id }).lean();
      } catch (err) {
        profile = null;
      }
      
      return { id: acc._id, username: acc.username, role: acc.role, profile };
    } catch (error) {
      throw error;
    }
  }

  async updateAccount(id: string, body: UpdateAccountBody): Promise<any> {
    try {
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw { status: 400, message: 'ID không hợp lệ' };
      }
      
      const update: Partial<UpdateAccountBody> & { _id?: string } = { ...(body || {}) };
      if (update.password !== undefined) {
        if (typeof update.password !== 'string' || update.password.length === 0) {
          throw { status: 400, message: 'Mật khẩu không hợp lệ' };
        }
        update.password = await bcrypt.hash(update.password, 10);
      }
      if (update._id) delete update._id;
      
      const updated = await AccountModel.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select('-password');
      if (!updated) {
        throw { status: 404, message: 'Không tìm thấy tài khoản' };
      }
      
      return updated;
    } catch (error) {
      throw error;
    }
  }

  async deleteAccount(id: string): Promise<{ message: string; id: any }> {
    try {
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw { status: 400, message: 'ID không hợp lệ' };
      }
      
      const deleted = await AccountModel.findByIdAndDelete(id);
      if (!deleted) {
        throw { status: 404, message: 'Không tìm thấy tài khoản' };
      }
      
      return { message: 'Xóa tài khoản thành công', id: deleted._id };
    } catch (error) {
      throw error;
    }
  }

  async login(data: LoginBody): Promise<{ token: string; user: { id: any; username: string | undefined; role: string | undefined; profile: any } }> {
    try {
      const { username, password } = data;
      
      if (!username || !password) {
        throw { status: 400, message: "Vui lòng nhập tên đăng nhập và mật khẩu" };
      }

      const acc = await AccountModel.findOne({ username });
      if (!acc) {
        throw { status: 401, message: 'Tên đăng nhập hoặc mật khẩu không đúng' };
      }

      const match = await bcrypt.compare(password, acc.password);
      if (!match) {
        throw { status: 401, message: 'Tên đăng nhập hoặc mật khẩu không đúng' };
      }

      const payload = { id: acc._id, username: acc.username, role: acc.role };
      const secret = process.env.JWT_SECRET || 'changeme';
      const token = jwt.sign(payload, secret, { expiresIn: '7d' });
      
      let profile = null;
      try {
        profile = await UserModel.findOne({ accountId: acc._id }).lean();
      } catch (err) { 
        profile = null; 
      }

      return { token, user: { id: acc._id, username: acc.username, role: acc.role, profile } };
    } catch (error) {
      throw error;
    }
  }

  async changePassword(id: string, data: ChangePasswordBody): Promise<any> {
    try {
      const { oldPassword, newPassword } = data;
      
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw { status: 400, message: 'ID không hợp lệ' };
      }
      if (!oldPassword || !newPassword) {
        throw { status: 400, message: 'Thiếu thông tin mật khẩu' };
      }
      
      const acc = await AccountModel.findById(id);
      if (!acc) {
        throw { status: 404, message: 'Tài khoản không tồn tại' };
      }
      
      const match = await bcrypt.compare(oldPassword, acc.password);
      if (!match) {
        throw { status: 401, message: 'Mật khẩu hiện tại không đúng' };
      }
      
      acc.password = await bcrypt.hash(newPassword, 10);
      await acc.save();
      
      const { password, ...rest } = acc.toObject();
      return rest;
    } catch (error) {
      throw error;
    }
  }
}

export const accountService = new AccountService();
