import {
  Controller,
  Post,
  Get,
  Delete,
  Query,
  Req,
  Res,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { Request, Response } from 'express';

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
    @Res() res: Response,
    @Headers('Upload-File-Name') fileName: string,
    @Headers('Upload-Total-Size') totalSize: string,
  ) {
    if (!fileName || !totalSize) {
      throw new HttpException('Missing headers', HttpStatus.BAD_REQUEST);
    }

    const result = await  this.uploadService.handleUpload(req, fileName, +totalSize);

      res.set({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Content-Length': Buffer.byteLength(JSON.stringify(result))
  });
  return res.json(result);
  }

  @Get('status')
  async status(@Query('filename') filename: string) {
    if (!filename) {
      throw new HttpException('Missing filename', HttpStatus.BAD_REQUEST);
    }
    return this.uploadService.getStatus(filename);
  }
}
