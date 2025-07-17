const axios = require('axios');

module.exports = function(app) {
  app.get('/downloader/ytmp4', async (req, res) => {
    const { url, quality } = req.query;

    if (!url) {
      return res.status(400).json({ status: false, message: 'Parameter `url` wajib.' });
    }

    try {
      const { data: info } = await axios.post('https://api.ytmp4.fit/api/video-info', { url }, {
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://ytmp4.fit',
          'Referer': 'https://ytmp4.fit/'
        }
      });

      if (!info || !info.title) {
        return res.status(500).json({ status: false, message: 'Gagal ambil info video.' });
      }

      // Jika user minta link download
      if (quality) {
        const { data: download } = await axios.post('https://api.ytmp4.fit/api/download', { url, quality }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': 'https://ytmp4.fit',
            'Referer': 'https://ytmp4.fit/'
          }
        });

        if (!download?.url) {
          return res.status(500).json({ status: false, message: 'Gagal ambil link download.' });
        }

        return res.status(200).json({
          status: true,
          info,
          download: {
            quality,
            url: download.url
          }
        });
      }

      // Kalau tidak ada quality, kirim info saja
      res.status(200).json({ status: true, info });

    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });
};
