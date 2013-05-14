if (Meteor.isClient) {
  Session.set("protocol", null);

  Deps.autorun(function () {
    Meteor.subscribe("protwatch", "w1", Session.get("protocol"));
  });

  //************* watch Template *************

  Template.watch.helpers({
    received: function () {
      return Protwatch.findOne();
    },

    protocol: function () {
      return Session.get("protocol");
    }
  });

  Template.watch.events({
    'click #testsend': function (evt, tmpl) {
      var test = tmpl.find("#test").value;

      console.log(test);

      var telegram = new Telegram();
      telegram.values[0].current = test;

      Meteor.call("sendTelegram", "w1", telegram);
    }
  });

  //************* def Template *************

  Template.def.helpers({
    protdef: function () {
      return Protdef.find();
    }
  });

  Template.def.events({
    'click .protocol': function () {
      var self = this;
      Session.set("protocol", self);
    },

    'click #testcreate' : function () {
      Meteor.call("saveProtocol", new Protocol());
    }
  });
}
