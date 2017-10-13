angular
  .module("class-scheduler")
  .controller("turmaCtrl", turmaCtrl)

function turmaCtrl ($scope, $firebaseArray, $mdDialog) {
  var self = this;
  self.noCache = true;
  self.turmas = [];
  self.cursos = ['Geologia', 'Informática', 'Edificações'];

  self.initFirebase = function () {
    self.database = firebase.database();
    self.carregarTurmas();
  }

  self.carregarTurmas = function () {
    self.turmas = $firebaseArray(self.database.ref().child("turmas"));
  }

  self.salvarTurma = function () {
    let ref = self.database.ref("turmas");
    ref.push({
      curso: self.curso,
      serie: self.serie
    }).then(function () {
      console.log("a turma foi salva");
      self.hide();
    }.bind(this)).catch(function (erro) {
      console.log("erro ao salvar a turma", erro);
    })
  }

  self.criarTurma = function () {
    $mdDialog.show({
      controller: turmaCtrl,
      templateUrl: 'app/routes/add-turma.tmpl.html',
      clickOutsideToClose: true
    }).then(function (resposta) {
      console.log("resposta", resposta);
    }, function () {
        console.log("cancelled dialog");
    })
  }

  self.cancel = function () {
    $mdDialog.cancel();
  }

  self.hide = function () {
    $mdDialog.hide();
  }

  self.querySearch = function (query) {
      var results = self.cursos;
      var deferred = $q.defer();
      $timeout(function () { deferred.resolve( results ); }, Math.random() * 1000, false);
      return deferred.promise;
  }

  self.initFirebase();
}
