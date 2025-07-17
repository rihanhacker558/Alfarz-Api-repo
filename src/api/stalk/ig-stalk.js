const axios = require('axios');
const express = require('express');

module.exports = function (app) {
  app.get('/ig/stalk', async (req, res) => {
    const username = req.query.username;

    if (!username) {
      return res.status(400).json({ error: true, message: 'Parameter `username` wajib diisi' });
    }

    try {
      const formData = new URLSearchParams();
      formData.append('profile', username);

      const profileRes = await axios.post('https://tools.xrespond.com/api/instagram/profile-info', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'origin': 'https://bitchipdigital.com',
          'referer': 'https://bitchipdigital.com/',
          'user-agent': 'Mozilla/5.0',
        }
      });

      const raw = profileRes.data?.data?.data;
      if (!raw || profileRes.data.status !== 'success') {
        return res.status(500).json({ error: true, message: 'Gagal mendapatkan data profil' });
      }

      const followers = raw.follower_count ?? 0;

      const postsForm = new URLSearchParams();
      postsForm.append('profile', username);

      const postsRes = await axios.post('https://tools.xrespond.com/api/instagram/media/posts', postsForm.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'origin': 'https://bitchipdigital.com',
          'referer': 'https://bitchipdigital.com/',
          'user-agent': 'Mozilla/5.0',
        }
      });

      const items = postsRes.data?.data?.data?.items || [];

      let totalLike = 0;
      let totalComment = 0;

      for (const post of items) {
        totalLike += post.like_count || 0;
        totalComment += post.comment_count || 0;
      }

      const totalEngagement = totalLike + totalComment;
      const averageEngagementRate = followers > 0 && items.length > 0
        ? ((totalEngagement / items.length) / followers) * 100
        : 0;

      const result = {
        username: raw.username || '-',
        name: raw.full_name || '-',
        bio: raw.biography || '-',
        followers,
        following: raw.following_count ?? null,
        posts: raw.media_count ?? null,
        profile_pic: raw.hd_profile_pic_url_info?.url || raw.profile_pic_url_hd || '',
        verified: raw.is_verified || raw.show_blue_badge_on_main_profile || false,
        engagement_rate: parseFloat(averageEngagementRate.toFixed(2))
      };

      res.status(200).json({ status: true, result });

    } catch (err) {
      res.status(500).json({ error: true, message: err.message });
    }
  });
};
