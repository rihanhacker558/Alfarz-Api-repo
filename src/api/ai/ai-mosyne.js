const axios = require('axios');
const FormData = require('form-data');

module.exports = function(app) {
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function uploadUguu(buffer, filename = 'image.jpg') {
        const form = new FormData();
        form.append('files[]', buffer, { filename });

        const { data } = await axios.post('https://uguu.se/upload.php', form, {
            headers: form.getHeaders()
        });

        const url = data?.files?.[0]?.url;
        if (!url) throw new Error('Upload ke Uguu gagal.');
        return url;
    }

    async function processMosyne(type, buffer) {
        const imageUrl = await uploadUguu(buffer);
        const user_id = 'user_test';
        const headers = {
            accept: 'application/json, text/plain, */*',
            'content-type': 'application/json',
            origin: 'https://mosyne.ai',
            referer: `https://mosyne.ai/ai/${type === 'remove_background' ? 'remove-bg' : 'upscaling'}`,
            'user-agent': 'Mozilla/5.0'
        };

        const endpoint = type === 'remove_background'
            ? 'https://mosyne.ai/api/remove_background'
            : 'https://mosyne.ai/api/upscale';

        const { data: uploadRes } = await axios.post(endpoint, { image: imageUrl, user_id }, { headers });

        const id = uploadRes.id;
        if (!id) throw new Error('Gagal mendapatkan ID.');

        const checkPayload = { id, type, user_id };

        for (let i = 0; i < 30; i++) {
            await delay(2000);

            const { data: statusRes } = await axios.post('https://mosyne.ai/api/status', checkPayload, { headers });

            if (statusRes.status === 'COMPLETED' && statusRes.image) {
                return statusRes.image;
            }

            if (statusRes.status === 'FAILED') {
                throw new Error('Proses Mosyne gagal.');
            }
        }

        throw new Error('Timeout menunggu proses Mosyne.');
    }

    app.post('/ai/mosyne', async (req, res) => {
        try {
            const type = req.query.type;
            if (!['remove_background', 'upscale'].includes(type)) {
                return res.status(400).json({ status: false, error: 'Parameter ?type=remove_background atau upscale dibutuhkan.' });
            }

            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);

            if (!buffer.length) {
                return res.status(400).json({ status: false, error: 'Gambar tidak ditemukan dalam body request.' });
            }

            const result = await processMosyne(type, buffer);
            res.status(200).json({ status: true, result });
        } catch (err) {
            res.status(500).json({ status: false, error: err.message });
        }
    });
};
