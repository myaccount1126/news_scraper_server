import { Controller, Get, Query, Post } from '@nestjs/common';
import { ArticleService } from './article.service';

@Controller('articles')
export class ArticleController {
  constructor(private readonly articlesService: ArticleService) {}

  @Post('run-cron')
  async runCronJob() {
    try {
      await this.articlesService.handleCron();
      return { message: 'Cron job has been triggered successfully.' };
    } catch (error) {
      // Log the error or throw it to be handled by NestJS's exception layer
      return { message: 'Failed to run cron job.', error: error.message };
    }
  }
}
