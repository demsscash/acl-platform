import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 000005: Fix enum value mismatches
 *
 * - Fixes RoleUtilisateur: MAINTENANCIEN -> MAINTENANCIER
 * - Adds missing CE value to TypePermis enum
 */
export class FixEnumValues1000000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix RoleUtilisateur enum: rename MAINTENANCIEN to MAINTENANCIER
    await queryRunner.query(`
      ALTER TYPE role_utilisateur RENAME VALUE 'MAINTENANCIEN' TO 'MAINTENANCIER';
    `).catch(async () => {
      // If RENAME VALUE is not supported (PG < 10) or value already correct, try alternative
      // Check if MAINTENANCIER already exists
      const result = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'MAINTENANCIER'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'role_utilisateur')
        ) as exists;
      `);
      if (!result[0]?.exists) {
        await queryRunner.query(`ALTER TYPE role_utilisateur ADD VALUE IF NOT EXISTS 'MAINTENANCIER';`);
        // Update any existing rows
        await queryRunner.query(`UPDATE users SET role = 'MAINTENANCIER' WHERE role = 'MAINTENANCIEN';`);
      }
    });

    // Add missing CE value to TypePermis enum
    await queryRunner.query(`
      ALTER TYPE type_permis ADD VALUE IF NOT EXISTS 'CE';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Enum value removal is not straightforward in PostgreSQL
    // In practice, we leave the values in place
  }
}
