export interface Account {
  _id?: string;
  username: string;
  password: string;
  role?: 'user' | 'admin';
  createdAt?: Date;
}

export interface RegisterBody {
  username: string;
  password: string;
  role?: 'user' | 'admin';
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface LoginBody {
  username: string;
  password: string;
}

export interface UpdateAccountBody {
  username?: string;
  password?: string;
  role?: 'user' | 'admin';
}

export interface ChangePasswordBody {
  oldPassword: string;
  newPassword: string;
}

export interface AccountByIdParams {
  id: string;
}
