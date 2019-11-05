'use strict';
var app = require('../../server/server');

module.exports = function(Professor) {
    /**
    * search turma by professor query
    * @param {string} query query
    * @param {Function(Error, array)} callback
    */

    Professor.search = async function(query) {
        var turmas = [];
        var _query = {ilike:"%"+query+"%"}
        var professores = await app.models.Professor.find({where: {or: [
            {nome: _query},
            {codigo: _query},
            {email: _query},
            {website: _query}
        ]}})

        for (var i=0; i< professores.length; i++) {
            var professor = professores[i];
            var t = await professor.turmas.find();
            for (var j=0; j < t.length; j++) {
                var horarios = await t[j].horarios.find();
                var disciplina = await t[j].disciplina.get();
                turmas.push({"turma":t[j],
                    "horarios":horarios,
                    "disciplina": disciplina,
                    "professor": professor}
                )
            }
        }
        return turmas
    };



};
