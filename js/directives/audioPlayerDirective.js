var querystring = require('querystring');

var REWIND_THRESHOLD = 3; // the elapsed time after which we should rewind instead of going to prev. track


angular.module('audioPlayer-directive', [])
    .filter('minutesSeconds', function() {
        return function(seconds) {
            if (!seconds) {
                return '00:00';
            }
            var seconds = Math.round(+seconds);

            var minutes = Math.floor(seconds / 60);
            seconds = seconds - minutes*60;

            if (minutes < 10) { minutes = '0' + minutes; }
            if (seconds < 10) { seconds = '0' + seconds; }

            return minutes + ':' + seconds;
        }
    })
    .directive('audioPlayer', ['$rootScope', '$window', function($rootScope, $window) {
        return {
            restrict: 'E',
            scope: {},
            controller: function($scope, $element) {
                $scope.audio = new Audio();

                $scope.audio.volume = localStorage.volume || 1;
                $scope.volume = $scope.audio.volume;

                $scope.loopStates = ['off', 'all', 'single'];
                $scope.loopState = localStorage.loopState || 'off';

                $scope.currentTime = 0;

                $scope.next = function(triggeredByEndEvent) {
                    if (triggeredByEndEvent && $scope.loopState == 'single') {
                        // Repeat
                        $scope.audio.currentTime = 0;
                        $scope.audio.play();
                    }
                    else {
                        $rootScope.$broadcast('audio:next', triggeredByEndEvent, $scope.loopStates[$scope.loopState]);
                    }
                };
                $scope.prev = function() {
                    if ($scope.audio.currentTime > REWIND_THRESHOLD) {
                        $scope.audio.currentTime = 0;
                        $scope.audio.play();
                    }
                    else {
                        $rootScope.$broadcast('audio:prev');
                    }
                };

                $scope.playpause = function() { var a = $scope.audio.paused ? $scope.audio.play() : $scope.audio.pause(); };

                $scope.cycleLoopState = function() {
                    // Clear loop marker if it exists
                    if ($scope.loopMarker != undefined) {
                        $scope.loopMarker = undefined;
                        return;
                    }

                    var index = ($scope.loopStates.indexOf($scope.loopState) + 1) % $scope.loopStates.length;
                    $scope.loopState = $scope.loopStates[index];
                    localStorage.loopState = $scope.loopState;
                }

                $scope.updateCurrentTime = function() {
                    $scope.audio.currentTime = $scope.currentTime;
                }
                $scope.updateVolume = function() {
                    localStorage.volume = $scope.volume;
                    $scope.audio.volume = $scope.volume;
                }

                angular.element($window).on('keydown', function(e) {
                    if (e.keyCode == 32 && e.target == document.body) {
                        $scope.playpause();
                        $scope.$apply();

                        e.preventDefault();
                    }
                });

                $scope.audio.addEventListener('play', function(){ $rootScope.$broadcast('audio:play', this); });
                $scope.audio.addEventListener('pause', function(){ $rootScope.$broadcast('audio:pause', this); });
                $scope.audio.addEventListener('timeupdate', function(){ $rootScope.$broadcast('audio:time', this); });
                $scope.audio.addEventListener('ended', function(){
                    $rootScope.$broadcast('audio:ended', this);

                    console.debug("Song ended; moving to next track");
                    $scope.next(true);
                });

                $rootScope.$on('audio:set', function(event, data) {
                    var url = data.url;
                    var info = data.info;
                    var context = data.context;

                    $scope.audio.src = "http://localhost:" + (MusicStreamServerPort || 8080) + "/?" + querystring.stringify({
                        songId: info.id,
                        songUrl: new Buffer(url).toString('base64')
                    });

                    var setPlayState = function() {
                        if (data.startPaused == true) {
                            $scope.audio.pause();
                        }
                        else {
                            $scope.audio.play();
                        }
                    };

                    // 'data' specifies a start time, so we need to do a hack to seek to the start time
                    // when the audio is in a 'canplay' state
                    if (data.startAt != undefined) {
                        var setTimeFunc = function() {
                            $scope.audio.currentTime = data.startAt;
                            setPlayState();

                            $scope.audio.removeEventListener('canplay', setTimeFunc);
                        };
                        $scope.audio.addEventListener('canplay', setTimeFunc);
                    }

                    setPlayState();

                    $scope.loopMarker = undefined;

                    $scope.info = info;
                    $scope.context = context;

                    localStorage.lastSongId = info.id;

                    $rootScope.currentSong = data;
                    $scope.$apply();
                });

                $scope.audio.addEventListener('timeupdate', function() {
                    // Handle looping
                    if ($scope.loopMarker != undefined && ($scope.loopMarker.end - $scope.loopMarker.start) > 1) {
                        var start = $scope.loopMarker.start;
                        var end = $scope.loopMarker.end;

                        if ($scope.audio.currentTime < start || $scope.audio.currentTime > end)
                            $scope.audio.currentTime = start;
                    }

                    if ($scope.loopMarker == undefined && $scope.audio.currentTime > ($scope.audio.duration-3)) {
                        $rootScope.$broadcast('audio:ending');
                    }

                    $scope.currentTime = $scope.audio.currentTime;
                    localStorage.lastSongTime = $scope.currentTime;

                    $scope.volume = $scope.audio.volume;

                    $scope.$apply();
                });

                $scope.audio.addEventListener('error', function() {
                    var err = $scope.audio.error;
                    if (err.code == 2) {
                        var src = $scope.audio.src;
                        var time = $scope.audio.currentTime;

                        $scope.audio.src = src + "&cachek=" + new Date().getTime();

                        var setTimeFunc = function() {
                            $scope.audio.currentTime = time;
                            $scope.audio.play();

                            console.debug("Set currentTime to ", time, " (real : ", $scope.audio.currentTime, "; dur: ", $scope.audio.duration, ")");
                            $scope.audio.removeEventListener('canplay', setTimeFunc);
                        };
                        $scope.audio.addEventListener('canplay', setTimeFunc);

                        console.log("Reloading audio due to error: ", err);
                    }
                })

                // Seekbar stuff
                function getDraggedTime(e) {
                    var seekbar = $(e.target).closest(".seekbar");
                    var frac = (e.pageX - seekbar.offset().left) / seekbar.width();
                    return frac * $scope.audio.duration;
                }

                $scope.seekBarMouseDown = function(e) {
                    if (e.button == 0) {
                        $scope.currentDraggedTime = getDraggedTime(e);
                    }
                }
                $scope.seekBarResetDrag = function(e) {
                    if ($scope.currentDraggedTime) {
                        $scope.currentTime = $scope.currentDraggedTime;
                        $scope.updateCurrentTime();
                    }
                    $scope.currentDraggedTime = undefined;
                }
                $scope.seekBarDragged = function(e) {
                    if (e.button == 0) {
                        if (e.which == 1 && $scope.currentDraggedTime) {
                            $scope.currentDraggedTime = getDraggedTime(e);
                        }
                    }
                    else if (e.button == 2) {
                        var t = getDraggedTime(e);

                        if ($scope.loopMarker == undefined) $scope.loopMarker = {start: t, end: t};

                        var lm = $scope.loopMarker;
                        lm.start = Math.min(t, lm.start);
                        lm.end = Math.max(t, lm.end);
                    }
                }
                $scope.range = function(n) {
                    return Array.apply(null, Array(n)).map(function (_, i) {return i;});
                };
            },

            templateUrl: 'views/audioPlayerView.html'
        };
    }]);
