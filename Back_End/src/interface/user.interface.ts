export interface Address {
  _id?: string;
  fullName: string;
  phone: string;
  email?: string;
  street: string;
  ward?: string;
  district?: string;
  city: string;
  isDefault?: boolean;
}

export interface CreateUserBody {
  accountId?: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  address?: string;
  gender?: string;
  dateOfBirth?: Date | string;
  addresses?: Address[];
}

export interface UpdateUserBody extends CreateUserBody {
}

export interface UserByIdParams { 
  id: string 
}

export interface AddAddressBody {
  fullName: string;
  phone: string;
  email?: string;
  street: string;
  ward?: string;
  district?: string;
  city: string;
  isDefault?: boolean;
}

export interface UpdateAddressBody extends AddAddressBody {}

export interface AddressIdParams {
  id: string;
  addressId: string;
}
