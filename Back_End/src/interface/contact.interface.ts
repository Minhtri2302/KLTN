export interface Contact {
  _id?: string;
  name: string;
  email: string;
  message: string;
  createdAt?: Date;
}

export interface CreateContactBody {
  name: string;
  email: string;
  message: string;
}

export interface UpdateContactBody {
  name?: string;
  email?: string;
  message?: string;
}

export interface ContactByIdParams {
  id: string;
}
