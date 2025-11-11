import mongoose from "mongoose";
import { BannerSchema } from "../schema/banner.schema.ts";
import { Banner } from "@interfaces/banner.interface.ts";

export const BannerModel = mongoose.model<Banner>("Banner", BannerSchema, "banner");
