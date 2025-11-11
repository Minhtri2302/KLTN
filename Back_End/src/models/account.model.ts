import mongoose from "mongoose";
import { AccountSchema } from "../schema/account.schema.ts";
import { Account } from "@interfaces/account.interface.ts";

export const AccountModel = mongoose.model<Account>("Account", AccountSchema, "account");
