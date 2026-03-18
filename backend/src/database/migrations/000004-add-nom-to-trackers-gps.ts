import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 000004: Add nom column to trackers_gps table
 *
 * Adds a human-readable name field to GPS trackers for easier identification.
 */
export class AddNomToTrackersGps1000000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trackers_gps
      ADD COLUMN IF NOT EXISTS nom VARCHAR(100);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trackers_gps DROP COLUMN IF EXISTS nom;
    `);
  }
}
