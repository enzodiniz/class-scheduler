angular
  .module("class-scheduler")
  .controller("aulaCtrl", aulaCtrl)

function aulaCtrl ($scope, $firebaseArray, $mdDialog) {
  var self = this;
  self.aulas = [];
  self.status = ["ok", "disponível", "substituída"];
  self.profs = [];
  self.discs = [];

  self.initFirebase = function () {
    self.database = firebase.database();
    self.carregarAulas();
    self.carregarProfs();
    self.carregarDiscs();
  }

  self.carregarAulas = function () {
    self.aulas = $firebaseArray(self.database.ref().child("aulas"));
  }

  self.carregarProfs = function () {
    self.profs = $firebaseArray(self.database.ref().child("professores"));
  }

  self.carregarDiscs = function () {
    self.discs = $firebaseArray(self.database.ref().child("disciplinas"));
  }

  self.salvarAula = function () {
    var aulaRef = self.database.ref("aulas");
    aulaRef.push({
      professor: self.prof,
      disciplina: self.disc,
      start: self.start,
      end: self.end,
      status: self.status
    }).then(function (resposta) {
      console.log("resposta", resposta);
      self.hide();
    }.bind(this)).catch(function (erro) {
      console.log("erro ao salvar aula", erro);
    });
  }

  self.mostrarForm = function () {
    $mdDialog.show({
      templateUrl: 'app/routes/add-aula.tmpl.html',
      clickOutsideToClose: true,
      controller: aulaCtrl
    }).then(function (resposta) {
      console.log("resposta", resposta);
    }, function () {
      console.log("cancelled dialog");
    });
  }

  self.hide = function () {
    $mdDialog.hide();
  }

  self.cancel = function () {
    $mdDialog.cancel();
  }

  self.initFirebase();
}
