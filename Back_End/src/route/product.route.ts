import { FastifyInstance } from "fastify";
import { 
  getProducts,
  getProductsByCategory, 
  // getTop4ProductsByCategory,
  createProduct,
  getProductsById, 
  updateProduct, 
  deleteProduct } from "../controller/products.controller.ts";
import { verifyToken, requireAdmin } from "../middleware/auth.ts";
import { filterProductsByPrice, filterProductsByStar } from "../controller/products.controller.ts";

export default async function productRoute(fastify: FastifyInstance) {
  
  fastify.get("/", getProducts);
  // Định nghĩa các route cụ thể TRƯỚC các dynamic route
  fastify.get("/filter-by-price", filterProductsByPrice);
  fastify.get("/filter-by-star", filterProductsByStar);
  // fastify.get("/:categoryId/top4", getTop4ProductsByCategory);
  fastify.get("/:id/product", getProductsById);
  fastify.post("/post", { preHandler: [verifyToken , requireAdmin ] }as any, createProduct);
  fastify.put("/:id/update", { preHandler: [verifyToken , requireAdmin ] }as any, updateProduct);
  fastify.delete("/:id/delete", { preHandler: [verifyToken , requireAdmin ] }as any, deleteProduct);
  // Dynamic route phải ở cuối để tránh conflict
  fastify.get("/:categoryId", getProductsByCategory);
}
