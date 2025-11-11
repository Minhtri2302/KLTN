import { FastifyRequest, FastifyReply } from "fastify";
import { 
  CreateBannerBody, 
  UpdateBannerBody, 
  BannerByIdParams,
  BannerQueryParams
} from "../interface/banner.interface.ts";
import { bannerService } from "../service/banner.service.ts";

export const getAllBanners = async (
  req: FastifyRequest<{ Querystring: BannerQueryParams }>,
  reply: FastifyReply
) => {
  try {
    const { page, pageSize } = req.query;
    const result = await bannerService.getAllBanners(page, pageSize);
    return reply.code(200).send(result);
  } catch (error) {
    return reply.code(500).send({ message: "Error fetching banners", error });
  }
};

export const getBannerById = async (
  req: FastifyRequest<{ Params: BannerByIdParams }>,
  reply: FastifyReply
) => {
  try {
    const banner = await bannerService.getBannerById(req.params.id);
    return reply.code(200).send(banner);
  } catch (error: any) {
    if (error.status) {
      return reply.code(error.status).send({ message: error.message });
    }
    return reply.code(500).send({ message: "Error fetching banner", error });
  }
};

export const createBanner = async (
  req: FastifyRequest<{ Body: CreateBannerBody }>,
  reply: FastifyReply
) => {
  try {
    const savedBanner = await bannerService.createBanner(req.body);
    return reply.code(201).send(savedBanner);
  } catch (error) {
    return reply.code(400).send({ message: "Error creating banner", error });
  }
};

export const updateBanner = async (
  req: FastifyRequest<{ Params: BannerByIdParams; Body: UpdateBannerBody }>,
  reply: FastifyReply
) => {
  try {
    const updatedBanner = await bannerService.updateBanner(req.params.id, req.body);
    return reply.code(200).send(updatedBanner);
  } catch (error: any) {
    if (error.status) {
      return reply.code(error.status).send({ message: error.message });
    }
    return reply.code(400).send({ message: "Error updating banner", error });
  }
};

export const deleteBanner = async (
  req: FastifyRequest<{ Params: BannerByIdParams }>,
  reply: FastifyReply
) => {
  try {
    const result = await bannerService.deleteBanner(req.params.id);
    return reply.code(200).send(result);
  } catch (error: any) {
    if (error.status) {
      return reply.code(error.status).send({ message: error.message });
    }
    return reply.code(500).send({ message: "Error deleting banner", error });
  }
};
