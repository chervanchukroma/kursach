const fsPromises = require('fs').promises;
const path = require('path');
const { Command } = require('commander');
const http = require('http');
const superagent = require('superagent');

const program = new Command();

// Оголошуємо опції командного рядка
program
    .requiredOption('-h, --host <host>', 'server host')
    .requiredOption('-p, --port <port>', 'server port')
    .requiredOption('-c, --cache <cache>', 'cache directory');

program.parse(process.argv);
const options = program.opts();

const cacheDir = options.cache;

// Створюємо сервер
const server = http.createServer(async (req, res) => {
    const code = req.url.substring(1);
    const filePath = path.join(cacheDir, `${code}.jpg`);

    if (req.method === 'GET') {
        try {
            const data = await fsPromises.readFile(filePath);
            // Set the correct Content-Type header for images
            res.writeHead(200, { 'Content-Type': 'image/jpeg' }); // Use jpeg extension
            res.end(data);
        } catch (err) {
            // Handle error: fetch from http.cat
            try {
                const response = await superagent.get(`https://http.cat/${code}`);
                await fsPromises.writeFile(filePath, response.body);
                res.writeHead(200, { 'Content-Type': 'image/jpeg' }); // Set jpeg for fetched image
                res.end(response.body);
            } catch (error) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Image not found on http.cat');
            }
        }
    } else if (req.method === 'PUT') {
        let body = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', async () => {
            try {
                await fsPromises.writeFile(filePath, Buffer.concat(body));
                res.writeHead(201, { 'Content-Type': 'text/plain' }); // Text for PUT response
                res.end('Image saved');
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        });
    } else if (req.method === 'DELETE') {
        try {
            await fsPromises.unlink(filePath);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Image deleted');
        } catch (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Image not found');
            } else {
                console.error('Error deleting image:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        }
    }
});

server.listen(options.port, options.host, () => {
    console.log(`Server running at http://${options.host}:${options.port}/`);
});
server.on('error', (err) => {
    console.error('Server error:', err);
});