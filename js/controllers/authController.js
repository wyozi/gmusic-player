angular.module('gmusicPlayerApp')
    .controller('AuthCtrl', ['$scope', '$rootScope', '$location', 'GMusic', function($scope, $rootScope, $location, GMusic) {
        GMusic.login().then(function() {
            $scope.authenticated = true;

            $rootScope.$apply(function() {
                $location.path($rootScope.preAuthPath || '/');
            });
        }).catch(function(e) {
            $rootScope.nodeError = "Login failed: " + e;
        })
    }]);
