import { createDatabaseConnectionConfig } from './prisma.service.js';

describe('createDatabaseConnectionConfig', () => {
  it('requires certificate verification for sslmode=require', () => {
    expect(
      createDatabaseConnectionConfig(
        'postgresql://admin:secret@db.example.com:5433/catalog?sslmode=require',
      ),
    ).toEqual({
      host: 'db.example.com',
      port: 5433,
      user: 'admin',
      password: 'secret',
      database: 'catalog',
      ssl: { rejectUnauthorized: true },
    });
  });

  it('requires certificate verification for sslmode=verify-full', () => {
    expect(
      createDatabaseConnectionConfig(
        'postgresql://admin:secret@db.example.com/catalog?sslmode=verify-full',
      ).ssl,
    ).toEqual({ rejectUnauthorized: true });
  });

  it('leaves a local connection non-SSL when no mode is configured', () => {
    expect(
      createDatabaseConnectionConfig('postgresql://postgres@localhost/catalog'),
    ).toMatchObject({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      database: 'catalog',
      ssl: undefined,
    });
  });

  it('supports an explicit local sslmode=disable', () => {
    expect(
      createDatabaseConnectionConfig(
        'postgresql://postgres@localhost/catalog?sslmode=disable',
      ).ssl,
    ).toBe(false);
  });

  it.each([
    [undefined, 'DATABASE_URL is not set'],
    ['', 'DATABASE_URL is not set'],
    ['not-a-url', 'DATABASE_URL must be a valid PostgreSQL connection URL'],
    ['mysql://user:pass@localhost/catalog', 'protocol'],
    ['postgresql://user:pass@localhost', 'host and database name'],
    ['postgresql://user:pass@localhost/catalog?sslmode=no-verify', 'no-verify'],
    ['postgresql://user:pass@localhost/catalog?sslmode=prefer', 'prefer'],
  ])('rejects malformed or unsafe config %p', (url, message) => {
    expect(() => createDatabaseConnectionConfig(url)).toThrow(message);
  });

  it('does not expose database credentials in configuration errors', () => {
    const secret = 'do-not-log-this-password';
    const url = `postgresql://admin:${secret}@localhost/catalog?sslmode=${secret}`;

    expect(() => createDatabaseConnectionConfig(url)).toThrow(
      /unsupported sslmode/,
    );

    try {
      createDatabaseConnectionConfig(url);
    } catch (error) {
      expect(String(error)).not.toContain(secret);
      expect(String(error)).not.toContain('admin');
    }
  });
});
