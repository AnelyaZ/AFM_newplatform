import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class UploadsService implements OnModuleInit {
  private s3: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor(private config: ConfigService) {
    this.endpoint = this.config.get('S3_ENDPOINT') || 'http://localhost:9000';
    this.bucket = this.config.get('S3_BUCKET') || 'afm-media';

    this.s3 = new S3Client({
      endpoint: this.endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.config.get('S3_ACCESS_KEY') || 'minioadmin',
        secretAccessKey: this.config.get('S3_SECRET_KEY') || 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch (e) {
        console.warn('Could not create S3 bucket:', e.message);
      }
    }
  }

  async upload(
    file: Express.Multer.File,
    key: string,
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `${this.endpoint}/${this.bucket}/${key}`;
  }
}
