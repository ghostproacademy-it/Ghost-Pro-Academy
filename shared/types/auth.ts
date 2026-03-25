export interface IRegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface ILoginResponse {
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}
