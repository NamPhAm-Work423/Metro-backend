const path = require('path');
const fs = require('fs');
const qrService = require('../services/qr.service');

class QRController {
    async getQR(req, res) {
        try {
            const ticketId = req.params.ticketId;
            if (!ticketId) return res.status(400).json({ message: 'ticketId is required' });

            // Try known extensions
            const exts = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
            for (const ext of exts) {
                const filePath = path.join(__dirname, '..', 'public', 'qr', `${ticketId}.${ext}`);
                if (fs.existsSync(filePath)) {
                    return res.json({ url: `/qr/${ticketId}.${ext}` });
                }
            }
            return res.status(404).json({ message: 'QR not found' });
        } catch (err) {
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = QRController;
