export interface IRegisterRequest {
  email: string;
  username: string;
  password: string;
}

import type { IUser } from './user';

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface ILoginResponse {
  user: IUser;
}
