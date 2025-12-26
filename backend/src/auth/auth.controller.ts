import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LocalLoginDto, RegisterDto } from './dto/local-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('local/login')
  async localLogin(@Body() localLoginDto: LocalLoginDto) {
    return this.authService.localLogin(localLoginDto);
  }

  @Post('local/register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.authService.validateUser(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout() {
    // In a stateless JWT system, logout is handled on the client
    return { message: 'Logout successful' };
  }
}
