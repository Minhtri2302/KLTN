import mongoose from "mongoose";
import { OrderSchema } from "../schema/order.schema.ts";

export const OrderModel = mongoose.model("Order", OrderSchema, "orders");
