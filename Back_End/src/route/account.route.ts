import { FastifyInstance } from "fastify";
import {
  register,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
  login,
  changePassword,
} from "../controller/account.controller.ts";
import { verifyToken, requireAdmin } from "../middleware/auth.ts";
import { 
  RegisterBody, 
  LoginBody, 
  UpdateAccountBody, 
  ChangePasswordBody, 
  AccountByIdParams 
} from "../interface/account.interface.ts";

export default async function accountRoutes(fastify: FastifyInstance) {

  fastify.post<{ Body: RegisterBody }>(
    '/postaccount', 
    register
  );

  fastify.post<{ Body: LoginBody }>(
    '/login', 
    login
  );

  fastify.get(
    '/', 
    { preHandler: [verifyToken, requireAdmin] }, 
    getAccounts
  );

  fastify.delete<{ Params: AccountByIdParams }>(
    '/:id/deleteaccount', 
    { preHandler: [verifyToken, requireAdmin] }, 
    deleteAccount
  );

  fastify.get<{ Params: AccountByIdParams }>(
    '/:id', 
    { preHandler: [verifyToken] }, 
    getAccountById
  );

  fastify.put<{ Params: AccountByIdParams; Body: UpdateAccountBody }>(
    '/:id/putaccount', 
    { preHandler: [verifyToken] }, 
    updateAccount
  );

  fastify.post<{ Params: AccountByIdParams; Body: ChangePasswordBody }>(
    '/:id/change-password', 
    { preHandler: [verifyToken] }, 
    changePassword
  );
}