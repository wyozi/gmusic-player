var PlayMusic = require("playmusic");
var NodeCache = require("node-cache");
var fs = require("fs");
var addEvents = require("add-events");

function GMusic() {
    this.pm = new PlayMusic();
    this._cache = new NodeCache({stdTTL: 300, checkperiod: 0});

    globalGMusic = this;
}

addEvents(GMusic, ['loggedIn']);

GMusic.prototype.login = function(callback, errorcb) {
    var that = this;

    var creds = JSON.parse(fs.readFileSync("credentials.txt", "utf8"));

    this.pm.init({email: creds.email, password: creds.password}, function() {
        callback();
        that._emit('loggedIn');
    }, errorcb);
}

GMusic.prototype._checkCache = function(key, callback) {
    var cachedItem = this._cache.get(key);
    if (cachedItem[key] != undefined) {
        callback(cachedItem[key]);
        return true;
    }
    return false;
}

GMusic.prototype._isAllAccessSong = function(songid) {
    return songid.indexOf('T') == 0;
}

/**
* Parses a track object returned by 'playmusic' to a simpler version
*
* Track object schema: https://github.com/simon-weber/Unofficial-Google-Music-API/blob/develop/gmusicapi/protocol/mobileclient.py#L26
*/
GMusic.prototype._parseTrackObject = function(trackobj, trackid) {
    return {
        id: trackid || trackobj.nid,

        albumart: (trackobj.albumArtRef && trackobj.albumArtRef.length > 0) ? trackobj.albumArtRef[0].url : "",
        albumid: trackobj.albumId,

        artist: trackobj.artist,
        artistid: (trackobj.artistId && trackobj.artistId.length > 0) ? trackobj.artistId[0] : "",

        album: trackobj.album,
        title: trackobj.title
    }
}

GMusic.prototype.getPlaylists = function(callback, errorcb) {
    var that = this;

    if (!this._checkCache("playlists", callback)) {
        this.pm.getPlayLists(function(data) {
            that._cache.set("playlists", data.data.items);
            callback(data.data.items);
        }, errorcb);
    }
}

GMusic.prototype.getPlaylist = function(playlistId, callback, errorcb) {
    var that = this;

    var key = "playlists/" + playlistId;

    if (!this._checkCache(key, callback)) {
        this.getPlaylists(function(playlists) {
            for (var idx in playlists) {
                var pl = playlists[idx];
                if (pl.id == playlistId) {
                    that._cache.set(key, pl);
                    callback(pl);
                    break;
                }
            }
        }, errorcb);
    }
}

GMusic.prototype._getCachedLibrary = function(callback, errorcb) {
    var that = this;

    if (!this._checkCache("library", callback)) {
        this.pm.getLibrary(function(lib) {
            that._cache.set("library", lib.data.items);
            callback(lib.data.items);
        }, errorcb);
    }
}

GMusic.prototype.getPlaylistEntries = function(callback, errorcb) {
    var that = this;

    if (!this._checkCache("playlist-entries", callback)) {
        this.pm.getPlayListEntries(function(data) {
            that._cache.set("playlist-entries", data.data.items);
            callback(data.data.items);
        }, errorcb);
    }
}

GMusic.prototype.getPlaylistSongs = function(playlistid, callback, errorcb) {
    var that = this;

    var key = "playlist-songs/" + playlistid;

    if (!this._checkCache(key, callback)) {
        this.getPlaylistEntries(function(entries) {
            var rawPlaylistEntries = entries.filter(function(entry) {
                return entry.playlistId == playlistid;
            });

            var allAccessEntries = rawPlaylistEntries.filter(function(e) { return e.track != undefined; }).map(function(entry) {
                var track = entry.track;
                return that._parseTrackObject(track, entry.trackId);
            });

            var customEntryTrackIds = rawPlaylistEntries.filter(function(e) { return e.track == undefined; }).map(function(e) {
                return e.trackId;
            });

            // There are custom (self-uploaded) songs in this playlist, we need to query library
            if (customEntryTrackIds && customEntryTrackIds.length >= 0) {

                var rawPlaylistEntryPositions = {};
                rawPlaylistEntries.forEach(function(o) {
                    rawPlaylistEntryPositions[o.trackId] = o.absolutePosition;
                });

                that._getCachedLibrary(function(lib) {
                    var customEntries = lib.filter(function(e) {
                        return customEntryTrackIds.indexOf(e.id) != -1;
                    }).map(function(e) {
                        return that._parseTrackObject(e, e.id);
                    });

                    var allEntries = allAccessEntries.concat(customEntries).sort(function(a, b) {
                        return rawPlaylistEntryPositions[a.id] - rawPlaylistEntryPositions[b.id];
                    });

                    that._cache.set(key, allEntries);
                    callback(allEntries);
                }, errorcb);
            }
            else {
                that._cache.set(key, allAccessEntries);
                callback(allAccessEntries);
            }
        }, errorcb);
    }
}

GMusic.prototype.addSongToPlaylist = function(songId, playlistId, success, errorcb) {
    var that = this;

    this.pm.addTrackToPlayList(songId, playlistId, function(data) {
        // Invalidate playlist entry cache, so next time we get playlist entries, the new song will be there
        that._cache.del("playlist-entries");
        that._cache.del("playlist-songs/" + playlistId);

        that.pm.success(success, data);
    }, errorcb);
}

GMusic.prototype.removeSongFromPlaylist = function(songId, playlistId, success, errorcb) {
    var that = this;

    // Oh boy, we need to find playlist entry of the song
    this.getPlaylistEntries(function(entries) {
        var wasRemoved = false;

        entries.filter(function(e) {
            return e.trackId == songId && e.playlistId == playlistId;
        }).forEach(function(e) {
            that.pm.removePlayListEntry(e.id);
            wasRemoved = true;
        });

        // Invalidate playlist entry cache, so next time we get playlist entries, the song will no longer be there
        that._cache.del("playlist-entries");
        that._cache.del("playlist-songs/" + playlistId);

        that.pm.success(success, {removed: wasRemoved});
    }, errorcb);
}

GMusic.prototype.getSong = function(songId, callback, errorcb) {
    var that = this;

    var key = "songs/" + songId;

    if (!this._checkCache(key, callback)) {
        if (that._isAllAccessSong(songId)) {
            that.pm.getAllAccessTrack(songId, function(info) {
                var song = that._parseTrackObject(info);

                callback(song);
                that._cache.set(key, song);
            }, errorcb);
        }
        else {
            that._getCachedLibrary(function(items) {
                for (var itemidx in items) {
                    var track = items[itemidx];
                    if (track.id == songId) {
                        var song = that._parseTrackObject(track, track.id);
                        callback(song);
                        that._cache.set(key, song);
                        return;
                    }
                }
                that.pm.error(errorcb, "Couldn't find non-AllAccess track with given id");
            }, errorcb);

        }
    }

}

GMusic.prototype.getAlbum = function(nid, callback, errorcb) {
    var that = this;

    var key = "albums/" + nid;

    if (!this._checkCache(key, callback)) {
        this.pm.getAlbum(nid, true, function(data) {
            var album = {};

            album.name = data.name;
            album.tracks = data.tracks.map(function(o) { return that._parseTrackObject(o); });

            that._cache.set(key, album);
            callback(album);
        }, errorcb);
    }
}

GMusic.prototype.getArtist = function(artistId, callback, errorcb) {
    var that = this;

    var key = "artists/" + artistId;

    if (!this._checkCache(key, callback)) {
        this.pm.getArtist(artistId, true, 25, 0, function(data) {
            var artist = {};

            artist.albums = data.albums.map(function(o) {
                return {id: o.albumId, art: o.albumArtRef, name: o.name, year: o.year}
            }).sort(function(a, b) {
                return b.year - a.year;
            });

            artist.name = data.name;
            artist.topTracks = data.topTracks.map(function(o) { return that._parseTrackObject(o); });

            that._cache.set(key, artist);
            callback(artist);
        }, errorcb);
    }
}

GMusic.prototype.getStreamUrl = function(trackid, callback, errorcb) {
    this.pm.getStreamUrl(trackid, callback, errorcb);
}

GMusic.prototype.search = function(query, scallback, serrorcb) {
    var that = this;

    // Callback should only be called after we get results from both AllAccess search and library search
    var called = 0;
    var data = [];
    var callback = function(sdata) {
        data = data.concat(sdata);

        if (++called >= 2){
            var sorted = data.sort(function(a, b) {
                return a.score < b.score;
            });
            scallback(sorted);
        }
    };
    var errorcb = _.once(serrorcb);

    this.pm.search(query, 25, function(data) {
        var songs = (data.entries || []).map(function(res) {
            var ret = {};

            ret.score = res.score;

            if (res.type == "1") {
                ret.type = "track";
                ret.track = that._parseTrackObject(res.track);
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
    }, errorcb);

    this._getCachedLibrary(function(cb) {
        var lcQuery = query.toLowerCase();

        var foundSongs = cb.filter(function(item) {
            if (item.nid != undefined && that._isAllAccessSong(item.nid)) return false;

            if (item.title.toLowerCase().indexOf(lcQuery) != -1) return true;
            if (item.artist.toLowerCase().indexOf(lcQuery) != -1) return true;

            return false;
        }).map(function(item) {
            return {
                type: "track",
                score: 1000,
                track: that._parseTrackObject(item, item.id)
            };
        });

        callback(foundSongs);
    }, errorcb);

}

angular.module('gmusicService', []).service('GMusic', GMusic);
