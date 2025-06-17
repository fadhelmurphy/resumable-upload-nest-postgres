import {
  Controller,
  Post,
  Get,
  Delete,
  Query,
  Req,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { Request } from 'express';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Delete()
  async abortUpload(@Query('filename') filename: string) {
    if (!filename) {
      throw new HttpException('Missing filename', HttpStatus.BAD_REQUEST);
    }

    const result = await this.uploadService.abortUpload(filename);
    if (!result) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    return { message: `Upload for ${filename} aborted and cleaned up.` };
  }

  @Post()
  async upload(
    @Req() req: Request,
    @Headers('upload-file-name') fileName: string,
    @Headers('upload-total-size') totalSize: string,
  ) {
    if (!fileName || !totalSize) {
      throw new HttpException('Missing headers', HttpStatus.BAD_REQUEST);
    }

    const result = await  this.uploadService.handleUpload(req, fileName, +totalSize);

    return result;
  }

  @Get('status')
  async status(@Query('filename') filename: string) {
    if (!filename) {
      throw new HttpException('Missing filename', HttpStatus.BAD_REQUEST);
    }
    return this.uploadService.getStatus(filename);
  }
}
