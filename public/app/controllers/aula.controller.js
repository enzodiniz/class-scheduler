angular
  .module("class-scheduler")
  .controller("aulaCtrl", aulaCtrl)

function aulaCtrl ($scope, $firebaseArray, $mdDialog) {
  var self = this;
  self.aulas = [];
  self.default = [];
  self.available = [];
  self.replaced = [];

  self.initFirebase = function () {
    self.db = firebase.firestore();
    self.getRealtimeUpdates();
    self.getAulas("ok", self.default);
    self.getAulas("disponivel", self.available);
    self.getAulas("substituida", self.replaced);
  }

  self.getRealtimeUpdates = function () {
    self.db.collection("aulas").onSnapshot(function (querySnapshot) {
      let temp = [];
      querySnapshot.forEach(function (doc) {
        temp.push(doc);
      });
      $scope.$apply(function () {
        self.aulas = temp;
      });
    });
  }

  self.getAulas = function (status, list) {
    self.db.collection("aulas")
      .where('status.' + status, '==', true)
      .onSnapshot(function (querySnapshot) {
        let temp = [];
        querySnapshot.forEach(function (doc) {
          temp.push(doc);
        });
        $scope.$apply(function () {
          list = temp;
          if (status == "ok") {
            self.default = list;       
          } else if (status == "disponivel") {
            self.available = list;
          } else {
            self.replaced = list;
          }
        });  
      });
  }

  // self.getAulas = function (status, list) {
  //   self.db.collection("aulas")
  //     .where('status.' + status, '==', true)
  //     .get()
  //     .then((query) => {
  //       let temp = [];
  //       query.forEach(function (doc) {
  //         temp.push(doc);
  //       });
  //       $scope.$apply(function () {
  //         list = temp;
  //         if (status == "ok") {
  //           self.default = list;       
  //         } else if (status == "disponivel") {
  //           self.available = list;
  //         } else {
  //           self.replaced = list;
  //         }
  //       });
  //     })
  // }

  self.salvarAula = function (ev) {
    $mdDialog.show({
      templateUrl: 'app/routes/add-aula.tmpl.html',
      clickOutsideToClose: true,
      parent: angular.element(document.body),
      targetEvent: ev,
      fullscreen: $scope.customFullscreen,
      controller: ['$scope', '$mdClassSchedulerToast',
        function ($scope, $mdClassSchedulerToast) {
          $scope.status = 'Ok';

          $scope.salvar = function () {
            $scope.setStart($scope.day);
            $scope.setEnd($scope.day);
            if ($scope.status == "Disponível") {
              $scope.ok = false;
              $scope.disponivel = true;
              $scope.substituida = false;
            } else if ($scope.status == "Substituída") {
              $scope.ok = false;
              $scope.disponivel = false;
              $scope.substituida = true;
            } else {
              $scope.ok = true;
              $scope.disponivel = false;
              $scope.substituida = false;
            }
            self.db.collection("aulas").add({
              start: $scope.start,
              end: $scope.end,
              status: {
                ok: $scope.ok,
                disponivel: $scope.disponivel,
                substituida: $scope.substituida
              }
            }).then(function (docRef) {
              $mdClassSchedulerToast.show("Uma nova aula foi salva");
              $scope.hide();
            }).catch(function (error) {
              console.log("Ocorreu um erro: ", error);
              $mdClassSchedulerToast.show("Ocorreu um erro ao salvar a aula");
            });
          }

          $scope.setStart = function (day) {
            $scope.start = new Date(); 
            $scope.start.setTime(day.getTime());
            $scope.start.setHours($scope.hrI);
            $scope.start.setMinutes($scope.mnI);
          }

          $scope.setEnd = function (day) {
            $scope.end = new Date();
            $scope.end.setTime(day.getTime());
            $scope.end.setHours($scope.hrF);
            $scope.end.setMinutes($scope.mnF);
          }

          $scope.hide = function () {
            $mdDialog.hide();
          }

          $scope.cancel = function () {
            $mdDialog.cancel();
          }
      }]
    }).then(function (answer) {
      console.log("answer: ", answer);
    }, function () {
      console.log("cancelled dialog");
    })
  }

  self.initFirebase();
}
