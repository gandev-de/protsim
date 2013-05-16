if (Meteor.isClient) {
  ////////// Helpers for in-place editing //////////

  // Returns an event map that handles the "escape" and "return" keys and
  // "blur" events on a text input (given by selector) and interprets them
  // as "ok" or "cancel".
  var okCancelEvents = function (selector, callbacks) {
    var ok = callbacks.ok || function () {};
    var cancel = callbacks.cancel || function () {};

    var events = {};
    events['keyup '+selector+', keydown '+selector+', focusout '+selector] =
      function (evt) {
        if (evt.type === "keydown" && evt.which === 27) {
          // escape = cancel
          cancel.call(this, evt);

        } else if (evt.type === "keyup" && evt.which === 13 ||
                   evt.type === "focusout") {
          // blur/return/enter = ok/submit if non-empty
          var value = String(evt.target.value || "");
          if (value)
            ok.call(this, value, evt);
          else
            cancel.call(this, evt);
        }
      };

    return events;
  };

  var activateInput = function (input) {
    input.focus();
    input.select();
  };

  Session.set("protocol_selected", false);
  Session.set("telegram_selected", false);

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
      return Protdef.findOne({_id: Session.get("protocol_selected")});
    },

    editing_local_port: function () {
      return Session.equals("editing_local_port", this._id) ? true : false;
    },

    editing_remote_port: function () {
      return Session.equals("editing_remote_port", this._id) ? true : false;
    },

    editing_remote_ip: function () {
      return Session.equals("editing_remote_ip", this._id) ? true : false;
    }
  });

  Template.def.events({
    'click .protocol': function () {
      var self = this;
      Session.set("protocol_selected", self._id);
      Session.set("telegram_selected", null);
    },

    'click .telegram': function () {
      var self = this;
      Session.set("telegram_selected", self._id);
    },

    'click #testcreate' : function () {
      Meteor.call("saveProtocol", new Protocol());
    },

    'click #testremove' : function () {
      var watch = Protwatch.findOne({_id: this._id});
      if(watch) {
        Meteor.call("endWatch", this._id);
      }
      Protdef.remove({_id: this._id});
    },

    'dblclick .display_local_port': function (evt, tmpl) {
      Session.set('editing_local_port', this._id);
      Deps.flush(); // update DOM before focus
      activateInput(tmpl.find("#" + this._id + "_local_port"));
    },

    'dblclick .display_remote_port': function (evt, tmpl) {
      Session.set('editing_remote_port', this._id);
      Deps.flush(); // update DOM before focus
      activateInput(tmpl.find("#" + this._id + "_remote_port"));
    },

    'dblclick .display_remote_ip': function (evt, tmpl) {
      Session.set('editing_remote_ip', this._id);
      Deps.flush(); // update DOM before focus
      activateInput(tmpl.find("#" + this._id + "_remote_ip"));
    }
  });

  Template.def.events(okCancelEvents(
    '.edit_local_port', {
      ok: function (value) {
        Protdef.update({_id: Session.get("protocol_selected")}, {
          '$set': {'interface.transport.local_port': value}});
        Session.set('editing_local_port', null);
      },

      cancel: function () {
        Session.set('editing_local_port', null);
      }
    }
  ));

  Template.def.events(okCancelEvents(
    '.edit_remote_port', {
      ok: function (value) {
        Protdef.update({_id: Session.get("protocol_selected")}, {
          '$set': {'interface.transport.remote_port': value}});
        Session.set('editing_remote_port', null);
      },

      cancel: function () {
        Session.set('editing_remote_port', null);
      }
    }
  ));

  Template.def.events(okCancelEvents(
    '.edit_remote_ip', {
      ok: function (value) {
        Protdef.update({_id: Session.get("protocol_selected")}, {
          '$set': {'interface.transport.remote_ip': value}});
        Session.set('editing_remote_ip', null);
      },

      cancel: function () {
        Session.set('editing_remote_ip', null);
      }
    }
  ));

  //************* watch Template *************

  Template.watch.helpers({
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

  Template.watch.events({
    'click #testsend': function (evt, tmpl) {
      var test = tmpl.find("#test").value;
      var protocol = this;

      var telegram = protocol.telegrams[0];
      telegram.values[0].current = test;

      Meteor.call("sendTelegram", protocol._id, telegram);
    },

    'click #loopback': function (evt, tmpl) {
      var protocol = this;
      var prot_watch = Protwatch.findOne({_id: protocol._id});

      Meteor.call("sendTelegram", protocol._id, prot_watch.raw);
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
}
