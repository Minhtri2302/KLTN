import { FastifyInstance } from "fastify";
import { 
  getProducts,
  getProductsByCategory, 
  createProduct,
  getProductsById, 
  updateProduct, 
  deleteProduct } from "../controller/products.controller.ts";
import { verifyToken, requireAdmin } from "../middleware/auth.ts";
import { getProduct, ProductCategoryParams, ProductByIdParams } from "../interface/products.interface.ts";
import { filterProductsByPrice, filterProductsByStar } from "../controller/products.controller.ts";

export default async function productRoute(fastify: FastifyInstance) {
  
  fastify.get("/", getProducts);
  fastify.get("/filter-by-price", filterProductsByPrice);
  fastify.get("/filter-by-star", filterProductsByStar);
  fastify.get<{ Params: ProductByIdParams }>("/:id/product", getProductsById);
  fastify.post<{ Body: getProduct }>("/post", { preHandler: [verifyToken, requireAdmin] }, createProduct);
  fastify.put<{ Params: ProductByIdParams; Body: Partial<getProduct> }>("/:id/update", { preHandler: [verifyToken, requireAdmin] }, updateProduct);
  fastify.delete<{ Params: ProductByIdParams }>("/:id/delete", { preHandler: [verifyToken, requireAdmin] }, deleteProduct);
  fastify.get<{ Params: ProductCategoryParams }>("/:categoryId", getProductsByCategory);
}
