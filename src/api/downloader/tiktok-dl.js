const axios = require('axios');

async function getTokenAndCookie() {
  const res = await axios.get('https://tmate.cc/id', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  const cookie = res.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';
  const tokenMatch = res.data.match(/<input[^>]+name="token"[^>]+value="([^"]+)"/i);
  const token = tokenMatch?.[1];

  if (!token) throw new Error('Gagal ambil token.');
  return { token, cookie };
}

async function downloadTikTok(tiktokUrl) {
  const { token, cookie } = await getTokenAndCookie();

  const params = new URLSearchParams();
  params.append('url', tiktokUrl);
  params.append('token', token);

  const res = await axios.post('https://tmate.cc/action', params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'https://tmate.cc/id',
      'Origin': 'https://tmate.cc',
      'Cookie': cookie
    }
  });

  const html = res.data?.data;
  if (!html) throw new Error('Gagal ambil data.');

  const title = html.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() || 'Tanpa Judul';

  const matches = [...html.matchAll(/<a[^>]+href="(https:\/\/[^"]+)"[^>]*>\s*<span>\s*<span>([^<]*)<\/span><\/span><\/a>/gi)];
  const seen = new Set();
  const links = matches
    .map(([_, href, label]) => ({ href, label: label.trim() }))
    .filter(({ href }) => !href.includes('play.google.com') && !seen.has(href) && seen.add(href));

  const mp4Links = links.filter(v => /download without watermark/i.test(v.label));
  const mp3Link = links.find(v => /download mp3 audio/i.test(v.label));

  const imageMatches = [...html.matchAll(/<img[^>]+src="(https:\/\/tikcdn\.app\/a\/images\/[^"]+)"/gi)];
  const imageLinks = [...new Set(imageMatches.map(m => m[1]))];

  if (mp4Links.length > 0) {
    return {
      type: 'video',
      title,
      mp4Links,
      mp3Link
    };
  }

  if (imageLinks.length > 0) {
    return {
      type: 'image',
      title,
      images: imageLinks,
      mp3Link
    };
  }

  throw new Error('Gagal mengenali konten, mungkin link salah.');
}

module.exports = function(app) {
  app.get('/downloader/tiktok', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ status: false, message: 'Parameter `url` TikTok wajib diisi.' });
    }

    try {
      const result = await downloadTikTok(url);
      res.status(200).json({ status: true, result });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });
};