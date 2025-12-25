import { IsNotEmpty, IsUUID, IsBoolean, IsOptional, IsObject } from 'class-validator';

export interface DelegationPermissions {
  canBook: boolean;
  canCancel: boolean;
  canView: boolean;
  canUpdate: boolean;
}

export class CreateDelegationDto {
  @IsUUID()
  @IsNotEmpty()
  vpId: string;

  @IsUUID()
  @IsNotEmpty()
  eaId: string;

  @IsObject()
  @IsOptional()
  permissions?: DelegationPermissions;
}

export class UpdateDelegationDto {
  @IsObject()
  @IsOptional()
  permissions?: DelegationPermissions;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
