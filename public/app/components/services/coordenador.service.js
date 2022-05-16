angular
  .module('class-scheduler')
  .service('$coordSvc', coordSvc)

function coordSvc() {
  var self = this;

  self.initFirebase = function() {
    self.db = firebase.firestore();
    self.refCollection = self.db.collection("coordenadores")
  }

  self.deleteCoordenador = function(id) {
    return self.refCollection.doc(id).delete()
  }

  self.atualizarCoord = function(id, newData) {
    return self.refCollection.doc(id).set(newData)
  }

  self.addCoordenador = function(personId) {
    const personRef = self.db.doc("pessoas/" + personId)
    const coord = {
      refPessoa: personRef
    }
    return self.refCollection.add(coord)
  }

  // self.addCoordenador = function(coord) {
  //   return self.db.collection("coordenadores").add(coord);
  // }

  self.getCoordenador = function(ref) {
    return self.db.collection("coordenadores").where("refPessoa", "==", ref).get();
  }

  self.getCoordenadores = function() {
    return self.refCollection.get()
  }

  self.initFirebase();
}
