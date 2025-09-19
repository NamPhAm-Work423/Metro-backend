module.exports = {
  connect: jest.fn().mockResolvedValue(),
  disconnect: jest.fn().mockResolvedValue(),
  send: jest.fn().mockResolvedValue(),
  ensureTopic: jest.fn().mockResolvedValue(),
  isConnected: jest.fn(() => true),
};


