var INTERFACES = ["Send", "Receive"];

//************* watch Template *************

Session.set("telegram_selected_watch", null);
Session.set("selected_history_value", 0);
Session.set("active_send_send_interface", INTERFACES[0]);
Session.set("active_recv_send_interface", INTERFACES[0]);

Template.protwatch.helpers({
  interfaces: function() {
    return INTERFACES;
  },

  send_send_interface_active: function() {
    return Session.equals("active_send_send_interface", INTERFACES[0]);
  },

  recv_send_interface_active: function() {
    return Session.equals("active_recv_send_interface", INTERFACES[0]);
  },

  active_send_send_interface: function() {
    var type = this + "";
    return Session.equals("active_send_send_interface", type) ? 'active' : '';
  },

  active_recv_send_interface: function() {
    var type = this + "";
    return Session.equals("active_recv_send_interface", type) ? 'active' : '';
  },

  send_received: function() {
    return Protwatch.findOne({
      _id: Session.get("protocol_selected") + "_send"
    });
  },

  recv_received: function() {
    return Protwatch.findOne({
      _id: Session.get("protocol_selected") + "_recv"
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

  send_watch_active: function() {
    return Protwatch.findOne({
      _id: this._id + "_send"
    }) ? true : false;
  },

  recv_watch_active: function() {
    return Protwatch.findOne({
      _id: this._id + "_recv"
    }) ? true : false;
  },

  disabled_history_value: function(value_history) {
    var history_value = this;
    var index = historyIndex(value_history, history_value);
    return Session.equals("selected_history_value", index) ? 'disabled' : '';
  },

  history_count: function(value_history) {
    var history_value = this;
    return historyIndex(value_history, history_value);
  }
});

function historyIndex(value_history, history_value) {
    var index = -1;
    _.each(value_history, function(h_val, idx) {
      if(_.isEqual(h_val, history_value)) {
        index = idx;
      }
    });
    return index;
}

function loadHistoryValues(tmpl) {
    var protocol_id = Session.get("protocol_selected");
    var protocol = Protdef.findOne({_id: protocol_id});
    if(protocol) {
      var telegram_id = Session.get("telegram_selected_watch");
      var telegram = protocol.findTelegramById(telegram_id);
      var history_value = telegram.value_history[Session.get("selected_history_value")];

      if(history_value) {
        var value_names = _.keys(history_value);
        _.each(value_names, function(name) {
          var value_input = tmpl.find('#send_' + name);
          if(value_input)
            value_input.value = history_value[name];
        });
      }
    }
  }

Template.protwatch.rendered = function() {
  var tmpl = this;
  console.log("protwatch rendered");
  loadHistoryValues(tmpl);
};

function send(telegram, tmpl, type) {
  //TODO check if sending possible (maybe if watch active)
  var value_history = telegram.value_history || [];
  var history_value = {};
  for (var i = 0; i < telegram.values.length; i++) {
    var value = telegram.values[i];
    var value_html = tmpl.find("#send_" + value.name).value;

    telegram.values[i].current = value_html;
    history_value[value.name] = value_html;
  }

  //TODO sort
  if (!_.findWhere(value_history, history_value)) {
    if(value_history.length == 10) {
      value_history.shift();
    }
    value_history.push(history_value);
    loadHistoryValues(tmpl, history_value);
    Session.set("selected_history_value", value_history.length - 1);
  }

  Meteor.call("sendTelegram", Session.get("protocol_selected"), telegram, {type: type});

  Meteor.call("updateTelegramValueHistory",
    Session.get("protocol_selected"),
    telegram._id,
    value_history);
}

Template.protwatch.events({
  'click .watch_telegram': function(evt, tmpl) {
    var telegram = this;
    Session.set("telegram_selected_watch", telegram._id);
  },

  'click #send_send': function(evt, tmpl) {
    send(this, tmpl, "_send");
  },

  'click #send_recv': function(evt, tmpl) {
    send(this, tmpl, "_recv");
  },

  'click .history_value': function(evt, tmpl) {
    Session.set("selected_history_value", +evt.currentTarget.innerText);
    loadHistoryValues(tmpl);
  },

  'click .history_value_left': function(evt, tmpl) {
    var telegram = this;
    var history_value_index = Session.get("selected_history_value");
    if(history_value_index === 0) {
      Session.set("selected_history_value", telegram.value_history.length - 1);
    } else {
      Session.set("selected_history_value", history_value_index - 1);
    }
    loadHistoryValues(tmpl);
  },

  'click .history_value_right': function(evt, tmpl) {
    var telegram = this;
    var history_value_index = Session.get("selected_history_value");
    if(history_value_index === telegram.value_history.length - 1) {
      Session.set("selected_history_value", 0);
    } else {
      Session.set("selected_history_value", history_value_index + 1);
    }
    loadHistoryValues(tmpl);
  },

  'click #loopback': function(evt, tmpl) {
    var protwatch = this;
    var loopback_counter = +tmpl.find("#loopback_counter").value;

    Meteor.call("sendTelegram", protwatch._id, protwatch.raw, {
      count: loopback_counter,
      type: "_send"
    });
  },

  'click #start_send_watch': function(evt, tmpl) {
    var protocol = this;
    Meteor.call("startWatch", protocol, "_send");
  },

  'click #start_recv_watch': function(evt, tmpl) {
    var protocol = this;
    Meteor.call("startWatch", protocol, "_recv");
  },

  'click #stop_send_watch': function(evt, tmpl) {
    var protocol = this;
    var watch = Protwatch.findOne({
      _id: protocol._id + "_send"
    });
    if (watch) {
      //stop logging
      Meteor.call(protocol);
      Session.set("logging_active", false);

      Meteor.call("endWatch", protocol._id, "_send");
    }
  },

  'click #stop_recv_watch': function(evt, tmpl) {
    var protocol = this;
    var watch = Protwatch.findOne({
      _id: protocol._id + "_recv"
    });
    if (watch) {
      //stop logging
      Meteor.call(protocol);
      Session.set("logging_active", false);

      Meteor.call("endWatch", protocol._id, "_recv");
    }
  },

  'click .send_nav_tab': function() {
    var type = this + "";
    Session.set("active_send_send_interface", type);
  },

  'click .recv_nav_tab': function() {
    var type = this + "";
    Session.set("active_recv_send_interface", type);
  }
});