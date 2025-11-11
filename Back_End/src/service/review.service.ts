import { ReviewModel } from '../models/review.model.ts';
import { UserModel } from '../models/user.model.ts';
import { OrderModel } from '../models/order.model.ts';
import mongoose from 'mongoose';
import { 
  CreateReviewBody, 
  UpdateReviewBody, 
  ReviewSummary 
} from '../interface/review.interface.ts';

export const updateReviewService = async (id: string, updateData: Partial<UpdateReviewBody>) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid id');
  }

  const update: any = { ...updateData };
  if (update._id) delete update._id;

  if (update.rating !== undefined) {
    const r = Number(update.rating);
    if (isNaN(r) || r < 1 || r > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    update.rating = r;
  }

  if (update.status !== undefined) {
    if (update.status !== 'active' && update.status !== 'inactive') {
      throw new Error('Status must be "active" or "inactive"');
    }
  }

  const updated = await ReviewModel.findByIdAndUpdate(id, update, { new: true });
  if (!updated) {
    throw new Error('Review not found');
  }

  return updated;
};

export const deleteReviewService = async (id: string) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid id');
  }

  const deleted = await ReviewModel.findByIdAndDelete(id);
  if (!deleted) {
    throw new Error('Review not found');
  }

  return deleted;
};

export const getAllReviewsService = async () => {
  const list = await ReviewModel.find().sort({ createdAt: -1 });
  return list;
};

export const createReviewService = async (
  productId: string | undefined,
  rating: number | undefined,
  comment: string | undefined,
  accountId: string | undefined
) => {
  if (!productId || !rating) {
    throw new Error('Missing fields');
  }

  if (!accountId) {
    throw new Error('Missing accountId from token');
  }

  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Truy vấn user theo accountId
  const userProfile = await UserModel.findOne({ accountId });
  if (!userProfile) {
    throw new Error('User profile not found');
  }

  // Kiểm tra xem user đã đánh giá sản phẩm này chưa
  const existingReview = await ReviewModel.findOne({
    productId,
    userId: userProfile._id
  });

  if (existingReview) {
    throw new Error('Bạn đã đánh giá sản phẩm này rồi');
  }

  // Kiểm tra xem user đã mua sản phẩm này và đơn hàng đã giao chưa
  // accountId có thể là string hoặc ObjectId, productId cũng vậy
  const accountObjectId = mongoose.Types.ObjectId.isValid(accountId) 
    ? new mongoose.Types.ObjectId(accountId) 
    : accountId;
  const productObjectId = mongoose.Types.ObjectId.isValid(productId)
    ? new mongoose.Types.ObjectId(productId)
    : productId;

  console.log('CreateReview - Checking for delivered order with:', {
    accountId: accountObjectId,
    productId: productObjectId,
    status: 'Đã giao'
  });

  const deliveredOrder = await OrderModel.findOne({
    accountId: accountObjectId,
    'items.productId': productObjectId,
    status: 'Đã giao'
  });

  console.log('CreateReview - Delivered order found:', deliveredOrder ? 'YES' : 'NO');

  if (!deliveredOrder) {
    throw new Error('Bạn chỉ có thể đánh giá sản phẩm đã mua và đơn hàng đã được giao');
  }

  // Lưu _id user vào trường userId của review
  const doc = await ReviewModel.create({
    productId,
    userId: userProfile._id,
    rating,
    comment
  });

  return doc;
};

export const getReviewsByProductService = async (productId: string) => {
  if (!productId) {
    throw new Error('Missing product id');
  }

  const list = await ReviewModel.find({ productId, status: 'active' })
    .populate('userId', 'name')
    .sort({ createdAt: -1 });

  return list;
};

export const getReviewsSummaryService = async (productId: string): Promise<ReviewSummary> => {
  if (!productId) {
    throw new Error('Missing product id');
  }

  // Lấy tất cả review, không lọc hidden
  const docs = await ReviewModel.find({ productId }).select('rating').lean();

  if (!docs || docs.length === 0) {
    return { avgRating: 0, count: 0, roundedStar: 0 };
  }

  const count = docs.length;
  const sum = docs.reduce((s: number, d: any) => s + (Number(d.rating) || 0), 0);
  const avg = sum / count;
  const roundedStar = Math.round(avg); // Làm tròn số sao, không lấy thập phân

  return { roundedStar, count, avgRating: avg };
};

// Kiểm tra xem user có thể đánh giá sản phẩm này không
export const canUserReviewProductService = async (
  productId: string,
  accountId: string
): Promise<{ canReview: boolean; reason?: string }> => {
  if (!productId || !accountId) {
    return { canReview: false, reason: 'Missing parameters' };
  }

  // Kiểm tra user profile
  const userProfile = await UserModel.findOne({ accountId });
  if (!userProfile) {
    return { canReview: false, reason: 'User profile not found' };
  }

  // Kiểm tra xem đã đánh giá chưa
  const existingReview = await ReviewModel.findOne({
    productId,
    userId: userProfile._id
  });

  if (existingReview) {
    return { canReview: false, reason: 'Bạn đã đánh giá sản phẩm này rồi' };
  }

  // Kiểm tra xem đã mua và đơn hàng đã giao chưa
  const accountObjectId = mongoose.Types.ObjectId.isValid(accountId) 
    ? new mongoose.Types.ObjectId(accountId) 
    : accountId;
  const productObjectId = mongoose.Types.ObjectId.isValid(productId)
    ? new mongoose.Types.ObjectId(productId)
    : productId;

  console.log('Checking for delivered order with:', {
    accountId: accountObjectId,
    productId: productObjectId,
    status: 'Đã giao'
  });

  const deliveredOrder = await OrderModel.findOne({
    accountId: accountObjectId,
    'items.productId': productObjectId,
    status: 'Đã giao'
  });

  console.log('Delivered order found:', deliveredOrder ? 'YES' : 'NO');

  if (!deliveredOrder) {
    return { canReview: false, reason: 'Bạn chỉ có thể đánh giá sản phẩm đã mua và đơn hàng đã được giao' };
  }

  return { canReview: true };
};
