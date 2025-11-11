import { Schema, Types } from "mongoose";
import { getProduct } from "../interface/products.interface.ts";

export const ProductSchema = new Schema<getProduct>({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  categoryId: { type: Types.ObjectId, ref: "Category", required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  specifications: { type: String },
  stock: { type: Number, default: 0 },
  page: { type: Number, default: 1, min: 1 },
  pageSize: { type: Number }
});
