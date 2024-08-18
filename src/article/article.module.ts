import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticleEntity } from './article.entity';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { CategoryEntity } from '../category/category.entity'; // Make sure this path is correct

@Module({
  imports: [TypeOrmModule.forFeature([ArticleEntity, CategoryEntity])],
  controllers: [ArticleController],
  providers: [ArticleService],
})
export class ArticleModule {}
