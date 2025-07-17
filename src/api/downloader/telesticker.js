const axios = require('axios');

async function telestick(url) {
  const botToken = '7935827856:AAGdbLXArulCigWyi6gqR07gi--ZPm7ewhc'; // Jangan disebar ke publik kalau bukan bot dummy/test
  const baseURL = `https://api.telegram.org/bot${botToken}`;

  const match = url.match(/https:\/\/t\.me\/addstickers\/([^\/\?#]+)/);
  if (!match) throw new Error('URL Telegram Sticker tidak valid.');

  const setName = match[1];

  const { data: stickerSet } = await axios.get(`${baseURL}/getStickerSet?name=${setName}`, {
    headers: {
      'user-agent': 'Mozilla/5.0'
    }
  });

  const stickers = await Promise.all(
    stickerSet.result.stickers.map(async (sticker) => {
      const { data: file } = await axios.get(`${baseURL}/getFile?file_id=${sticker.file_id}`, {
        headers: { 'user-agent': 'Mozilla/5.0' }
      });

      return {
        emoji: sticker.emoji,
        is_animated: sticker.is_animated,
        image_url: `https://api.telegram.org/file/bot${botToken}/${file.result.file_path}`
      };
    })
  );

  return {
    name: stickerSet.result.name,
    title: stickerSet.result.title,
    sticker_type: stickerSet.result.sticker_type,
    total: stickers.length,
    stickers
  };
}

module.exports = function (app) {
  app.get('/downloader/telestick', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ status: false, message: 'Parameter `url` diperlukan. Contoh: https://t.me/addstickers/packname' });
    }

    try {
      const result = await telestick(url);
      res.status(200).json({ status: true, result });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });
};