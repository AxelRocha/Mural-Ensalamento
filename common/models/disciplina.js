'use strict';

var app = require('../../server/server');

module.exports = function(Disciplina) {
  // The follow remote methods was constructed because there is many problems
  // in the Model Self Relation in LoopBack API 3
  // The model EquivalenciaDisciplina was created to implement this relation

  Disciplina.prototype.addEquivalencia = function(disciplina_eq_codigo, cb) {
    var Eq = app.models.Equivalenciadisciplina;

    Eq.create({"disciplina1": this.codigo, "disciplina2":disciplina_eq_codigo}, function(err, eq){
        cb(err,eq);
    });

  };

  Disciplina.prototype.getEquivalencias = function(cb) {
    var Eq = app.models.Equivalenciadisciplina;
    let myCode = this.codigo;
    Eq.find({where:{or:[ {disciplina1:myCode}, {disciplina2:myCode} ]}}, function(err, eq){
      
      // Filter only the ids of equivalents courses
      // The id can be on disciplina1 or disciplina2 columns
      // console.log(eq[0].disciplina1.toString(), eq[0].disciplina2.toString());
      var ret = eq.map(function(x){

        var codigoDisciplina1 = x.__data.disciplina1;
        var codigoDisciplina2 = x.__data.disciplina2;

        if(myCode == codigoDisciplina1) return codigoDisciplina2;
        return codigoDisciplina1;
      });
      
      // Remove repeated information
      var uniqueArray = ret.filter(function(item, pos) {
        return ret.indexOf(item) == pos;
      });

      cb(err,uniqueArray);
    });

  };

  Disciplina.prototype.deleteEquivalencia = function(disciplina_eq_codigo, cb) {
    var Eq = app.models.Equivalenciadisciplina;
    let myCode = this.codigo;

    // Find and destroy all relations between the two specified instances
    // The relation can be in form of (id1,id2) or (id2,id1)
    Eq.destroyAll({
      or:[
        {
          and:[
            {disciplina1:myCode},
            {disciplina2:disciplina_eq_codigo}
          ]
        },
        {
          and:[
            {disciplina1:disciplina_eq_codigo},
            {disciplina2:myCode}
          ]
        }
      ]
    }, function(err, info){
      cb(err,info);
    });

  };

};
