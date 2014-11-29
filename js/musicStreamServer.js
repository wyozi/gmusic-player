/**
* The audio player directive used to use direct link from GMusic.getStreamUrl to
* set the audio.src, which resulted in problems like inability to seek to beginning of the song and
* music sometimes stopping prematurely because node-webkit's audio element's preload is not enough.
*
* This file attempts to solve these problems by hosting a local HTTP server that fetches the whole song
* instantly using node.js. Fetching the whole file instead of only part makes sure the file does not disappear
* in between. Using a music server also makes seeking to another part of the song possible.
*
* TODO the audio player should be able to pass a parameter that immediately stops fetching process
*      so if songs are changed every few seconds we should not fetch all of them
*/

var http = require('http');
var request = require('request');
var url = require('url');
var querystring = require('querystring');
var bl = require('bl');
var stream = require('stream');

var NodeCache = require("node-cache");

require('freeport')(function(err, port) {
    console.log("Music stream server listening on port ", port);
    http.createServer(httpListener).listen(port);

    MusicStreamServerPort = port; // TODO this is a hack
})

var MusicCache = new NodeCache();

function httpListener(req, res) {
    var qs = querystring.parse(url.parse(req.url).query);

    if (qs.songId != undefined && qs.songUrl != undefined) {
        var songId = qs.songId;
        var songUrl = new Buffer(qs.songUrl, 'base64').toString('ascii');

        // Check if music exists in music cache
        // If it does, we can easily give user any part of the song (using http header 'range')
        var cachedMusic = MusicCache.get(songId);
        if (cachedMusic[songId] != undefined) {
            var buf = cachedMusic[songId];

            console.log("Using cached " + songId + " (len: " + buf.length + ")");
            var header = {};

            header['Content-Type'] = 'audio/mpeg';

            // If user is requesting a range
            if (typeof req.headers.range !== 'undefined') {
                var range = req.headers.range;
                var parts = range.replace(/bytes=/, "").split("-");
                var partialstart = parts[0];
                var partialend = parts[1];

                var total = buf.length;

                var start = parseInt(partialstart, 10);
                var end = partialend ? parseInt(partialend, 10) : total-1;

                header["Content-Range"] = "bytes " + start + "-" + end + "/" + (total);
                header["Accept-Ranges"] = "bytes";
                header["Content-Length"]= (end-start)+1;
                header["Connection"] = "close";

                var sliced = buf.slice(start, end);

                res.writeHead(206, header);
                res.write(sliced, "binary");
                res.end();
            }
            else {
                res.writeHead(200, header);
                res.write(buf, "binary");
                res.end();
            }
        }
        else {
            // Music not cached, let's fetch it
            var buf = bl();

            // we can set cache here, it is stored by reference anyway
            MusicCache.set(songId, buf);

            var x = request({url: songUrl, encoding: null});

            x.on('response', function(response) {
                res.writeHead(206, {
                    'content-type': response.headers['content-type'],
                    'content-length': response.headers['content-length'],
                    'content-range': 'bytes 0-' + (response.headers['content-length']-1) + '/' + response.headers['content-length'],
                    'accept-ranges': 'bytes',
                    'connection': 'close'
                });
            });

            var pt = new stream.PassThrough();

            pt.on('data', function(chunk) {
                buf.append(chunk);
                res.write(chunk);
            });
            pt.on('end', function() {
                if (buf.length == 0) {
                    console.log("on'end' returned buf with 0 length for " + songId + ", not caching")
                }
                else {
                    console.log("Cached song " + songId + " (len: " + buf.length + ")");
                }
                res.end();
            });

            x.pipe(pt);
        }
    }
    else {
        // If music stream server is not passed any params, we show an example mp3
        // useful for testing.
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('<audio controls><source src="?songId=example&songUrl=' + new Buffer('https://dl.dropboxusercontent.com/u/18458187/metropol.mp3').toString('base64') + '" type="audio/mpeg"></audio>\n');
    }
}
