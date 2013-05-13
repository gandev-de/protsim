if (Meteor.isClient) {
  Session.set("protocol", new Protocol());

  Deps.autorun(function () {
    Meteor.subscribe("protwatch", "w1", Session.get("protocol"));
  });

  Template.watch.helpers({
    received: function () {
      return Protwatch.findOne();
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
}
