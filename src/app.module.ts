import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UploadModule } from './upload/upload.module';
import { RateLimiterMiddleware } from './common/rate-limiter/rate-limiter.middleware';
import * as crypto from 'crypto';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DB_URL,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    UploadModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimiterMiddleware)
      .forRoutes({ path: '/status', method: RequestMethod.ALL }); 
  }
}
