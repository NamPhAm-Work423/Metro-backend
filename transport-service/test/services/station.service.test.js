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



// Additional positive cases (previously in extra file)
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

// Error paths (previously in extra2 file)
describe('station.service error paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createStation rejects', async () => {
    Station.create.mockRejectedValue(new Error('db'));
    await expect(stationService.createStation({})).rejects.toThrow('db');
  });

  test('getAllStations rejects', async () => {
    Station.findAll.mockRejectedValue(new Error('db'));
    await expect(stationService.getAllStations({})).rejects.toThrow('db');
  });

  test('getStationById rejects', async () => {
    Station.findByPk.mockRejectedValue(new Error('db'));
    await expect(stationService.getStationById('x')).rejects.toThrow('db');
  });

  test('updateStation not found', async () => {
    Station.findByPk.mockResolvedValue(null);
    await expect(stationService.updateStation('x', {})).rejects.toThrow('Station not found');
  });

  test('updateStation rejects', async () => {
    Station.findByPk.mockRejectedValue(new Error('db'));
    await expect(stationService.updateStation('x', {})).rejects.toThrow('db');
  });

  test('deleteStation not found', async () => {
    Station.findByPk.mockResolvedValue(null);
    await expect(stationService.deleteStation('x')).rejects.toThrow('Station not found');
  });

  test('deleteStation rejects', async () => {
    Station.findByPk.mockRejectedValue(new Error('db'));
    await expect(stationService.deleteStation('x')).rejects.toThrow('db');
  });

  test('getActiveStations rejects', async () => {
    Station.findAll.mockRejectedValue(new Error('db'));
    await expect(stationService.getActiveStations()).rejects.toThrow('db');
  });

  test('getStationsByOperatingHours rejects', async () => {
    Station.findAll.mockRejectedValue(new Error('db'));
    await expect(stationService.getStationsByOperatingHours('10:00')).rejects.toThrow('db');
  });

  test('updateStationFacilities not found', async () => {
    Station.findByPk.mockResolvedValue(null);
    await expect(stationService.updateStationFacilities('x', [])).rejects.toThrow('Station not found');
  });

  test('updateStationFacilities rejects', async () => {
    Station.findByPk.mockRejectedValue(new Error('db'));
    await expect(stationService.updateStationFacilities('x', [])).rejects.toThrow('db');
  });
});