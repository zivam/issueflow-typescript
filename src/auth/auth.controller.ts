import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';
import { RequestWithUser } from './request-with-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  logout(@Req() req: RequestWithUser) {
    const token = this.extractTokenFromHeader(req);

    return this.authService.logout(token);
  }

  @Get('me')
  me(@Req() req: RequestWithUser) {
    return this.authService.me(req.user);
  }

  private extractTokenFromHeader(req: RequestWithUser) {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return '';
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      return '';
    }

    return token;
  }
}