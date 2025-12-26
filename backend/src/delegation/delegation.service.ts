import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDelegationDto, UpdateDelegationDto, DelegationPermissions } from './dto/delegation.dto';

@Injectable()
export class DelegationService {
  constructor(private prisma: PrismaService) { }

  /**
   * Create delegation - VP delegates to EA
   */
  async createDelegation(dto: CreateDelegationDto, createdByUserId: string) {
    // Verify VP is creating the delegation for themselves
    if (dto.vpId !== createdByUserId) {
      throw new ForbiddenException('You can only create delegations for yourself');
    }

    // Verify VP role
    const vp = await this.prisma.user.findUnique({ where: { id: dto.vpId } });
    if (!vp || vp.role !== 'VP') {
      throw new BadRequestException('VP user not found or invalid role');
    }

    // Verify EA role
    const ea = await this.prisma.user.findUnique({ where: { id: dto.eaId } });
    if (!ea || ea.role !== 'EA') {
      throw new BadRequestException('EA user not found or invalid role');
    }

    // Default permissions
    const defaultPermissions: DelegationPermissions = {
      canBook: true,
      canCancel: true,
      canView: true,
      canUpdate: false,
    };

    const permissions = dto.permissions || defaultPermissions;

    return this.prisma.delegation.create({
      data: {
        vpId: dto.vpId,
        eaId: dto.eaId,
        permissions: permissions as any,
        isActive: true,
      },
      include: {
        vp: { select: { id: true, name: true, email: true } },
        ea: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Get delegations for a VP
   */
  async getDelegationsForVp(vpId: string) {
    return this.prisma.delegation.findMany({
      where: { vpId, isActive: true },
      include: {
        ea: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get VPs that an EA manages
   */
  async getVpsForEa(eaId: string) {
    return this.prisma.delegation.findMany({
      where: { eaId, isActive: true },
      include: {
        vp: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if EA has permission for specific action
   */
  async hasPermission(
    eaId: string,
    vpId: string,
    permission: keyof DelegationPermissions,
  ): Promise<boolean> {
    const delegation = await this.prisma.delegation.findFirst({
      where: {
        eaId,
        vpId,
        isActive: true,
      },
    });

    if (!delegation) {
      return false;
    }

    const permissions = delegation.permissions as unknown as DelegationPermissions;
    return permissions[permission] === true;
  }

  /**
   * Verify EA can act on behalf of VP
   */
  async verifyDelegation(eaId: string, vpId: string): Promise<void> {
    const delegation = await this.prisma.delegation.findFirst({
      where: { eaId, vpId, isActive: true },
    });

    if (!delegation) {
      throw new ForbiddenException('No active delegation found');
    }
  }

  /**
   * Update delegation permissions
   */
  async updateDelegation(
    id: string,
    dto: UpdateDelegationDto,
    userId: string,
  ) {
    const delegation = await this.prisma.delegation.findUnique({
      where: { id },
    });

    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }

    // Only VP can update their delegations
    if (delegation.vpId !== userId) {
      throw new ForbiddenException('Only the VP can update this delegation');
    }

    const updateData: any = {};
    if (dto.permissions) updateData.permissions = dto.permissions;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.delegation.update({
      where: { id },
      data: updateData,
      include: {
        vp: { select: { id: true, name: true, email: true } },
        ea: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Remove delegation (set inactive)
   */
  async removeDelegation(id: string, userId: string) {
    const delegation = await this.prisma.delegation.findUnique({
      where: { id },
    });

    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }

    // Only VP can remove their delegations
    if (delegation.vpId !== userId) {
      throw new ForbiddenException('Only the VP can remove this delegation');
    }

    return this.prisma.delegation.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Get delegation by ID
   */
  async getDelegationById(id: string) {
    const delegation = await this.prisma.delegation.findUnique({
      where: { id },
      include: {
        vp: { select: { id: true, name: true, email: true } },
        ea: { select: { id: true, name: true, email: true } },
      },
    });

    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }

    return delegation;
  }
}
