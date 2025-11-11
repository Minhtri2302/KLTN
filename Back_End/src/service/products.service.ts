import { ProductModel } from "../models/products.models.ts";
import mongoose from "mongoose";

export const getProductsService = async (search: string, page?: number, pageSize?: number) => {
  let filter: any = {};
  
  // CHỈ lọc theo search nếu có search text
  if (search && String(search).trim()) {
    const searchTerm = String(search).trim();
    // Tìm kiếm chính xác: tên sản phẩm phải chứa từ khóa như một từ độc lập hoặc là phần đầu của từ
    filter.name = { $regex: `\\b${searchTerm}`, $options: 'i' };
  }
  // Nếu KHÔNG có search, filter rỗng => lấy tất cả products (cho admin)

  const total = await ProductModel.countDocuments(filter);

  const aggregatePipeline: any[] = [
    { $match: filter }, // Nếu filter rỗng thì match tất cả
  ];

  // Thêm phân trang nếu có page và pageSize
  if (page && pageSize) {
    aggregatePipeline.push(
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize }
    );
  }

  aggregatePipeline.push(
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'productId',
        as: 'reviews'
      }
    },
    {
      $addFields: {
        avgRating: {
          $cond: [
            { $gt: [{ $size: '$reviews' }, 0] },
            { $avg: '$reviews.rating' },
            null
          ]
        }
      }
    },
    { $project: { reviews: 0 } }
  );

  const products = await ProductModel.aggregate(aggregatePipeline);

  return { 
    products, 
    total,
    ...(page && pageSize ? {
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    } : {})
  };
};

export const getProductsByCategoryService = async (categoryId: string, rawQuery: any) => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new Error("Invalid categoryId");
  }

  let page = Number(rawQuery.page) || 1;
  let pageSize = Number(rawQuery.pageSize) || 10;
  if (page < 1) page = 1;
  if (pageSize < 1) pageSize = 10;

  const match: any = { categoryId: new mongoose.Types.ObjectId(categoryId) };
  if (rawQuery.search && String(rawQuery.search).trim()) {
    match.name = { $regex: `.*${String(rawQuery.search).trim()}.*`, $options: 'i' };
  }

  const total = await ProductModel.countDocuments(match);

  const products = await ProductModel.aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * pageSize },
    { $limit: pageSize },
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'productId',
        as: 'reviews'
      }
    },
    {
      $addFields: {
        avgRating: {
          $cond: [
            { $gt: [{ $size: '$reviews' }, 0] },
            { $avg: '$reviews.rating' },
            null
          ]
        },
        roundedStar: {
          $cond: [
            { $gt: [{ $size: '$reviews' }, 0] },
            {
              $let: {
                vars: { avg: { $avg: '$reviews.rating' } },
                in: {
                  $cond: [
                    { $gte: ['$$avg', 1.5] },
                    { $ceil: '$$avg' },
                    { $floor: '$$avg' }
                  ]
                }
              }
            },
            null
          ]
        }
      }
    },
    { $project: { reviews: 0 } }
  ]);

  return { products, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
};

export const getProductsByIdService = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid product ID");
  }

  const products = await ProductModel.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    {
      $lookup: {
        from: "reviews",
        localField: "_id",
        foreignField: "productId",
        as: "reviews"
      }
    },
    {
      $addFields: {
        avgRating: {
          $cond: [
            { $gt: [{ $size: "$reviews" }, 0] },
            { $avg: "$reviews.rating" },
            null
          ]
        }
      }
    },
    {
      $project: {
        reviews: 0
      }
    }
  ]);

  if (!products || products.length === 0) {
    throw new Error("Product not found");
  }

  return products[0];
};