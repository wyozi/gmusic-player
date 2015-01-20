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
var BufferList = require('bl');
var stream = require('stream');
var util = require ("util");

var NodeCache = require("node-cache");

require('freeport')(function(err, port) {
    console.log("Music stream server listening on port ", port);
    http.createServer(httpListener).listen(port);

    MusicStreamServerPort = port; // TODO this is a hack
})

var MusicCache = new NodeCache();

function httpListener(req, res) {
    var qs = querystring.parse(url.parse(req.url).query);

    // If the request was merely a hint for the server to cache the song if it's not cached
    // We don't actually need to server the song data
    var cacheHint = qs.cacheHint != undefined;

    if (qs.songId != undefined && qs.songUrl != undefined) {
        var songId = qs.songId;
        var songUrl = new Buffer(qs.songUrl, 'base64').toString('ascii');

        // Check if music exists in music cache
        // If it does, we can easily give user any part of the song (using http header 'range')
        var cachedMusic = MusicCache.get(songId);
        if (cachedMusic[songId] != undefined) {

            if (cacheHint) {
                res.writeHead(200);
                res.end();
                return;
            }

            var data = cachedMusic[songId];
            console.log("Using cached " + songId + " (len: " + data.getBuffer().length + ")");
            var header = {};

            header['Content-Type'] = 'audio/mpeg';

            // If user is requesting a range
            if (typeof req.headers.range !== 'undefined') {
                var range = req.headers.range;
                var parts = range.replace(/bytes=/, "").split("-");
                var partialstart = parts[0];
                var partialend = parts[1];

                var fullLength = data.getBuffer().length;
                var readableLength = data.readBytes;

                var start = parseInt(partialstart, 10);
                var fullEnd = partialend ? parseInt(partialend, 10) : fullLength-1;

                header["Content-Range"] = "bytes " + start + "-" + fullEnd + "/" + fullLength;
                header["Accept-Ranges"] = "bytes";
                header["Connection"] = "close";

                var sliced = data.getBuffer().slice(start, fullEnd+1);

                header["Content-Length"] = (fullEnd-start)+1;

                console.debug("Serving user cached song. Range: ", header["Content-Range"], "; Length: ", (fullEnd-start)+1, "; RealLength: ", header["Content-Length"]);

                res.writeHead(206, header);
                res.write(sliced, "binary");
                res.end();
            }
            else {
                var buf = data.getBuffer();
                header["Content-Length"] = buf.length;

                res.writeHead(200, header);
                res.write(buf, "binary");
                res.end();
            }
        }
        else {
            // Music not cached, let's fetch it

            var data;

            var x = request({url: songUrl, encoding: null});

            x.on('response', function(response) {
                var size = parseInt(response.headers['content-length']);
                // Now that we know the song size in bytes, we can create a buffer list
                data = new SongData(size);

                // Update cache pointer
                MusicCache.set(songId, data);

                if (cacheHint) {
                    console.debug("Got a cache hint to cache " + songId);

                    res.writeHead(200);
                    res.end();
                }
                else {
                    console.debug("Caching " + songId);

                    res.writeHead(206, {
                        'content-type': response.headers['content-type'],
                        'content-length': response.headers['content-length'],
                        'content-range': 'bytes 0-' + (response.headers['content-length']-1) + '/' + response.headers['content-length'],
                        'accept-ranges': 'bytes',
                        'connection': 'close'
                    });
                }
            });

            var pt = new stream.PassThrough();

            pt.on('data', function(chunk) {
                data.append(chunk);

                if (!cacheHint) res.write(chunk);
            });
            pt.on('end', function() {
                if (data.getBuffer().length == 0) {
                    console.log("on'end' returned data with 0 length for " + songId + ", not caching")
                }
                else {
                    console.debug("Cached song " + songId + " (len: " + data.getBuffer().length + ")");
                }

                if (!cacheHint) res.end();
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

function SongData(size) {
    this._buffer = new Buffer(size);
    this._stream = new stream.PassThrough();
    this._readBytes = 0;
}

SongData.prototype.getBuffer = function() {
    return this._buffer;
}

SongData.prototype.append = function(buf) {
    buf.copy(this._buffer, this._readBytes);
    this._readBytes += buf.length;

    this._stream.write(buf);
}

SongData.prototype.onData = function(cb) {
    this._stream.on('data', cb);
}
