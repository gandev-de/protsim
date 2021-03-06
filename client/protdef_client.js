// TODO
//
// Control.create('TelegramForm', {
//   extend: FormEnhanced,

//   onSubmit: function (fields, form) {
//     Log.info(fields);

//     Meteor.call("updateTelegram",
//       Session.get("protocol_selected"),
//       Session.get("telegram_selected_def"),
//       _.values(fields));

//     //form.reset(); //TODO weird behavior
//   }
// });

var INTERFACE_TYPES = ["udp", "tcp"];
var INTERFACE_MODES = ["client", "server"];

var switchInterface = function(tmpl, type) {
  var mode_value = '';
  var transport_type = tmpl.find("#interface_type");
  var type_value = transport_type.options[transport_type.selectedIndex].text;

  if(type_value != "udp") {
    var mode = tmpl.find("#interface_mode");
    mode_value = mode.options[mode.selectedIndex].text;
  }

  var protocol_id = Session.get("protocol_selected");
  Meteor.call("endWatch", protocol_id);

  var val = {};
  val[type + 'interface.name'] = type_value + "_" + mode_value;
  val[type + 'interface.transport.mode'] = mode_value;
  val[type + 'interface.transport.type'] = type_value;

  Protdef.update({
    _id: protocol_id
  }, {
    '$set': val
  });
};

var swapValue = function(telegram, value_name, direction) {
 var new_values = [];
 var skip_next = false;
  _.each(telegram.values, function(value, i, l) {
    if(skip_next === false) {
      if(l.length == 1 || value.name !== value_name) {
        new_values.push(value);
      } else {
        if(direction == "up") {
          var last_value = new_values[i - 1];
          if(last_value) {
            //swap with upper value if at least second
            new_values[i - 1] = value;
            new_values.push(last_value);
          } else {
            //at the top
            new_values.push(value);
          }
        } else if(direction == "down") {
          var next_value = l[i + 1];
          if(next_value) {
            //swap with upper value if at least second
            new_values.push(next_value);
            new_values.push(value);
            skip_next = true;
          } else {
            //at the bottom
            new_values.push(value);
          }
        }
      }
    } else {
      skip_next = false;
    }
  });

  telegram.values = new_values;

  Log.info(telegram);

  Meteor.call('updateTelegram',
    Session.get("protocol_selected"),
    telegram._id,
    telegram.values);
};

var updateProtdefValue = function(value_selector, value, id) {
  var val = {};
  val[value_selector] = value;
  id = id || Session.get("protocol_selected");

  if(!id) return;

  Protdef.update({
    _id: id
  }, {
    '$set': val
  });
};

////////// Helpers for in-place editing //////////

// Returns an event map that handles the "escape" and "return" keys and
// "blur" events on a text input (given by selector) and interprets them
// as "ok" or "cancel".
var okCancelEvents = function(selector, callbacks) {
  var ok = callbacks.ok || function() {};
  var cancel = callbacks.cancel || function() {};

  var events = {};
  events['keyup ' + selector + ', keydown ' + selector +
    ', focusout ' + selector] = function(evt, tmpl) {
      if (evt.type === "keydown" && evt.which === 27) {
        // escape = cancel
        cancel.call(this, evt);

      } else if (evt.type === "keyup" && evt.which === 13 ||
        evt.type === "focusout") {
        // blur/return/enter = ok/submit if non-empty
        var value = String(evt.target.value || "");
        if (value)
          ok.call(this, value, evt, tmpl);
        else
          cancel.call(this, evt, tmpl);
      }
  };
  return events;
};

var activateInput = function(input) {
  input.focus();
  input.select();
};

Session.set("protocol_selected", null);
Session.set("telegram_selected_def", null);

Meteor.startup(function() {
  Protdef.find().observe({
    added: function(doc) {
      //select random protocol if none selected
      if(Session.equals("protocol_selected", null)) {
        var protocol = doc || {_id: null};
        Session.set("protocol_selected", protocol._id);
      }
    }
  });
});

//************* protdef Template *************

Template.protdef.events(okCancelEvents(
  '.edit_protocol_name', {
  ok: function(value) {
    updateProtdefValue('name', value);
    Session.set('editing_protocol_name', null);
  },

  cancel: function() {
    Session.set('editing_protocol_name', null);
  }
}));

Template.protdef.events(okCancelEvents(
  '.edit_telegram_name', {
  ok: function(value) {
    var telegram = this;

    Meteor.call('updateTelegram',
      Session.get("protocol_selected"),
      telegram._id,
      telegram.values,
      value);

    Session.set('editing_telegram_name', null);
  },

  cancel: function() {
    Session.set('editing_telegram_name', null);
  }
}));

Template.protdef.helpers({
  equal: function(a, b) {
    return a == b;
  },

  value_types: function() {
    return [
        "String",
        "UInt8",
        "UInt16LE",
        "UInt16BE",
        "UInt32LE",
        "UInt32BE",
        "Int8",
        "Int16LE",
        "Int16BE",
        "Int32LE",
        "Int32BE",
        "FloatLE",
        "FloatBE",
        "DoubleLE",
        "DoubleBE"];
  },

  iface: function(iface, type) {
    iface.type = type;
    return iface;
  },

  editing_protocol_name: function() {
    return Session.equals("editing_protocol_name", this._id) ? true : false;
  },

  editing_telegram_name: function() {
    return Session.equals("editing_telegram_name", this._id) ? true : false;
  },

  protdef: function() {
    return Protdef.find();
  },

  selected_protocol: function() {
    return Session.equals("protocol_selected", this._id) ? 'selected' : '';
  },

  selected_telegram: function() {
    return Session.equals("telegram_selected_def", this._id) ? 'selected' : '';
  },

  checked_value: function() {
    var value = this;
    return value.ident_val ? "checked" : "";
  },

  protocol: function() {
    return Protdef.findOne({
      _id: Session.get("protocol_selected")
    });
  },

  telegram: function(protocol) {
    var telegrams = protocol.telegrams;
    for (var i = 0; i < telegrams.length; i++) {
      var telegram = telegrams[i];
      if (Session.equals("telegram_selected_def", telegram._id)) {
        return telegram;
      }
    }
  }
});

Template.protdef.events({
  'dblclick .display_protocol_name': function(evt, tmpl) {
    Session.set('editing_protocol_name', this._id);
    Deps.flush(); // update DOM before focus
    activateInput(tmpl.find("#" + this._id + "_protocol_name"));
  },

  'dblclick .display_telegram_name': function(evt, tmpl) {
    Session.set('editing_telegram_name', this._id);
    Deps.flush(); // update DOM before focus
    activateInput(tmpl.find("#" + this._id + "_telegram_name"));
  },

  'click .protocol': function() {
    var protocol = this;
    if (!Session.equals("protocol_selected", protocol._id)) {
      Session.set("protocol_selected", protocol._id);
      Session.set("telegram_selected_def", null);
    }
  },

  'click .telegram': function() {
    var telegram = this;
    Session.set("telegram_selected_def", telegram._id);
  },

  'click .add_protocol': function() {
    var protocol = this;
    Meteor.call("saveProtocol", protocol, true);
  },

  'click .remove_protocol': function() {
    var protocol = this;
    var protocol_count = Protdef.find().count();
    if(protocol_count > 1) {
      Meteor.call("endWatch", protocol._id);
      Protdef.remove({
        _id: protocol._id
      });
    }
  },

  'click .add_telegram': function() {
    var protocol = this;
    protocol.telegrams.push(new Telegram());
    Meteor.call("saveProtocol", protocol);
  },

  'click .remove_telegram': function() {
    var protocol = this;
    var telegram_id = Session.get("telegram_selected_def");
    protocol.telegrams = _.filter(protocol.telegrams, function(telegram) {
        return telegram._id != telegram_id;
      });

    Meteor.call("saveProtocol", protocol);
  },

  'click .add_value': function(evt, tmpl) {
    var telegram = this;
    var value_name = evt.currentTarget.id;

    telegram.addValue(value_name);

    Log.info(telegram);

    Meteor.call('updateTelegram',
      Session.get("protocol_selected"),
      telegram._id,
      telegram.values);
  },

  'click .remove_value': function(evt, tmpl) {
    var telegram = this;
    var value_name = evt.currentTarget.id;

    telegram.values = _.filter(telegram.values, function(value, i, l) {
      return l.length == 1 || value.name !== value_name;
    });

    Log.info(telegram);

    Meteor.call('updateTelegram',
      Session.get("protocol_selected"),
      telegram._id,
      telegram.values);
  },

  'click .up': function(evt, tmpl) {
    var telegram = this;
    var value_name = evt.currentTarget.id;

    swapValue(telegram, value_name, "up");
  },

  'click .down': function(evt, tmpl) {
    var telegram = this;
    var value_name = evt.currentTarget.id;

    swapValue(telegram, value_name, "down");
  }
});

//************* interface Template *************

Template.interface.created = function() {
  var tmpl = this;
  tmpl.iface = tmpl.data.type; //TODO not working on modal, why here
};

Template.interface.helpers({
  editing_local_port: function() {
    return Session.equals("editing_local_port", this._id) ? true : false;
  },

  editing_remote_port: function() {
    return Session.equals("editing_remote_port", this._id) ? true : false;
  },

  editing_remote_ip: function() {
    return Session.equals("editing_remote_ip", this._id) ? true : false;
  }
});

Template.interface.events({
  'click .display_local_port': function(evt, tmpl) {
    Session.set('editing_local_port', this._id);
    Deps.flush(); // update DOM before focus
    activateInput(tmpl.find("#" + this._id + "_local_port"));
  },

  'click .display_remote_port': function(evt, tmpl) {
    Session.set('editing_remote_port', this._id);
    Deps.flush(); // update DOM before focus
    activateInput(tmpl.find("#" + this._id + "_remote_port"));
  },

  'click .display_remote_ip': function(evt, tmpl) {
    Session.set('editing_remote_ip', this._id);
    Deps.flush(); // update DOM before focus
    activateInput(tmpl.find("#" + this._id + "_remote_ip"));
  }
});

Template.interface.events(okCancelEvents(
  '.edit_local_port', {
  ok: function(value, evt, tmpl) {
    var value_selector = tmpl.iface + 'interface.transport.local_port';
    updateProtdefValue(value_selector, value);
    Session.set('editing_local_port', null);
  },

  cancel: function() {
    Session.set('editing_local_port', null);
  }
}));

Template.interface.events(okCancelEvents(
  '.edit_remote_port', {
  ok: function(value, evt, tmpl) {
    var value_selector = tmpl.iface + 'interface.transport.remote_port';
    updateProtdefValue(value_selector, value);
    Session.set('editing_remote_port', null);
  },

  cancel: function() {
    Session.set('editing_remote_port', null);
  }
}));

Template.interface.events(okCancelEvents(
  '.edit_remote_ip', {
  ok: function(value, evt, tmpl) {
    var value_selector = tmpl.iface + 'interface.transport.remote_ip';
    updateProtdefValue(value_selector, value);
    Session.set('editing_remote_ip', null);
  },

  cancel: function() {
    Session.set('editing_remote_ip', null);
  }
}));

/* Template modalDefTypeAndModeSend*/

Template.modalDefTypeAndModeSend.helpers({
  interface_types: function() {
    return INTERFACE_TYPES;
  },

  interface_modes: function() {
    return INTERFACE_MODES;
  }
});

Template.modalDefTypeAndModeSend.events({
  'click .switch_interface': function(evt, tmpl) {
    switchInterface(tmpl, "send_");
  }
});

/* Template modalDefTypeAndModeRecv*/

Template.modalDefTypeAndModeRecv.helpers({
  interface_types: function() {
    return INTERFACE_TYPES;
  },

  interface_modes: function() {
    return INTERFACE_MODES;
  }
});

Template.modalDefTypeAndModeRecv.events({
  'click .switch_interface': function(evt, tmpl) {
    switchInterface(tmpl, "recv_");
  }
});