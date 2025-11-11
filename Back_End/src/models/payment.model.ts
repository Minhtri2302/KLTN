import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  method: string;
  status: string;
  gatewaySessionId?: string | null;
  gatewayResponse?: any;
  refundInfo?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    method: { type: String, required: true },
    status: { type: String, default: 'pending' },
    gatewaySessionId: { type: String, default: null },
    gatewayResponse: { type: Schema.Types.Mixed, default: null },
    refundInfo: { type: Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

export const PaymentModel = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
