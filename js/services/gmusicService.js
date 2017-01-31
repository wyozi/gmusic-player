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

GMusic.prototype.getLoginCredentials = function() {
    var deferred = Q.defer();

    if (!fs.existsSync("credentials.txt")) {
        deferred.reject("credentials.txt does not exist. See readme.");
        return deferred.promise;
    }

    var creds = JSON.parse(fs.readFileSync("credentials.txt", "utf8"));
    if ((!creds.email || !creds.password) && (!creds.androidId || !creds.masterToken)) {
        deferred.reject("credentials.txt does not have required keys. See readme.");
        return deferred.promise;
    }

    if (creds.email && creds.password) {
        this.pm.login({email: creds.email, password: creds.password}, function(err, data) {
            if (err) { deferred.reject(err); return; }

            console.log("Replacing plain text credentials with androidId and masterToken");

            var newCreds = {androidId: data.androidId, masterToken: data.masterToken};
            fs.writeFile("credentials.txt", JSON.stringify(newCreds));

            deferred.resolve(newCreds);
        });
    }
    else {
        deferred.resolve({androidId: creds.androidId, masterToken: creds.masterToken});
    }

    return deferred.promise;
}

GMusic.prototype.login = function() {
    var that = this;

    return this.getLoginCredentials().then(function(creds) {
        var deferred = Q.defer();

        that.pm.init({androidId: creds.androidId, masterToken: creds.masterToken}, function(err, data) {
            if (err) {
                deferred.reject(err);
                return;
            }
            deferred.resolve();
            that.loggedIn = true;
            that._emit('loggedIn');
        });

        return deferred.promise;
    });
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
        trackNumber: trackobj.trackNumber || 0,

        albumart: (trackobj.albumArtRef && trackobj.albumArtRef.length > 0) ? trackobj.albumArtRef[0].url : "",
        albumid: (trackobj.albumId) ? trackobj.albumId : encodeURIComponent("custom-" + trackobj.album),

        artist: trackobj.artist,
        artistid: (trackobj.artistId && trackobj.artistId.length > 0) ? trackobj.artistId[0] : encodeURIComponent("custom-" + trackobj.artist),

        album: trackobj.album,
        title: trackobj.title,

        year: trackobj.year,

        playCount: trackobj.playCount || 0,

        origTrackObj: trackobj
    }
}

GMusic.prototype.getPlaylists = function(callback, errorcb) {
    var that = this;

    if (!this._checkCache("playlists", callback)) {
        this.pm.getPlayLists(function(err, data) {
            if (err) {errorcb(err); return; }
            that._cache.set("playlists", data.data.items);
            callback(data.data.items);
        });
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
        this.pm.getLibrary({limit: 10000}, function(err, lib) {
            if (err) { errorcb(err); return; }
            that._cache.set("library", lib.data.items);
            callback(lib.data.items);
        });
    }
}

GMusic.prototype.getPlaylistEntries = function(callback, errorcb) {
    var that = this;

    if (!this._checkCache("playlist-entries", callback)) {
        this.pm.getPlayListEntries(function(err, data) {
            if (err) { errorcb(err); return; }
            that._cache.set("playlist-entries", data.data.items);
            callback(data.data.items);
        });
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

    this.pm.addTrackToPlayList(songId, playlistId, function(err, data) {
        if (err) { errorcb(err); return; }

        // Invalidate playlist entry cache, so next time we get playlist entries, the new song will be there
        that._cache.del("playlist-entries");
        that._cache.del("playlist-songs/" + playlistId);

        success(data);
    });
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

        success({removed: wasRemoved});
    }, errorcb);
}

GMusic.prototype.getSong = function(songId) {
    var that = this;
    var deferred = Q.defer();

    var key = "songs/" + songId;

    if (!this._checkCache(key, deferred.resolve)) {
        if (that._isAllAccessSong(songId)) {
            that.pm.getAllAccessTrack(songId, function(err, info) {
                if (err) { deferred.reject(err); return; }

                var song = that._parseTrackObject(info);

                deferred.resolve(song);
                that._cache.set(key, song);
            });
        }
        else {
            that._getCachedLibrary(function(items) {
                for (var itemidx in items) {
                    var track = items[itemidx];
                    if (track.id == songId) {
                        var song = that._parseTrackObject(track, track.id);
                        deferred.resolve(song);
                        that._cache.set(key, song);
                        return;
                    }
                }
                deferred.reject("Couldn't find non-AllAccess track with given id");
            }, deferred.reject);

        }
    }

    return deferred.promise;
}

GMusic.prototype.getAlbum = function(nid, callback, errorcb) {
    var that = this;

    var key = "albums/" + nid;

    if (!this._checkCache(key, callback)) {
        this.pm.getAlbum(nid, true, function(err, data) {
            if (err) { errorcb(err); return; }

            var album = {};

            album.name = data.name;
            album.tracks = data.tracks.map(function(o) { return that._parseTrackObject(o); });

            that._cache.set(key, album);
            callback(album);
        });
    }
}

GMusic.prototype.getArtist = function(artistId, callback, errorcb) {
    var that = this;

    var key = "artists/" + artistId;

    if (!this._checkCache(key, callback)) {
        this.pm.getArtist(artistId, true, 25, 0, function(err, data) {
            if (err) { errorcb(err); return; }

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
        });
    }
}

GMusic.prototype.getStreamUrl = function(trackid) {
    var deferred = Q.defer();
    this.pm.getStreamUrl(trackid, function(err, url) {
        if (err) { deferred.reject(err); return; }
        deferred.resolve(url);
    });
    return deferred.promise;
}

GMusic.prototype.search = function(query) {
    var that = this;

    // Search from all access
    function allAccessSearch() {
        var deferred = Q.defer();

        that.pm.search(query, 25, function(err, data) {
            if (err) { deferred.reject(err); return; }

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

            deferred.resolve(songs);
        });

        return deferred.promise;
    }

    // Search from manually uploaded songs
    function librarySearch() {
        var deferred = Q.defer();

        that._getCachedLibrary(function(cb) {
            var parsedTracks = cb.map(function(track) {
                return that._parseTrackObject(track, track.id);
            });
            var fuse = new Fuse(parsedTracks, {includeScore: true, threshold: 0.5, keys: ["artist", "album", "title"]});
            var result = fuse.search(query);

            var foundTracks = result.map(function(item) {
                var track = item.item;
                return {
                    type: "track",
                    score: (1 - item.score) * 100,
                    track: that._parseTrackObject(track, track.id)
                };
            });

            deferred.resolve(foundTracks);
        }, deferred.reject);

        return deferred.promise;
    }

    return Q.allSettled([allAccessSearch(), librarySearch()]).then(function(results) {
        var items = [];
        results.forEach(function (result) {
            if (result.state === "fulfilled") {
                // Equivalent to items.push(res[0], res[1], .. res[n])
                Array.prototype.push.apply(items, result.value);
            } else {
                var reason = result.reason;
                console.log("GMusic search: one of the results failed for " + reason);
            }
        });
        return _(items).sortBy(function(t) {
            return -t.score; // Sort by descending score
        });
    });
}

GMusic.prototype.incrementTrackPlaycount = function(songId) {
    var deferred = Q.defer();
    this.pm.incrementTrackPlaycount(songId, function(err) {
        if (err) { deferred.reject(err); return; }
        deferred.resolve();
    });
    return deferred.promise;
}

angular.module('gmusicService', []).service('GMusic', GMusic);
