import { BannerModel } from "../models/banner.model.ts";
import {
  CreateBannerBody,
  UpdateBannerBody
} from "../interface/banner.interface.ts";

export class BannerService {
  async getAllBanners(page?: number, pageSize?: number) {
    const query = BannerModel.find()
    .sort({ position: 1, createdAt: -1 });
    
    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      query.skip(skip).limit(pageSize);
    }
    
    const banners = await query;
    const total = await BannerModel.countDocuments();
    
    return {
      banners,
      pagination: {
        total,
        page: page || 1,
        pageSize: pageSize || total,
        totalPages: pageSize ? Math.ceil(total / pageSize) : 1
      }
    };
  }

  async getBannerById(id: string) {
    const banner = await BannerModel.findById(id);
    if (!banner) {
      throw { status: 404, message: "Banner not found" };
    }
    return banner;
  }

  async createBanner(data: CreateBannerBody) {
    const newBanner = new BannerModel(data);
    const savedBanner = await newBanner.save();
    return savedBanner;
  }

  async updateBanner(id: string, data: UpdateBannerBody) {
    const updatedBanner = await BannerModel.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true }
    );
    if (!updatedBanner) {
      throw { status: 404, message: "Banner not found" };
    }
    return updatedBanner;
  }

  async deleteBanner(id: string) {
    const deletedBanner = await BannerModel.findByIdAndDelete(id);
    if (!deletedBanner) {
      throw { status: 404, message: "Banner not found" };
    }
    return { message: "Banner deleted successfully" };
  }
}

export const bannerService = new BannerService();