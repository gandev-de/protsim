if (Meteor.isClient) {
  Session.set("protocol", null);
  Session.set("protocol_selected", false);

  Deps.autorun(function () {
    var protocol = Session.get("protocol");
    if(protocol) {
      Meteor.call("addWatch", protocol._id, protocol);
    }
  });

  //************* def Template *************

  Template.def.helpers({
    protdef: function () {
      return Protdef.find();
    },

    selected: function () {
      return Session.equals("protocol_selected", this._id) ? 'selected' : '';
    }
  });

  Template.def.events({
    'click .protocol': function () {
      var self = this;
      Session.set("protocol", self);
      Session.set("protocol_selected", self._id);
    },

    'click #testcreate' : function () {
      Meteor.call("saveProtocol", new Protocol());
    }
  });

  //************* watch Template *************

  Template.watch.helpers({
    received: function () {
      return Protwatch.findOne({_id: Session.get("protocol_selected")});
    },

    protocol: function () {
      return Session.get("protocol");
    }
  });

  Template.watch.events({
    'click #testsend': function (evt, tmpl) {
      var test = tmpl.find("#test").value;
      var protocol = this;

      var telegram = new Telegram();
      telegram.values[0].current = test;

      Meteor.call("sendTelegram", protocol._id, telegram);
    }
  });
}
