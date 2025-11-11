import mongoose from "mongoose";
import { getProduct } from "../interface/products.interface.ts";
import { ProductSchema } from "../schema/products.shema.ts";

export const ProductModel = mongoose.model<getProduct>("Product", ProductSchema, "products");
