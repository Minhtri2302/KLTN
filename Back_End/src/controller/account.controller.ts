import { FastifyRequest, FastifyReply } from "fastify";
import { 
  RegisterBody, 
  LoginBody, 
  UpdateAccountBody, 
  ChangePasswordBody, 
  AccountByIdParams 
} from "../interface/account.interface.ts";
import { accountService } from "../service/account.service.ts";

class AccountController {
  async register(req: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) {
    try {
      const account = await accountService.register(req.body);
      return reply.status(201).send({
        success: true,
        message: 'Đăng ký tài khoản thành công',
        data: account
      });
    } catch (error: any) {
      console.error('register error:', error);
      const status = error.status || 500;
      const message = error.message || 'Lỗi máy chủ';
      return reply.status(status).send({
        success: false,
        message
      });
    }
  }

  async getAccounts(req: FastifyRequest, reply: FastifyReply) {
    try {
      const accounts = await accountService.getAccounts();
      return reply.status(200).send({
        success: true,
        data: accounts,
        total: accounts.length
      });
    } catch (error: any) {
      console.error('getAccounts error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Lỗi máy chủ'
      });
    }
  }

  async getAccountById(req: FastifyRequest<{ Params: AccountByIdParams }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const account = await accountService.getAccountById(id);
      return reply.status(200).send({
        success: true,
        data: account
      });
    } catch (error: any) {
      console.error('getAccountById error:', error);
      const status = error.status || 500;
      const message = error.message || 'Lỗi máy chủ';
      return reply.status(status).send({
        success: false,
        message
      });
    }
  }

  async updateAccount(req: FastifyRequest<{ Params: AccountByIdParams; Body: UpdateAccountBody }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const account = await accountService.updateAccount(id, req.body);
      return reply.status(200).send({
        success: true,
        message: 'Cập nhật tài khoản thành công',
        data: account
      });
    } catch (error: any) {
      console.error('updateAccount error:', error);
      const status = error.status || 500;
      let message = error.message || 'Lỗi máy chủ';
      
      if (error.code === 11000) {
        message = 'Dữ liệu trùng lặp';
      }
      
      return reply.status(status).send({
        success: false,
        message
      });
    }
  }

  async deleteAccount(req: FastifyRequest<{ Params: AccountByIdParams }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const result = await accountService.deleteAccount(id);
      return reply.status(200).send({
        success: true,
        message: result.message,
        data: { id: result.id }
      });
    } catch (error: any) {
      console.error('deleteAccount error:', error);
      const status = error.status || 500;
      const message = error.message || 'Lỗi máy chủ';
      return reply.status(status).send({
        success: false,
        message
      });
    }
  }

  async login(req: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
    try {
      const result = await accountService.login(req.body);
      return reply.status(200).send({
        success: true,
        ...result
      });
    } catch (error: any) {
      console.error('login error:', error);
      const status = error.status || 500;
      const message = error.message || 'Lỗi máy chủ';
      return reply.status(status).send({
        success: false,
        message
      });
    }
  }

  async changePassword(req: FastifyRequest<{ Params: AccountByIdParams; Body: ChangePasswordBody }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const account = await accountService.changePassword(id, req.body);
      return reply.status(200).send({
        success: true,
        message: 'Đổi mật khẩu thành công',
        data: account
      });
    } catch (error: any) {
      console.error('changePassword error:', error);
      const status = error.status || 500;
      const message = error.message || 'Lỗi máy chủ';
      return reply.status(status).send({
        success: false,
        message
      });
    }
  }
}

export const accountController = new AccountController();

// Export individual methods for route handlers
export const register = accountController.register.bind(accountController);
export const getAccounts = accountController.getAccounts.bind(accountController);
export const getAccountById = accountController.getAccountById.bind(accountController);
export const updateAccount = accountController.updateAccount.bind(accountController);
export const deleteAccount = accountController.deleteAccount.bind(accountController);
export const login = accountController.login.bind(accountController);
export const changePassword = accountController.changePassword.bind(accountController);