angular.module('class-scheduler').service('$logSvc', historicoSvc);

function historicoSvc() {
  var self = this;

  self.initFirebase = function() {
    self.db = firebase.firestore();
    self.logCollection = self.db.collection("log");
  }

  self.getModifications = function(start, end) {
    return self.logCollection
      .orderBy("aula.date")
      .startAt(start)
      .endAt(end)
      .get();
  }

  self.getModificationsMinhas = function(teacherId, start, end) {
    var ref = self.db.doc("professores/" + teacherId);

    return self.logCollection
      .where("author", "==", ref)
      .orderBy("date")
      .startAt(start)
      .endAt(end)
      .get();
  }

  self.getModificationsFaltas = function(teacherId, start, end) {
    var ref = self.db.doc("professores/" + teacherId);

    return self.logCollection
      .where("aula.professor", "==", ref)
      .orderBy("date")
      .startAt(start)
      .endAt(end)
      .get();
  }

  self.initFirebase();
}
