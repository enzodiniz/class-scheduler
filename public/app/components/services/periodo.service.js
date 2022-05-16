angular
  .module('class-scheduler')
  .service('$periodoSvc', periodoSvc);

function periodoSvc() {
  var self = this;

  self.init = function() {
    self.db = firebase.firestore()
    self.refCollection = self.db.collection("periodos")
  }

  self.getPeriodos = function() {
    return self.refCollection.get()
  }

  self.loadPeriodos = function (array) {
    array.splice(0, array.length)

    return self.getPeriodos()
      .then(query => {
        query.forEach(snapPeriodo => {
          const periodo = snapPeriodo.data();
          periodo.id = snapPeriodo.id;

          array.push(periodo);
        })
        
        array = self.sortPeriodos(array)
      })
      .catch(e => {
        console.error('periodoSvc -> Ocorreu um erro em loadPeriodos: ', e);
      })
  }

  self.sortPeriodos = function(array) {
    for (let vez = 0; vez < array.length; vez++) {
        for (let indice = 0; indice < array.length - vez - 1; indice++) {
            if (array[indice].ano < array[indice+1].ano) {
                const temp = array[indice];
                array[indice] = array[indice + 1];
                array[indice + 1] = temp;
            } 
            else if (array[indice].ano === array[indice+1].ano) {
                if (array[indice].semestre < array[indice].semestre) {
                    const temp = array[indice];
                    array[indice] = array[indice + 1];
                    array[indice + 1] = temp; 
                }
            }
        }
    }
    return array
  }

  self.sortPeriodosDisabled = function(arr) {
    for (let i = 0; i < arr.length-1; i++) {
      const atual   = arr[i]
      const proximo = arr[i+1]

      if (atual.ano === proximo.ano && atual.semestre > proximo.semestre) {
        const temp = arr[i]
        arr[i] = arr[i+1]
        arr[i+1] = temp
      }
    }

    return arr
  }

  self.addPeriodo = function(periodo) {
    return self.refCollection.add(periodo);
  }

  self.excluirPeriodo = function(id) {
    return self.refCollection.doc(id).delete();
  }

  self.editarPeriodo = function(id, novoPeriodo) {
    return self.refCollection.doc(id).set(novoPeriodo);
  }

  self.init();
}
