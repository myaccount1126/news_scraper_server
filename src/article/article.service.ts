import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticleEntity } from './article.entity';
import { CategoryEntity } from 'src/category/category.entity'; // Update the path if needed
import * as puppeteer from 'puppeteer';

interface ScrapedArticle {
  title: string;
  category: string;
  url: string;
  image: string;
  source: string;
  publishedAt?: Date;
  relativeTime?: string;
}

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);
  constructor(
    @InjectRepository(ArticleEntity)
    private articleRepository: Repository<ArticleEntity>,
    @InjectRepository(CategoryEntity) // Inject CategoryRepository
    private categoryRepository: Repository<CategoryEntity>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    try {
      await this.scrapeAndSave();
      const currentTime = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Hong_Kong',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      this.logger.log(`Scraping and saving completed at ${currentTime}`);
    } catch (error) {
      this.logger.error('Error during scraping and saving:', error.stack);
    }
  }

  async scrapeAndSave() {
    const [hk01Articles, singTaoArticles] = await Promise.all([
      this.scrapeHK01(),
      this.scrapeSingTao(),
    ]);

    const allArticles: any = [...hk01Articles, ...singTaoArticles];

    for (const article of allArticles) {
      // Ensure article is not a Promise
      const resolvedArticle = await Promise.resolve(article);

      const existingArticle = await this.articleRepository.findOne({
        where: { url: resolvedArticle.url },
      });

      if (!existingArticle) {
        // Find or create the category
        let category = await this.categoryRepository.findOne({
          where: { name: resolvedArticle.category },
        });

        if (!category) {
          category = this.categoryRepository.create({
            name: resolvedArticle.category,
          });
          await this.categoryRepository.save(category);
        }

        // Create and save the article
        const newArticle = this.articleRepository.create({
          title: resolvedArticle.title,
          url: resolvedArticle.url,
          image: resolvedArticle.image,
          source: resolvedArticle.source,
          category: category,
          publishedAt: new Date(resolvedArticle.publishedAtTimestamp), // Handle cases where publishedAt might not exist
        });

        await this.articleRepository.save(newArticle);
      }
    }
  }

  async scrapeHK01() {
    const browser = await puppeteer.launch({
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox',
        '--single-process',
        '--no-zygote',
      ],
      executablePath:
        process.env.NODE_ENV === 'production'
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(5000000);
    try {
      await page.goto('https://www.hk01.com/latest');
      page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
      const articles = await page.evaluate(() => {
        const newsItems = document.querySelectorAll('.content-card');
        return Array.from(newsItems)
          .map((item) => {
            const relativeTime =
              item.querySelector('time')?.textContent?.trim() || '';
            const currentTime = new Date();
            if (!relativeTime.match(/^(\d+)\s分鐘前$/)) {
              return;
            }

            const minutesAgo = parseInt(
              relativeTime.match(/^(\d+)\s分鐘前$/)[1],
            );
            const publishedAtTimestamp =
              currentTime.getTime() - minutesAgo * 60000;

            let category =
              item.querySelector('.card-category')?.textContent?.trim() || '';
            if (category.startsWith('即時')) {
              category = category.slice(2);
            }
            const cardImageInner = item.querySelector('.card-image__inner');
            const url = cardImageInner
              ? cardImageInner.querySelector('a')?.href || ''
              : '';
            const image = cardImageInner
              ? cardImageInner.querySelector('img')?.src || ''
              : '';

            return {
              title:
                item.querySelector('.card-title')?.textContent?.trim() || '',
              category: category,
              url: url,
              image: image,
              source: 'HK01',
              publishedAtTimestamp,
            };
          })
          .filter((article) => article != null);
      });

      await browser.close();
      return articles.filter((article) => article !== undefined);
    } catch (error) {
      this.logger.error(`Error scraping HK01: ${error.message}`);
      return [];
    } finally {
      await browser.close();
    }
  }

  async scrapeSingTao() {
    const browser = await puppeteer.launch({
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox',
        '--single-process',
        '--no-zygote',
      ],
      executablePath:
        process.env.NODE_ENV === 'production'
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(50000000);
    await page.goto('https://std.stheadline.com/realtime/%E5%8D%B3%E6%99%82');
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    const articles = await page.evaluate(() => {
      const newsItems = document.querySelectorAll('.media');
      return Array.from(newsItems)
        .map((item) => {
          const relativeTime =
            item.querySelector('.date')?.textContent?.trim() || '';

          const currentTime = new Date();

          if (!relativeTime.match(/^(\d+)分鐘前$/)) {
            return;
          }
          const minutesAgo = parseInt(relativeTime.match(/^(\d+)分鐘前$/)[1]);
          const publishedAtTimestamp =
            currentTime.getTime() - minutesAgo * 60000;

          let category =
            item.querySelector('.category')?.textContent?.trim() || '';
          if (category.startsWith('即時')) {
            category = category.slice(2);
          }
          const image = item.querySelector('img')?.src || '';
          console.log(
            '星島日報image',
            image,
            '星島TITLE',
            item.querySelector('.title')?.textContent?.trim() || '',
            '星category',
            category,
          );
          return {
            title: item.querySelector('.title')?.textContent?.trim() || '',
            category: category,
            url: item.querySelector('a')?.href || '',
            image: image,
            source: '星島日報',
            publishedAtTimestamp,
          };
        })
        .filter((article) => article != null);
    });

    await browser.close();

    return articles;
  }
}
