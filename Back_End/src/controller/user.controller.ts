import { FastifyRequest, FastifyReply } from "fastify";
import { 
  CreateUserBody, 
  UpdateUserBody, 
  UserByIdParams,
  AddAddressBody,
  UpdateAddressBody,
  AddressIdParams
} from "../interface/user.interface.ts";
import {
  listUsersService,
  createUserService,
  getUserByIdService,
  updateUserService,
  deleteUserService,
  addAddressService,
  updateAddressService,
  deleteAddressService,
  setDefaultAddressService
} from "../service/user.service.ts";

// Helper để cast error an toàn
interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Server error';
};

const getMongoError = (error: unknown): MongoError | null => {
  if (error && typeof error === 'object' && 'code' in error) {
    return error as MongoError;
  }
  return null;
};

export const listUsers = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const query = req.query as { search?: string };
    const { search } = query || {};
    const { users, total } = await listUsersService(search);
    return reply.send({ data: users, total });
  } catch (err) {
    console.error("listUsers", err);
    return reply.status(500).send({ message: "Server error" });
  }
};

export const createUser = async (
  req: FastifyRequest<{ Body: CreateUserBody }>,
  reply: FastifyReply
) => {
  try {
    const body = req.body;
    const created = await createUserService(body);
    return reply.status(200).send(created);
  } catch (err) {
    console.error("createUser", err);
    const message = getErrorMessage(err);
    
    if (message === 'Invalid accountId') {
      return reply.status(400).send({ message });
    }
    if (message === 'Profile for this account already exists') {
      return reply.status(409).send({ message });
    }
    
    const mongoError = getMongoError(err);
    if (mongoError?.code === 11000) {
      return reply.status(409).send({ message: "Duplicate key", detail: mongoError.keyValue || null });
    }
    return reply.status(500).send({ message: "Server error" });
  }
};

export const getUserById = async (
  req: FastifyRequest<{ Params: UserByIdParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    const user = await getUserByIdService(id);
    return reply.send(user);
  } catch (err) {
    console.error("getUserById", err);
    const message = getErrorMessage(err);
    
    if (message === 'Invalid id') {
      return reply.status(400).send({ message });
    }
    if (message === 'User not found') {
      return reply.status(404).send({ message: "Not found" });
    }
    return reply.status(500).send({ message: "Server error" });
  }
};

export const updateUser = async (
  req: FastifyRequest<{ Params: UserByIdParams; Body: UpdateUserBody }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    const update = { ...(req.body || {}) };
    const updated = await updateUserService(id, update);
    return reply.send(updated);
  } catch (err) {
    console.error("updateUser", err);
    const message = getErrorMessage(err);
    
    if (message === 'Invalid id' || message === 'Invalid accountId') {
      return reply.status(400).send({ message });
    }
    if (message === 'User not found') {
      return reply.status(404).send({ message: "Not found" });
    }
    
    const mongoError = getMongoError(err);
    if (mongoError?.code === 11000) {
      return reply.status(409).send({ message: "Duplicate key", detail: mongoError.keyValue || null });
    }
    return reply.status(500).send({ message: "Server error" });
  }
};

export const deleteUser = async (
  req: FastifyRequest<{ Params: UserByIdParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    const deleted = await deleteUserService(id);
    return reply.send({ message: "Deleted", id: deleted._id });
  } catch (err) {
    console.error("deleteUser", err);
    const message = getErrorMessage(err);
    
    if (message === 'Invalid id') {
      return reply.status(400).send({ message });
    }
    if (message === 'User not found') {
      return reply.status(404).send({ message: "Not found" });
    }
    return reply.status(500).send({ message: "Server error" });
  }
};

// ========== ADDRESS CONTROLLERS ==========

export const addAddress = async (
  req: FastifyRequest<{ Params: UserByIdParams; Body: AddAddressBody }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    const addressData = req.body;
    const user = await addAddressService(id, addressData);
    return reply.status(200).send(user);
  } catch (err) {
    console.error("addAddress", err);
    const message = getErrorMessage(err);
    
    if (message === 'Invalid userId') {
      return reply.status(400).send({ message: 'Invalid user ID' });
    }
    if (message === 'User not found') {
      return reply.status(404).send({ message: "User not found" });
    }
    return reply.status(500).send({ message: "Server error" });
  }
};

export const updateAddress = async (
  req: FastifyRequest<{ Params: AddressIdParams; Body: UpdateAddressBody }>,
  reply: FastifyReply
) => {
  try {
    const { id, addressId } = req.params;
    const updateData = req.body;
    const user = await updateAddressService(id, addressId, updateData);
    return reply.send(user);
  } catch (err) {
    console.error("updateAddress", err);
    const message = getErrorMessage(err);
    
    if (message === 'Invalid userId' || message === 'Invalid addressId') {
      return reply.status(400).send({ message });
    }
    if (message === 'User not found' || message === 'Address not found') {
      return reply.status(404).send({ message });
    }
    return reply.status(500).send({ message: "Server error" });
  }
};

export const deleteAddress = async (
  req: FastifyRequest<{ Params: AddressIdParams }>,
  reply: FastifyReply
) => {
  try {
    const { id, addressId } = req.params;
    const user = await deleteAddressService(id, addressId);
    return reply.send(user);
  } catch (err) {
    console.error("deleteAddress", err);
    const message = getErrorMessage(err);
    
    if (message === 'Invalid userId' || message === 'Invalid addressId') {
      return reply.status(400).send({ message });
    }
    if (message === 'User not found' || message === 'Address not found') {
      return reply.status(404).send({ message });
    }
    return reply.status(500).send({ message: "Server error" });
  }
};

export const setDefaultAddress = async (
  req: FastifyRequest<{ Params: AddressIdParams }>,
  reply: FastifyReply
) => {
  try {
    const { id, addressId } = req.params;
    const user = await setDefaultAddressService(id, addressId);
    return reply.send(user);
  } catch (err) {
    console.error("setDefaultAddress", err);
    const message = getErrorMessage(err);
    
    if (message === 'Invalid userId' || message === 'Invalid addressId') {
      return reply.status(400).send({ message });
    }
    if (message === 'User not found' || message === 'Address not found') {
      return reply.status(404).send({ message });
    }
    return reply.status(500).send({ message: "Server error" });
  }
};
