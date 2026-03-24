import { Injectable } from '@nestjs/common';

@Injectable()
export class LogoutUseCase {
  execute() {
    // cookie clearing is an HTTP concern — handled by the controller
  }
}
