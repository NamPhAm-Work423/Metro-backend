const models = require('../../src/models/index.model');
const { Station } = models;
const service = require('../../src/services/station.service');

describe('station.service error paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createStation rejects', async () => {
    Station.create.mockRejectedValue(new Error('db'));
    await expect(service.createStation({})).rejects.toThrow('db');
  });

  test('getAllStations rejects', async () => {
    Station.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getAllStations({})).rejects.toThrow('db');
  });

  test('getStationById rejects', async () => {
    Station.findByPk.mockRejectedValue(new Error('db'));
    await expect(service.getStationById('x')).rejects.toThrow('db');
  });

  test('updateStation not found', async () => {
    Station.findByPk.mockResolvedValue(null);
    await expect(service.updateStation('x', {})).rejects.toThrow('Station not found');
  });

  test('updateStation rejects', async () => {
    Station.findByPk.mockRejectedValue(new Error('db'));
    await expect(service.updateStation('x', {})).rejects.toThrow('db');
  });

  test('deleteStation not found', async () => {
    Station.findByPk.mockResolvedValue(null);
    await expect(service.deleteStation('x')).rejects.toThrow('Station not found');
  });

  test('deleteStation rejects', async () => {
    Station.findByPk.mockRejectedValue(new Error('db'));
    await expect(service.deleteStation('x')).rejects.toThrow('db');
  });

  test('getActiveStations rejects', async () => {
    Station.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getActiveStations()).rejects.toThrow('db');
  });

  test('getStationsByOperatingHours rejects', async () => {
    Station.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getStationsByOperatingHours('10:00')).rejects.toThrow('db');
  });

  test('updateStationFacilities not found', async () => {
    Station.findByPk.mockResolvedValue(null);
    await expect(service.updateStationFacilities('x', [])).rejects.toThrow('Station not found');
  });

  test('updateStationFacilities rejects', async () => {
    Station.findByPk.mockRejectedValue(new Error('db'));
    await expect(service.updateStationFacilities('x', [])).rejects.toThrow('db');
  });
});


