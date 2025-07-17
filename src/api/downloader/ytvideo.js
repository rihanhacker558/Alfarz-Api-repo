const axios = require('axios');

module.exports = function(app) {
  app.get('/downloader/ytmp4', async (req, res) => {
    const { url, quality } = req.query;

    if (!url || !quality) {
      return res.status(400).json({
        status: false,
        message: 'Parameter `url` dan `quality` harus diisi.'
      });
    }

    try {
      const { data } = await axios.post(
        'https://api.ytmp4.fit/api/download',
        { url, quality },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': 'https://ytmp4.fit',
            'Referer': 'https://ytmp4.fit/'
          },
          timeout: 20000 // Timeout 20 detik
        }
      );

      if (!data?.url) {
        return res.status(500).json({
          status: false,
          message: 'Gagal mendapatkan link download.'
        });
      }

      res.status(200).json({
        status: true,
        download: {
          quality,
          url: data.url
        }
      });

    } catch (err) {
      const isAbort = err.code === 'ERR_CANCELED';
      res.status(500).json({
        status: false,
        message: isAbort ? 'Permintaan dibatalkan (abort)' : err.message
      });
    }
  });
};