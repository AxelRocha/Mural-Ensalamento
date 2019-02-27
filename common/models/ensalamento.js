'use strict';

var async = require('async');

var path = require("path");

var app = require('../../server/server');

const {Ensalador, EnsaladorPart, Schedule, ScheduleCollection, Room, RoomColection, CurrentSchedule} = require(path.resolve(__dirname,'../../bin/ensalador/ensalador.js'));

// Convert an instance of Horario into an Schedule (Ensalador) instance
function getScheduleInstance(h, cb){
  var Horario = app.models.Horario;
  Horario.getCode(h.id, (err,horarioCode) => {
    if(err) return cb(err,null);
    Horario.getTotalSize(h.id, (err,horarioSize) => {
      if(err) return cb(err,null);  
      // TODO: Type, klass_id, department and course must be corrected
      var schedule = new Schedule({
        code: horarioCode,
        id: h.id,
        day: h.dia,
        ini: h.horario_inicial,
        end: h.horario_final,
        size: horarioSize,
        type: 1,
        department: "d",
        course: "c",
        klass_id: 1
      });
      cb(null,schedule);
    });
  });
}


function getAllSchedulesInstances(newEnsalamento,cb){
  var Horario = app.models.Horario;

  // TODO: Filter by parameters specified by user
  var queryHorario = {};


  Horario.find(queryHorario, function(err, horarios){

    // Transform the horarios to objects
    horarios = horarios.map(h => {return h.toJSON()});

    // Transform all Horario instances in Schedule (Ensalador)
    async.map(horarios, getScheduleInstance, (err, schedules) => {
      cb(err, new ScheduleCollection(newEnsalamento.id,schedules));
    });
  });
}

function getAllRoomsInstances(newEnsalamento,cb){
  var Sala = app.models.Sala;
  var querySala = {};
  Sala.find(querySala, function(err, salas){
    if(err) return cb(err,null);
    var rooms = salas.map(s => {
      s = s.toJSON();

      // TODO: type must be an integer, but the model Sala contains a string
      return new Room({
        code: s.codigo,
        id: s._id,
        type: 1,
        size: s.capacidade,
        block: s.blocoCod,
        lat: s.localizacao.lat,
        log: s.localizacao.lng
      });
    });

    cb(err, new RoomColection(newEnsalamento.id,rooms));
  });
}
module.exports = function(Ensalamento) {
  Ensalamento.ensalar = function(cb) {
    var Horario = app.models.Horario;
    // TODO: insert user id when create ensalamento instance
    app.models.Ensalamento.create({}, function(err, newEnsalamento){
          if(err) return cb(err,null);
        getAllRoomsInstances(newEnsalamento,(err, rooms) => {
            if(err) return cb(err,null);
          getAllSchedulesInstances(newEnsalamento,(err,schedules) => {
              if(err) return cb(err,null);
            
            // Save the files into ensalador/ensalador_executions
            // The id of new ensalamento is the identifier of
            // yaml new files
            rooms.save();
            schedules.save();
            var dataCurrent = schedules.toJSON().schedules.map(s =>{
                return new Schedule(s)
            });
            var current = new CurrentSchedule(newEnsalamento.id, dataCurrent);
            current.save();
            
            // Heuristic used to execute
            // Here you can specify the parameters of algorithm
            var parts = [
              new EnsaladorPart("Open", "open"),
              new EnsaladorPart("Final", "exec",{day: [2,3,4,5,6,7]}),
              new EnsaladorPart("Close", "close")
            ];
            
            var e = new Ensalador(
              parts,
              rooms.getFilePath(),
              schedules.getFilePath(),
              current.getFilePath(),
            );
    
            e.execute((err,schedules) => {
              if(err) return cb(err,null);
              async.each(schedules,
                (s,cb_s) => {
                  var query = {where:{id: s.id}};
                  Horario.findOne(query, (err, h) => {
                    if(err) return cb(err,null);
                    h.updateAttribute("salaCode", s.assigned, err => {
                      cb_s(err);
                    });
                  });
                },
                (err) => {
                  // If everything is ok
                  cb(err,schedules);
                }
              );
            });
          })
        });
    });
  };
};
