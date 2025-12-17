import { FastifyRequest, FastifyReply } from "fastify";
import { ProductModel } from "../models/products.models.ts";
import {
  getProduct,
  ProductCategoryParams,
  ProductByIdParams
} from "../interface/products.interface.ts";
import mongoose from "mongoose";
import { getProductsService, getProductsByCategoryService, getProductsByIdService } from "../service/products.service.ts";
import { OrderModel } from "../models/order.model.ts";

export const getProducts = async (
  req: FastifyRequest<{ Querystring: getProduct }>,
  reply: FastifyReply
) => {
  try {
    const { search, page, pageSize } = req.query;
    const result = await getProductsService(
      search || "", 
      page ? Number(page) : undefined, 
      pageSize ? Number(pageSize) : undefined
    );
    
    // Nếu có search query, trả về data (cho user)
    // Nếu không có search, trả về products trực tiếp (cho admin list all)
    if (search && search.trim()) {
      return reply.send({ 
        data: result.products,
        pagination: result.page && result.pageSize ? {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages
        } : undefined
      });
    }
    
    // Admin list all products - trả về array trực tiếp hoặc object với products
    return reply.send({ 
      products: result.products, 
      total: result.total 
    });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const getProductsByCategory = async (
  req: FastifyRequest<{ Params: ProductCategoryParams }>,
  reply: FastifyReply
) => {
  try {
    const { categoryId } = req.params;
    const rawQuery: any = (req as any).query || {};
    const result = await getProductsByCategoryService(categoryId, rawQuery);
    return reply.send(result);
  } catch (err) {
    console.error("Error fetching products by category:", err);
    return reply.status(500).send({ message: "Server error" });
  }
};

export const getProductsById = async (
  req: FastifyRequest<{ Params: ProductByIdParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    const product = await getProductsByIdService(id);
    return reply.send(product);
  } catch (err) {
    console.error("Error fetching product by ID:", err);
    return reply.status(500).send({ message: "Server error" });
  }
};

export const createProduct = async (
  req: FastifyRequest<{ Body: getProduct }>,
  reply: FastifyReply
) => {
  try {
    const { name, price, categoryId, description, image, specifications, stock } = req.body;

    console.log('Incoming payload:', req.body);

    // optional fields

    if (!name || typeof name !== 'string' || !name.trim()) {
      return reply.status(400).send({ message: 'Product name is required' });
    }
    if (price === undefined || price === null || isNaN(Number(price))) {
      return reply.status(400).send({ message: 'Valid price is required' });
    }
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return reply.status(400).send({ message: 'Valid categoryId is required' });
    }
    if (!description || typeof description !== 'string') {
      return reply.status(400).send({ message: 'Description is required' });
    }
    if (!image || typeof image !== 'string') {
      return reply.status(400).send({ message: 'Image URL is required' });
    }
    // validate optional specifications
    if (specifications !== undefined && typeof specifications !== 'string') {
      return reply.status(400).send({ message: 'Specifications must be a string' });
    }
    // validate optional stock
    if (stock !== undefined) {
      const stockNum = Number(stock);
      if (Number.isNaN(stockNum) || !Number.isFinite(stockNum) || stockNum < 0) {
        return reply.status(400).send({ message: 'Stock must be a non-negative number' });
      }
    }

    // Ensure all fields are strings where applicable
    const validName = name ? String(name).trim() : '';
    const validDescription = description ? String(description).trim() : '';
    const validImage = image ? String(image).trim() : '';
    const validSpecifications = specifications ? String(specifications).trim() : '';

    const newProduct = await ProductModel.create({
      name: validName,
      price: Number(price),
      categoryId,
      description: validDescription,
      image: validImage,
      specifications: validSpecifications,
      stock: stock !== undefined ? Number(stock) : undefined,
    });

    return reply.status(200).send(newProduct);
  } catch (err) {
    console.error('createProduct error. body=', req.body, (err as any) && ((err as any).stack || err));
    if ((err as any)?.name === 'ValidationError') {
      return reply.status(400).send({ message: (err as any).message });
    }
    return reply.status(500).send({ error: (err as any)?.message || 'Internal Server Error' });
  }
};

export const updateProduct = async (
  req: FastifyRequest<{ Params: ProductByIdParams; Body: Partial<getProduct> }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return reply.status(400).send({ message: "Invalid product ID" });
    }

    const updateData = { ...req.body } as any;
    if (updateData._id) delete updateData._id;

    // validate optional fields if they exist in update
    if (updateData.specifications !== undefined && typeof updateData.specifications !== 'string') {
      return reply.status(400).send({ message: 'Specifications must be a string' });
    }
    if (updateData.stock !== undefined) {
      const stockNum = Number(updateData.stock);
      if (Number.isNaN(stockNum) || !Number.isFinite(stockNum) || stockNum < 0) {
        return reply.status(400).send({ message: 'Stock must be a non-negative number' });
      }
      updateData.stock = stockNum;
    }

    const updated = await ProductModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      return reply.status(404).send({ message: "Product not found" });
    }

    return reply.send(updated);
  } catch (err) {
    console.error("Error updating product:", err);
    return reply.status(500).send({ message: "Server error" });
  }
};

export const deleteProduct = async (
  req: FastifyRequest<{ Params: ProductByIdParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return reply.status(400).send({ message: "Invalid product ID" });
    }

    // Kiểm tra xem sản phẩm có trong đơn hàng nào không
    const productObjectId = new mongoose.Types.ObjectId(id);
    const orderWithProduct = await OrderModel.findOne({
      $or: [
        { 'items.productId': productObjectId },
        { 'items.productId': id }
      ]
    }).lean();

    if (orderWithProduct) {
      return reply.status(400).send({ 
        message: "Không thể xóa sản phẩm này vì đã có trong đơn hàng. Vui lòng ẩn sản phẩm thay vì xóa." 
      });
    }

    const deleted = await ProductModel.findByIdAndDelete(id);
    if (!deleted) {
      return reply.status(404).send({ message: "Product not found" });
    }
    return reply.send({ message: "Product deleted", data: deleted });
  } catch (err) {
    console.error("Error deleting product:", err);
    return reply.status(500).send({ message: "Server error" });
  }
};

// Lọc sản phẩm theo giá
export const filterProductsByPrice = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { min, max, categoryId } = req.query as { min?: string; max?: string; categoryId?: string };
    const match: any = {};
    if (min) match.price = { ...(match.price || {}), $gte: Number(min) };
    if (max) match.price = { ...(match.price || {}), $lte: Number(max) };
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      match.categoryId = new mongoose.Types.ObjectId(categoryId);
    }
    const products = await ProductModel.find(match);
    return reply.send({ data: products });
  } catch (err) {
    return reply.status(500).send({ message: 'Lỗi server', error: err });
  }
};

// Lọc sản phẩm theo số sao trung bình
export const filterProductsByStar = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { star, categoryId } = req.query as { star?: string, categoryId?: string };
    if (!star) {
      return reply.status(400).send({ message: 'Thiếu tham số star' });
    }
    // Lấy sản phẩm có số sao trung bình đã làm tròn đúng số sao (không lấy thập phân)
    const match: any = {};
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      match.categoryId = new mongoose.Types.ObjectId(categoryId);
    }
    const products = await ProductModel.aggregate([
      { $match: match },
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
          avg: {
            $cond: [
              { $gt: [{ $size: '$reviews' }, 0] },
              { $avg: '$reviews.rating' },
              null
            ]
          }
        }
      },
      {
        $addFields: {
          roundedStar: { $cond: [ { $ne: ['$avg', null] }, { $round: ['$avg', 0] }, null ] }
        }
      },
      { $match: { roundedStar: Number(star) } },
      { $project: { reviews: 0 } }
    ]);
    return reply.send({ data: products });
  } catch (err) {
    return reply.status(500).send({ message: 'Lỗi server', error: err });
  }
};
