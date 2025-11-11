import { Schema, Types } from "mongoose";

export const OrderSchema = new Schema({
  accountId: { type: Types.ObjectId, ref: "Account", required: false },
  items: [
    {
      productId: { type: Types.ObjectId, ref: "Product", required: false, default: null },
      name: { type: String, required: true },
      image: { type: String },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
    },
  ],
  total: { type: Number, required: true },
  shipping: {
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    // address may be either a string or a structured object provided by Stripe
    address: { type: Schema.Types.Mixed },
    // Thêm các trường chi tiết địa chỉ
    addressId: { type: Types.ObjectId, ref: "User" }, // Tham chiếu đến địa chỉ trong User addresses
    street: { type: String },
    ward: { type: String },
    district: { type: String },
    city: { type: String },
  },
  paymentMethod: { type: String, enum: ['Tiền mặt', 'Thẻ', 'Momo', 'Chuyển khoản ngân hàng'], default: 'Tiền mặt' },
  status: { type: String, enum: ["Chờ xử lý", "Đang xử lý", "Đã giao", "Đã hủy", "Đã gửi hàng"], default: "Chờ xử lý" },

  createdAt: { type: Date, default: Date.now },
  transaction: {
    stripeSessionId: { type: String, unique: true, sparse: true },
    // Có thể thêm các trường khác nếu cần
  },
});

// Đảm bảo index unique cho transaction.stripeSessionId
OrderSchema.index({ 'transaction.stripeSessionId': 1 }, { unique: true, sparse: true });
