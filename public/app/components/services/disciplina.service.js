angular
  .module('class-scheduler')
  .service('$disciplinaSvc', discSvc)

function discSvc() {
  var self = this;
  self.refColecao;

  self.init = function() {
    self.db = firebase.firestore();
    self.refColecao = self.db.collection('disciplinas');
  }

  self.createDisc = function(newDisc) {
    return self.refColecao.add(newDisc);
  }

  self.addDisciplina = function (disciplina) {
    return self.refColecao.add(disciplina)
  }

  self.updateDisciplina = function(id, newDisc) {
    return self.refColecao.doc(id).set(newDisc);
  }

  self.getDisciplina = function (id) {
    return self.refColecao.doc(id).get();
  }

  self.deleteDisc = function(id) {
    return self.refColecao.doc(id).delete();
  }

  self.deleteDisciplina = function(id) {
    return self.refColecao.doc(id).delete();
  }

  self.getDisciplinasByTurmaRef = function (turmaRef) {
    return self.refColecao
      .where('turmaRef', '==', turmaRef)
      .get()
  }

  self.getDisciplinasByTurmaRefAndProfessorId = function (turmaRef, professorId) {
    console.log('turmaRef: ', turmaRef);
    console.log('professorId: ', professorId);

    return self.refColecao
      .where('turmaRef', '==', turmaRef)
      .where('professorId', '==', professorId)
      .get()
  }

  self.getDiscsOfTurma = function(turmaId) {
    let turmaRef = self.db.doc("turmas/" + turmaId);
    return self.refColecao.where("turma", "==", turmaRef).get();
  }

  self.getSubstitutas = function(profId, turmaId) {
    return self.refColecao
      .where("professor", "==", self.db.doc("professores/" + profId))
      .where("turma", "==", self.db.doc("turmas/" + turmaId))
      .get();
  }

  self.getMinhasDiscs = function(profId, periodoId) {
    let refProfessor = self.db.doc('professores/' + profId);
    // let refPeriodo = self.db.doc('periodos/' + periodoId);
    return self.refColecao
      .where('professor', '==', refProfessor).get();
      // .where('periodo', "==", refPeriodo).get();
  }

  self.init();
}
