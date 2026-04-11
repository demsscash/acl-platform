import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 000006: Add etat column to lignes_entrees_stock
 *
 * Point 16 - Allow tracking whether incoming parts are new or used
 * (NEUVE | OCCASION) when creating stock entries.
 *
 * This column was added to the LigneEntreeStock entity in commit 3360ac4
 * but no migration was created at that time, causing TypeORM SELECT queries
 * that load LigneEntreeStock (e.g. the export module's getEntreesStock)
 * to fail with "column etat does not exist". As a side effect the entire
 * /export/stats endpoint returned 500 and the Export Comptabilité page
 * showed all zeros even when data was present.
 */
export class AddEtatToLignesEntreesStock1000000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lignes_entrees_stock
      ADD COLUMN IF NOT EXISTS etat VARCHAR(20) NOT NULL DEFAULT 'NEUVE';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lignes_entrees_stock DROP COLUMN IF EXISTS etat;
    `);
  }
}
