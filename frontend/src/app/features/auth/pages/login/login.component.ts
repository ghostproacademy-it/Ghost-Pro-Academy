import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import { AppStore } from '../../../../core/store/app.store';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly appStore = inject(AppStore);
  protected readonly routes = APP_ROUTES;
  protected showPassword = false;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.appStore.setLoading(true);
    this.appStore.clearAuthError();

    this.authService.login(this.form.getRawValue()).subscribe({
      next: (user) => {
        this.appStore.setUser(user);
        this.appStore.setLoading(false);
        void this.router.navigate([this.routes.dashboard.path]);
      },
      error: () => {
        this.appStore.setLoading(false);
        // TODO: handle error
      },
    });
  }
}
