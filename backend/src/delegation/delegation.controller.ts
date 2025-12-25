import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DelegationService } from './delegation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateDelegationDto, UpdateDelegationDto } from './dto/delegation.dto';
import { UserRole } from '@prisma/client';

@Controller('delegation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DelegationController {
  constructor(private delegationService: DelegationService) {}

  /**
   * Create delegation (VP only)
   */
  @Post()
  @Roles(UserRole.VP)
  async createDelegation(
    @Body() dto: CreateDelegationDto,
    @CurrentUser() user: any,
  ) {
    return this.delegationService.createDelegation(dto, user.id);
  }

  /**
   * Get delegations for current VP
   */
  @Get('my-delegates')
  @Roles(UserRole.VP)
  async getMyDelegates(@CurrentUser() user: any) {
    return this.delegationService.getDelegationsForVp(user.id);
  }

  /**
   * Get VPs that current EA manages
   */
  @Get('my-vps')
  @Roles(UserRole.EA)
  async getMyVps(@CurrentUser() user: any) {
    return this.delegationService.getVpsForEa(user.id);
  }

  /**
   * Get delegation by ID
   */
  @Get(':id')
  async getDelegationById(@Param('id') id: string) {
    return this.delegationService.getDelegationById(id);
  }

  /**
   * Update delegation (VP only)
   */
  @Put(':id')
  @Roles(UserRole.VP)
  async updateDelegation(
    @Param('id') id: string,
    @Body() dto: UpdateDelegationDto,
    @CurrentUser() user: any,
  ) {
    return this.delegationService.updateDelegation(id, dto, user.id);
  }

  /**
   * Remove delegation (VP only)
   */
  @Delete(':id')
  @Roles(UserRole.VP)
  async removeDelegation(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.delegationService.removeDelegation(id, user.id);
  }
}
