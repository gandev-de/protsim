//************* watch Template *************

Session.set("telegram_selected_watch", false);

Template.protwatch.helpers({
  received: function() {
    return Protwatch.findOne({
      _id: Session.get("protocol_selected")
    });
  },

  protocol: function() {
    return Protdef.findOne({
      _id: Session.get("protocol_selected")
    });
  },

  selected_telegram: function() {
    return Session.equals("telegram_selected_watch", this._id) ? 'selected' : '';
  },

  telegram: function(protocol) {
    if (!protocol) return;

    var telegrams = protocol.telegrams;
    for (var i = 0; i < telegrams.length; i++) {
      var telegram = telegrams[i];
      if (Session.equals("telegram_selected_watch", telegram._id)) {
        return telegram;
      }
    }
  },

  watched: function() {
    return Protwatch.findOne({
      _id: this._id
    }) ? 'checked' : '';
  }
});

Template.protwatch.events({
  'click .watch_telegram': function(evt, tmpl) {
    var telegram = this;

    Session.set("telegram_selected_watch", telegram._id);
  },

  'click #send': function(evt, tmpl) {
    var telegram = this;

    for (var i = 0; i < telegram.values.length; i++) {
      var value_html = tmpl.find("#" + telegram.values[i].name).value;
      telegram.values[i].current = value_html;
    }

    Meteor.call("sendTelegram", Session.get("protocol_selected"), telegram);
  },

  'click #loopback': function(evt, tmpl) {
    var protwatch = this;
    var loopback_counter = +tmpl.find("#loopback_counter").value;

    Meteor.call("sendTelegram", protwatch._id, protwatch.raw, {
      count: loopback_counter
    });
  },

  'click #start_watch': function(evt, tmpl) {
    var watch = Protwatch.findOne({
      _id: this._id
    });
    if (watch) {
      Meteor.call("endWatch", this._id);
    } else {
      Meteor.call("startWatch", this._id, this);
    }
  }
});