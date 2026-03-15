import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 000003: Add missing columns for enterprise feedback points
 *
 * - montant_carburant on bons_transport (Point 9: fuel cost on transport bons)
 * - type_fournisseur on fournisseurs (Point 2: fournisseur type classification)
 */
export class AddMissingColumns1000000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Point 9: Fuel cost tracking on transport bons
    await queryRunner.query(`
      ALTER TABLE bons_transport
      ADD COLUMN IF NOT EXISTS montant_carburant DECIMAL(12,2) DEFAULT 0;
    `);

    // Point 2: Fournisseur type classification
    await queryRunner.query(`
      ALTER TABLE fournisseurs
      ADD COLUMN IF NOT EXISTS type_fournisseur VARCHAR(20) DEFAULT 'GENERAL';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bons_transport DROP COLUMN IF EXISTS montant_carburant;
    `);
    await queryRunner.query(`
      ALTER TABLE fournisseurs DROP COLUMN IF EXISTS type_fournisseur;
    `);
  }
}
