import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto, AuthResponseDto } from './dto/login.dto';
import { LocalLoginDto, RegisterDto } from './dto/local-login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateSsoToken(ssoToken: string): Promise<any> {
    // TODO: Implement actual SSO token validation with Azure AD/OKTA
    // For now, this is a placeholder that decodes the token
    // In production, validate the token with the SSO provider
    try {
      // Mock validation - replace with actual SSO validation
      const decoded = JSON.parse(Buffer.from(ssoToken, 'base64').toString());
      return decoded;
    } catch (error) {
      throw new UnauthorizedException('Invalid SSO token');
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Validate SSO token
    const ssoPayload = await this.validateSsoToken(loginDto.ssoToken);

    // Find or create user
    let user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      // Auto-create user from SSO
      const createUserDto: CreateUserDto = {
        email: loginDto.email,
        name: ssoPayload.name || loginDto.email,
        role: ssoPayload.role || 'ATTENDEE',
        ssoProvider: ssoPayload.provider || 'azure',
        timezone: ssoPayload.timezone || 'UTC',
      };
      user = await this.usersService.create(createUserDto);
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findOne(userId);
  }

  async validateLocalUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await this.usersService.comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      return null;
    }

    // Return user without password
    const { password: _, ...result } = user;
    return result;
  }

  async localLogin(localLoginDto: LocalLoginDto): Promise<AuthResponseDto> {
    const user = await this.validateLocalUser(localLoginDto.email, localLoginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create user with hashed password
    const user = await this.usersService.createWithPassword(
      registerDto.email,
      registerDto.name,
      registerDto.password,
    );

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
