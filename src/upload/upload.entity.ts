import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Upload {
  @PrimaryGeneratedColumn()
  id: number;

    @Column({ unique: true })
    filename: string;

  @Column()
  size: number;

  @Column()
  status: string;

  @Column({ nullable: true })
  md5: string;

  @Column({ nullable: true })
  sha256: string;

  @Column({ nullable: true })
  updatedAt: Date;
}
