import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Upload } from './upload.entity';
import { LessThan, Repository } from 'typeorm';
import fs, { createWriteStream, promises as fsPromises } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UploadService {
    constructor(
        @InjectRepository(Upload)
        private readonly uploadRepo: Repository<Upload>,
    ) { }


    @Cron(CronExpression.EVERY_30_MINUTES, { name: 'clean_unfinished_uploads' })
    async cleanUnfinishedUploads() {
        const expired = await this.uploadRepo.find({
            where: {
                status: 'in-progress',
                updatedAt: LessThan(new Date(Date.now() - 60 * 60 * 1000)), // > 1 jam
            },
        });

        for (const file of expired) {
            const filePath = path.join(__dirname, '../../uploads', file.filename);
            fs.unlink(filePath, err => {
                if (err) {
                    console.error(`Failed to delete file ${filePath}:`, err);
                } else {
                    console.log(`Auto cleaned: ${file.filename}`);
                }
            });

            await this.uploadRepo.delete({ filename: file.filename });
        }
    }


    async handleUpload(
  req: any,
  fileName: string,
  totalSize: number,
): Promise<{ uploaded: number; status: string }> {
  const uploadDir = path.join(process.cwd(), 'uploads');
  await fsPromises.mkdir(uploadDir, { recursive: true });
  const uploadPath = path.join(uploadDir, fileName);

  // Cek file yang sudah ada
  let existingSize = 0;
  try {
    const stats = await fsPromises.stat(uploadPath);
    existingSize = stats.size;
  } catch {
    existingSize = 0;
  }

  // Validasi offset kalau client kasih Upload-Offset header
  const clientOffset = parseInt(req.headers['upload-offset'] || '0');
  if (clientOffset !== existingSize) {
    throw new HttpException(
      `Offset mismatch. Server offset: ${existingSize}, client offset: ${clientOffset}`,
      HttpStatus.CONFLICT,
    );
  }

  // Hitung content-length
  const contentLength = +req.headers['content-length'] || 0;
  const expectedEnd = existingSize + contentLength;

  if (expectedEnd > totalSize) {
    const allowedSize = totalSize - existingSize;

    const writeStream = createWriteStream(uploadPath, { flags: 'a' });
    let written = 0;

    await new Promise<void>((resolve, reject) => {
      req.on('data', chunk => {
        if (written < allowedSize) {
          const toWrite = chunk.slice(0, allowedSize - written);
          writeStream.write(toWrite);
          written += toWrite.length;
        }
      });
      req.on('end', () => {
        writeStream.end();
        resolve();
      });
      req.on('error', reject);
      writeStream.on('error', reject);
    });
  } else {
    const stream = createWriteStream(uploadPath, { flags: 'a' });
    await new Promise<void>((resolve, reject) => {
      req.pipe(stream);
      stream.on('finish', resolve);
      stream.on('error', reject);
      req.on('error', reject);
    });
  }

  // Setelah write selesai
  const finalStats = await fsPromises.stat(uploadPath);
  const finalSize = finalStats.size;

  let status = 'in-progress';
  if (finalSize >= totalSize) {
    status = 'complete';
  }

  // Update repo
  await this.uploadRepo.upsert(
    {
      filename: fileName,
      size: finalSize,
      status,
      updatedAt: new Date(),
    },
    ['filename'],
  );

  return {
    uploaded: finalSize,
    status,
  };
}


    async abortUpload(filename: string): Promise<boolean> {
        const record = await this.uploadRepo.findOneBy({ filename });
        if (!record) return false;

        const filePath = path.join(process.cwd(), 'uploads', filename);
        try {
            await fs.promises.unlink(filePath);
        } catch (err) {
            console.error(`Failed to delete file ${filePath}:`, err);
        }

        await this.uploadRepo.delete({ filename });
        return true;
    }

async getStatus(filename: string) {
    const filePath = path.join(process.cwd(), 'uploads', filename);
    let actualSize = 0;
    try {
        const stats = await fsPromises.stat(filePath);
        actualSize = stats.size;
    } catch {
        actualSize = 0;
    }

    let record = await this.uploadRepo.findOneBy({ filename });

    if (record) {
        if (record.size !== actualSize) {
            // Update biar sinkron
            record.size = actualSize;
            record.updatedAt = new Date();
            await this.uploadRepo.save(record);
        }
        return record;
    } else {
        return {
            filename,
            size: actualSize,
            status: actualSize > 0 ? 'in-progress' : 'not-started',
        };
    }
}


    // async computeChecksums(filePath: string): Promise<[string, string]> {
    //     return new Promise((resolve, reject) => {
    //         const md5 = crypto.createHash('md5');
    //         const sha = crypto.createHash('sha256');
    //         const stream = fs.createReadStream(filePath);

    //         stream.on('data', chunk => {
    //             md5.update(chunk);
    //             sha.update(chunk);
    //         });

    //         stream.on('end', () => {
    //             resolve([md5.digest('hex'), sha.digest('hex')]);
    //         });

    //         stream.on('error', reject);
    //     });
    // }

}
