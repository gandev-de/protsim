//************* watch Template *************

Template.protwatch.helpers({
  received: function () {
    return Protwatch.findOne({_id: Session.get("protocol_selected")});
  },

  protocol: function () {
    return Protdef.findOne({_id: Session.get("protocol_selected")});
  },

  telegram_selected: function () {
    return Session.get("telegram_selected");
  },

  watched: function () {
    return Protwatch.findOne({_id: this._id}) ? 'checked' : '';
  }
});

Template.protwatch.events({
  'click #testsend': function (evt, tmpl) {
    var test = tmpl.find("#test").value;
    var protocol = this;

    var telegram = protocol.telegrams[0];
    telegram.values[0].current = test;

    Meteor.call("sendTelegram", protocol._id, telegram);
  },

  'click #loopback': function (evt, tmpl) {
    var protwatch = this;

    Meteor.call("sendTelegram", protwatch._id, protwatch.raw);
  },

  'click #start_watch': function (evt, tmpl) {
    var watch = Protwatch.findOne({_id: this._id});
    if(watch) {
      Meteor.call("endWatch", this._id);
    } else {
      Meteor.call("startWatch", this._id, this);
    }
  }
});