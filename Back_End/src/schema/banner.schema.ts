import { Schema  } from "mongoose";
import { Banner } from "@interfaces/banner.interface.ts";

export const BannerSchema = new Schema<Banner>({
  name: { type: String, required: true },
  image: { type: String, required: true },
  active: { type: Boolean, default: true },
  position: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});


