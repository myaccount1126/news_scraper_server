import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CategoryEntity } from '../category/category.entity';

@Entity('articles')
export class ArticleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 350 })
  title: string;

  @Column({ length: 450 })
  url: string;

  @Column({ length: 255 })
  image: string;

  @Column({ length: 100 })
  source: string;

  @ManyToOne(() => CategoryEntity, (category) => category.articles)
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity;

  @Column({ name: 'category_id' })
  categoryId: number;

  @Column({ type: 'timestamp', name: 'published_at' })
  publishedAt: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
