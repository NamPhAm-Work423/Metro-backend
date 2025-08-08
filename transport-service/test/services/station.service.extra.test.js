const models = require('../../src/models/index.model');
const { Station } = models;
const stationService = require('../../src/services/station.service');

describe('station.service extra', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getAllStations filters and returns list', async () => {
    Station.findAll.mockResolvedValue([]);
    await stationService.getAllStations({ isActive: true, location: 'A', name: 'Main' });
    expect(Station.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object) }));
  });

  test('getActiveStations returns active list', async () => {
    Station.findAll.mockResolvedValue([]);
    const result = await stationService.getActiveStations();
    expect(Station.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
    expect(result).toEqual([]);
  });

  test('getStationsByOperatingHours applies time filters', async () => {
    Station.findAll.mockResolvedValue([]);
    const now = new Date().toISOString();
    const result = await stationService.getStationsByOperatingHours(now);
    expect(Station.findAll).toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});


