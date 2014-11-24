angular.module('gmusicPlayerApp')
    .controller('AuthCtrl', ['$scope', '$rootScope', '$location', 'GMusic', function($scope, $rootScope, $location, GMusic) {
        GMusic.login(function() {
            console.log("Succesful login to gmusic");

            $rootScope.$apply(function() {
                GMusic.loggedIn = true;

                $location.path($rootScope.preAuthPath || '/');
            });

        });
    }]);
