if (Meteor.isClient) {
  Session.set("protocol", null);
  Session.set("protocol_selected", false);
  Session.set("telegram", null);
  Session.set("telegram_selected", false);

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

    selected_protocol: function () {
      return Session.equals("protocol_selected", this._id) ? 'selected' : '';
    },

    selected_telegram: function () {
      return Session.equals("telegram_selected", this._id) ? 'selected' : '';
    },

    protocol: function () {
      return Session.get("protocol");
    }
  });

  Template.def.events({
    'click .protocol': function () {
      var self = this;
      Session.set("protocol", self);
      Session.set("protocol_selected", self._id);
      Session.set("telegram", null);
      Session.set("telegram_selected", null);
    },

    'click .telegram': function () {
      var self = this;
      Session.set("telegram", self);
      Session.set("telegram_selected", self._id);
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
    },

    telegram: function () {
      return Session.get("telegram");
    }
  });

  Template.watch.events({
    'click #testsend': function (evt, tmpl) {
      var test = tmpl.find("#test").value;
      var protocol = this;

      var telegram = Session.get("telegram");
      telegram.values[0].current = test;

      Meteor.call("sendTelegram", protocol._id, telegram);
    }
  });
}
