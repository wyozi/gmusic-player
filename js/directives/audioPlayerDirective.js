angular.module('audioPlayer-directive', ['ngCookies'])
    .directive('audioPlayer', ['$rootScope', '$cookies', function($rootScope, $cookies) {
        return {
            restrict: 'E',
            scope: {},
            controller: function($scope, $element) {
                $scope.audio = new Audio();

                $scope.audio.volume = $cookies.playervolume || 1;
                $scope.volume = $scope.audio.volume;

                $scope.currentTime = 0;

                // tell others to give me my prev/next track (with audio.set message)
                $scope.next = function() { $rootScope.$broadcast('audio:next'); };
                $scope.prev = function() { $rootScope.$broadcast('audio:prev'); };

                // tell audio element to play/pause, you can also use $scope.audio.play() or $scope.audio.pause();
                $scope.playpause = function() { var a = $scope.audio.paused ? $scope.audio.play() : $scope.audio.pause(); };

                $scope.updateCurrentTime = function() {
                    $scope.audio.currentTime = $scope.currentTime;
                }
                $scope.updateVolume = function() {
                    $cookies.playervolume = $scope.volume;
                    $scope.audio.volume = $scope.volume;
                }

                // listen for audio-element events, and broadcast stuff
                $scope.audio.addEventListener('play', function(){ $rootScope.$broadcast('audio:play', this); });
                $scope.audio.addEventListener('pause', function(){ $rootScope.$broadcast('audio:pause', this); });
                $scope.audio.addEventListener('timeupdate', function(){ $rootScope.$broadcast('audio:time', this); });
                $scope.audio.addEventListener('ended', function(){ $rootScope.$broadcast('audio:ended', this); $scope.next(); });

                // set track & play it
                $rootScope.$on('audio:set', function(event, url, info) {
                    $scope.audio.src = url;
                    $scope.audio.play();

                    $scope.info = info;

                    $rootScope.currentSongId = info.id;
                });

                $scope.audio.addEventListener('timeupdate', function() {
                    $scope.currentTime = $scope.audio.currentTime;
                    $scope.volume = $scope.audio.volume;
                })

                // update display of things - makes time-scrub work
                setInterval(function(){ $scope.$apply(); }, 500);
            },

            templateUrl: 'views/audioPlayerView.html'
        };
    }]);