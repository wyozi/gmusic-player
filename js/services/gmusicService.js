var PlayMusic = require("playmusic");
var fs = require("fs");

var pm = new PlayMusic();

function GMusic() {
}


GMusic.prototype.login = function(callback) {
    var creds = JSON.parse(fs.readFileSync("credentials.txt", "utf8"));

    pm.init({email: creds.email, password: creds.password}, function() {
        callback();
    });
}

GMusic.prototype.fetchPlaylists = function(callback) {
    pm.getPlayLists(function(data) {
        callback(data.data.items);
    });
}

function parseTrackObject(trackobj, trackid) {
    return {
        id: trackid,

        albumart: trackobj.albumArtRef.length > 0 ? trackobj.albumArtRef[0].url : "",
        artist: trackobj.artist,
        album: trackobj.album,
        title: trackobj.title
    }
}

GMusic.prototype.fetchPlaylistSongs = function(playlistid, callback) {
    pm.getPlayListEntries(function(data) {
        var thisPlEntries = data.data.items.filter(function(entry) {
            return entry.playlistId == playlistid;
        }).filter(function(e) { return e.track != undefined; }).map(function(entry) {
            var track = entry.track;
            return parseTrackObject(track, entry.trackId);
        });

        callback(thisPlEntries);
    });
}

GMusic.prototype.getStreamUrl = function(trackid, callback) {
    pm.getStreamUrl(trackid, callback);
}

GMusic.prototype.search = function(query, callback) {
    pm.search(query, 25, function(data) {
        var songs = data.entries.sort(function(a, b) {
            return a.score < b.score;
        }).map(function(res) {
            var ret = {};

            ret.score = res.score;

            if (res.type == "1") {
                ret.type = "track";
                ret.track = parseTrackObject(res.track, res.track.nid);
            }
            else if (res.type == "2") {
                ret.type = "artist";
                ret.artist = res.artist;
            }
            else if (res.type == "3") {
                ret.type = "album";
                ret.album = res.album;
            }

            return ret;
        });
        callback(songs);
    }, function(err) {
        console.log(err);
    });
}

angular.module('gmusicService', []).service('GMusic', GMusic);
