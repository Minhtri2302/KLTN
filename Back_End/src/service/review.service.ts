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
  const list = await ReviewModel.find()
    .populate({
      path: 'userId',
      select: 'name'
    })
    .sort({ createdAt: -1 });
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

  // Kiểm tra số lần mua và số lần đã đánh giá
  const reviewCheck = await canUserReviewProductService(productId, accountId);
  if (!reviewCheck.canReview) {
    throw new Error(reviewCheck.reason || 'Bạn không thể đánh giá sản phẩm này');
  }

  // Truy vấn user theo accountId
  const userProfile = await UserModel.findOne({ accountId });
  if (!userProfile) {
    throw new Error('User profile not found');
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
    .populate({
      path: 'userId',
      select: 'name'
    })
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
): Promise<{ canReview: boolean; reason?: string; purchaseCount?: number; reviewCount?: number }> => {
  if (!productId || !accountId) {
    return { canReview: false, reason: 'Missing parameters' };
  }

  // Kiểm tra user profile
  const userProfile = await UserModel.findOne({ accountId });
  if (!userProfile) {
    return { canReview: false, reason: 'User profile not found' };
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
    productIdString: String(productId),
    status: 'Đã giao'
  });

  // Tìm tất cả đơn hàng đã giao của user này
  const deliveredOrders = await OrderModel.find({
    accountId: accountObjectId,
    status: 'Đã giao'
  }).lean();

  console.log(`Found ${deliveredOrders.length} delivered orders for user`);
  
  if (deliveredOrders.length === 0) {
    return { canReview: false, reason: 'Bạn chỉ có thể đánh giá sản phẩm đã mua và đơn hàng đã được giao' };
  }

  // Đếm số lần mua sản phẩm này (số đơn hàng đã giao có chứa sản phẩm)
  let purchaseCount = 0;
  for (const order of deliveredOrders) {
    console.log(`Checking order ${order._id}, items:`, order.items?.map((it: any) => ({
      productId: it.productId,
      productIdString: String(it.productId),
      name: it.name
    })));
    
    if (order.items && Array.isArray(order.items)) {
      const hasProduct = order.items.some((item: any) => {
        // So sánh nhiều cách để đảm bảo tìm được
        const itemProductId = String(item.productId || '');
        const targetProductId = String(productId);
        
        const match = itemProductId === targetProductId || 
                     item.productId === productId ||
                     String(item.productId) === String(productObjectId);
        
        if (match) {
          console.log(`Product matched in order ${order._id}:`, {
            itemProductId,
            targetProductId,
            itemName: item.name
          });
        }
        
        return match;
      });
      
      if (hasProduct) {
        purchaseCount++;
      }
    }
  }

  if (purchaseCount === 0) {
    console.log(`Product ${productId} not found in any delivered orders`);
    return { canReview: false, reason: 'Bạn chỉ có thể đánh giá sản phẩm đã mua và đơn hàng đã được giao' };
  }

  // Đếm số lần đã đánh giá sản phẩm này
  const reviewCount = await ReviewModel.countDocuments({
    productId: productObjectId,
    userId: userProfile._id
  });

  console.log(`User has purchased ${purchaseCount} times and reviewed ${reviewCount} times`);

  // Cho phép đánh giá nếu số lần đánh giá < số lần mua
  if (reviewCount >= purchaseCount) {
    return { 
      canReview: false, 
      reason: `Bạn đã đánh giá sản phẩm này ${reviewCount} lần (đã mua ${purchaseCount} lần). Mua thêm để đánh giá thêm.`,
      purchaseCount,
      reviewCount
    };
  }

  console.log(`User CAN review product ${productId} (${reviewCount + 1}/${purchaseCount})`);
  return { canReview: true, purchaseCount, reviewCount };
};