export interface OrderItem {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ShippingInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Order {
  _id?: string;
  accountId: string;
  items: OrderItem[];
  total: number;
  shipping?: ShippingInfo;
  paymentMethod?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateOrderBody {
  items: OrderItem[];
  shipping?: ShippingInfo;
  paymentMethod?: string;
}

export interface UpdateOrderBody {
  items?: OrderItem[];
  total?: number;
  shipping?: ShippingInfo;
  status?: string;
}

export interface OrderByIdParams {
  id: string;
}

export interface OrderByAccountParams {
  accountId: string;
}
