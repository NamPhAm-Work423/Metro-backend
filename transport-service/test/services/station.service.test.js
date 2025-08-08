const models = require('../../src/models/index.model');
const { Station, RouteStation, Stop } = models;
const stationService = require('../../src/services/station.service');

describe('station.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createStation creates station', async () => {
    const payload = { name: 'A' };
    const created = { stationId: 's1', ...payload };
    Station.create.mockResolvedValue(created);
    const result = await stationService.createStation(payload);
    expect(Station.create).toHaveBeenCalledWith(payload);
    expect(result).toBe(created);
  });

  test('getAllStations applies filters', async () => {
    await stationService.getAllStations({ isActive: true, location: 'C', name: 'X' });
    expect(Station.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object) }));
  });

  test('getStationById returns station', async () => {
    const station = { stationId: 's1' };
    Station.findByPk.mockResolvedValue(station);
    const result = await stationService.getStationById('s1');
    expect(result).toBe(station);
  });

  test('getStationById throws when not found', async () => {
    Station.findByPk.mockResolvedValue(null);
    await expect(stationService.getStationById('missing')).rejects.toThrow('Station not found');
  });

  test('updateStation updates and returns', async () => {
    const instance = { update: jest.fn().mockResolvedValue({ stationId: 's1' }) };
    Station.findByPk.mockResolvedValue(instance);
    const result = await stationService.updateStation('s1', { name: 'B' });
    expect(instance.update).toHaveBeenCalledWith({ name: 'B' });
    expect(result).toEqual({ stationId: 's1' });
  });

  test('deleteStation destroys and returns message', async () => {
    const instance = { destroy: jest.fn().mockResolvedValue(1) };
    Station.findByPk.mockResolvedValue(instance);
    const result = await stationService.deleteStation('s1');
    expect(instance.destroy).toHaveBeenCalled();
    expect(result).toEqual({ message: 'Station deleted successfully' });
  });

  test('getActiveStations returns list', async () => {
    Station.findAll.mockResolvedValue([]);
    await stationService.getActiveStations();
    expect(Station.findAll).toHaveBeenCalled();
  });

  test('getStationsByOperatingHours returns list', async () => {
    Station.findAll.mockResolvedValue([]);
    await stationService.getStationsByOperatingHours('10:00');
    expect(Station.findAll).toHaveBeenCalled();
  });

  test('updateStationFacilities updates', async () => {
    const instance = { update: jest.fn().mockResolvedValue({ stationId: 's1' }) };
    Station.findByPk.mockResolvedValue(instance);
    const result = await stationService.updateStationFacilities('s1', ['wifi']);
    expect(instance.update).toHaveBeenCalledWith({ facilities: ['wifi'] });
    expect(result).toEqual({ stationId: 's1' });
  });
});


