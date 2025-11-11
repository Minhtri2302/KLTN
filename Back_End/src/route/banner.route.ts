import { FastifyInstance } from "fastify";
import {
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../controller/banner.controller.ts";
import { verifyToken, requireAdmin } from "../middleware/auth.ts";
import { 
  CreateBannerBody, 
  UpdateBannerBody, 
  BannerByIdParams 
} from "../interface/banner.interface.ts";

export default async function bannerRoutes(fastify: FastifyInstance) {
  fastify.get("/", getAllBanners);
  fastify.get<{ Params: BannerByIdParams }>("/:id", getBannerById);
  fastify.post<{ Body: CreateBannerBody }>("/", { preHandler: [verifyToken, requireAdmin] }, createBanner);
  fastify.put<{ Params: BannerByIdParams; Body: UpdateBannerBody }>("/:id", { preHandler: [verifyToken, requireAdmin] }, updateBanner);
  fastify.delete<{ Params: BannerByIdParams }>("/:id", { preHandler: [verifyToken, requireAdmin] }, deleteBanner);
}
