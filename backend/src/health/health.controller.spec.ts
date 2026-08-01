import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const count = jest.fn();
  const controller = new HealthController({
    category: { count },
  } as never);

  beforeEach(() => {
    count.mockReset();
    jest.restoreAllMocks();
  });

  it('returns ok after a database-backed probe succeeds', async () => {
    count.mockResolvedValue(41);

    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
    expect(count).toHaveBeenCalledWith();
  });

  it('returns a service-unavailable error without exposing database details', async () => {
    count.mockRejectedValue(new Error('database connection string'));
    const errorLog = jest.spyOn(console, 'error').mockImplementation();

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(controller.check()).rejects.toThrow('Service unavailable');
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('health_check_failed'),
    );
    expect(errorLog.mock.calls[0][0]).not.toContain('connection string');
  });
});
