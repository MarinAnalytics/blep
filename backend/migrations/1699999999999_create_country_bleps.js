/* eslint-disable camelcase */

/** @param {import('node-pg-migrate').MigrationBuilder} pg */
export async function up(pg) {
  pg.createTable('country_bleps', {
    country_code: { type: 'varchar(8)', primaryKey: true, notNull: true },
    country_name: { type: 'text', notNull: true },
    bleps: { type: 'integer', notNull: true, default: 0 },
    updated_at: { type: 'timestamptz', notNull: true, default: pg.func('now()') }
  });
  pg.sql(`CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
  $$ LANGUAGE plpgsql;`);
  pg.sql(`CREATE TRIGGER trg_country_bleps_updated
    BEFORE UPDATE ON country_bleps
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();`);
  pg.sql(`CREATE UNIQUE INDEX IF NOT EXISTS country_bleps_code_idx ON country_bleps (country_code);`);
}

/** @param {import('node-pg-migrate').MigrationBuilder} pg */
export async function down(pg) {
  pg.sql('DROP TRIGGER IF EXISTS trg_country_bleps_updated ON country_bleps;');
  pg.sql('DROP FUNCTION IF EXISTS set_updated_at;');
  pg.dropTable('country_bleps');
}
