import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/auth-service';
import { env } from '@/config/env';

export class AuthController {
  constructor(private authService: AuthService) {}

  signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, accessToken, refreshToken } = await this.authService.signup(req.body);
      this.setCookies(res, refreshToken);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user, accessToken },
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, accessToken, refreshToken } = await this.authService.login(
        req.body,
        req.headers['user-agent'],
        req.ip,
      );
      this.setCookies(res, refreshToken);

      res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: { user, accessToken },
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const oldRefreshToken = req.cookies.refreshToken;
      const {
        user,
        accessToken,
        refreshToken: newRefreshToken,
      } = await this.authService.refresh(oldRefreshToken, req.headers['user-agent'], req.ip);
      this.setCookies(res, newRefreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: { user, accessToken },
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }
      this.clearCookies(res);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  logoutAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user) {
        await this.authService.logoutAll(req.user.id);
      }
      this.clearCookies(res);

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices',
      });
    } catch (error) {
      next(error);
    }
  };

  private setCookies(res: Response, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearCookies(res: Response) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });
  }
}
