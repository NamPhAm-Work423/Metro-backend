const models = require('../../src/models/index.model');
const { Stop } = models;
const stopService = require('../../src/services/stop.service');

describe('stop.service extra', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getStopsByTimeRange returns list', async () => {
    Stop.findAll.mockResolvedValue([]);
    const result = await stopService.getStopsByTimeRange('08:00', '09:00', 'Monday');
    expect(Stop.findAll).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  test('getNextStopsAtStation applies limit', async () => {
    Stop.findAll.mockResolvedValue([]);
    const result = await stopService.getNextStopsAtStation('st1', '08:00', 'Monday', 3);
    expect(Stop.findAll).toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});


