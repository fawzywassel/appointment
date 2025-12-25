import { IsNotEmpty, IsString, IsEnum, IsOptional, IsDateString, IsBoolean, IsUUID, IsEmail } from 'class-validator';
import { MeetingType, MeetingStatus, MeetingPriority } from '@prisma/client';

export class CreateMeetingDto {
  @IsUUID()
  @IsNotEmpty()
  vpId: string;

  @IsUUID()
  @IsOptional()
  attendeeId?: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsEnum(MeetingType)
  @IsNotEmpty()
  type: MeetingType;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @IsEnum(MeetingPriority)
  @IsOptional()
  priority?: MeetingPriority;

  // For intake form
  @IsString()
  @IsOptional()
  agenda?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateMeetingDto {
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsEnum(MeetingType)
  @IsOptional()
  type?: MeetingType;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(MeetingStatus)
  @IsOptional()
  status?: MeetingStatus;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @IsEnum(MeetingPriority)
  @IsOptional()
  priority?: MeetingPriority;

  @IsString()
  @IsOptional()
  agenda?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class PublicBookingDto {
  @IsString()
  @IsNotEmpty()
  attendeeName: string;

  @IsString()
  @IsNotEmpty()
  attendeeEmail: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsEnum(MeetingType)
  @IsNotEmpty()
  type: MeetingType;

  @IsString()
  @IsOptional()
  agenda?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class MeetingFilterDto {
  @IsEnum(MeetingStatus)
  @IsOptional()
  status?: MeetingStatus;

  @IsEnum(MeetingType)
  @IsOptional()
  type?: MeetingType;

  @IsEnum(MeetingPriority)
  @IsOptional()
  priority?: MeetingPriority;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsUUID()
  @IsOptional()
  attendeeId?: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}

export class BookAsVpDto {
  @IsString()
  @IsNotEmpty()
  attendeeName: string;

  @IsEmail()
  @IsNotEmpty()
  attendeeEmail: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsEnum(MeetingType)
  @IsNotEmpty()
  type: MeetingType;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(MeetingPriority)
  @IsOptional()
  priority?: MeetingPriority;

  @IsString()
  @IsOptional()
  agenda?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
