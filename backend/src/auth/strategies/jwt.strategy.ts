import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
    const secret = configService.get<string>('JWT_SECRET');
    this.logger.log(`JwtStrategy initialized. Secret length: ${secret?.length}`);
  }

  async validate(payload: any) {
    this.logger.log(`JwtStrategy validate payload: ${JSON.stringify(payload)}`);
    const user = await this.usersService.findOne(payload.sub);

    if (!user) {
      this.logger.warn(`JwtStrategy: User not found for id: ${payload.sub}`);
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
