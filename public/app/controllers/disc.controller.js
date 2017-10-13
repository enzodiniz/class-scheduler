angular
  .module("class-scheduler")
  .controller("discCtrl", discCtrl)

function discCtrl ($scope, $firebaseArray, $mdDialog) {
  var self = this;
  self.disciplinas = [];
  self.turmas = [];

  self.initFirebase = function () {
    self.database = firebase.database();
    self.loadDisc();
  }

  self.loadDisc = function () {
    self.disciplinas = $firebaseArray(self.database.ref().child("disciplinas"));
  }

  self.salvarDisc = function () {
    console.log("chegou no salvar disciplina");
    var discRef = self.database.ref("disciplinas");
    discRef.push({
      titulo: self.titulo,
      turma: self.turma
    }).then(function () {
      console.log("disciplina foi salva");
      self.hide();
    }.bind(this)).catch(function (erro) {
      console.log("erro ao salvar a disciplina:", erro);
    })
  }

  self.criarDisc = function () {
    $mdDialog.show({
      controller: discCtrl,
      clickOutsideToClose: true,
      templateUrl: 'app/routes/add-disc.tmpl.html'
    }).then(function (resposta) {
      console.log("resposta", resposta);
    }, function () {
      console.log("cancelled dialog");
    });
  }

  self.cancel = function () {
    $mdDialog.cancel();
  }

  self.hide = function () {
    $mdDialog.hide();
  }

  self.obterTurmas = function () {
    self.turmas = $firebaseArray(self.database.ref().child("turmas"));
  }

  self.initFirebase();
}
