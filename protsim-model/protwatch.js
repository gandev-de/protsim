Protwatch = new Meteor.Collection("protwatch", {
  transform: function(coll) {
    if(Match.test(coll.send, String)) {
      coll.send = EJSON.parse(coll.send);
    }
    if(Match.test(coll.recv, String)) {
      coll.recv = EJSON.parse(coll.recv);
    }
    if(Match.test(coll.conversation_state, String)) {
      coll.conversation_state = EJSON.parse(coll.conversation_state);
    }
    return coll;
  }
});

if (Meteor.isClient) {
  Deps.autorun(function() {
    var protocol = Protdef.findOne({_id: Session.get("protocol_selected")});
    if(protocol) {
      Meteor.subscribe("protwatch", protocol);
    }
  });
}

if (Meteor.isServer) {
  //publish supervision changes
  Meteor.publish("protwatch", function(protocol) {
    var pub = this;

    if(!protocol instanceof Protocol) return;

    var supervision = ActiveSupervisions.get(protocol);

    var content = function() {
      return {
        send: EJSON.stringify(supervision.send_iface_content),
        recv: EJSON.stringify(supervision.recv_iface_content),
        conversation_state: EJSON.stringify(supervision.conversation_state)
      };
    };

    pub.added("protwatch", supervision.protocol._id, content());
    pub.ready();
    Log.info("initial publish..sub: " + pub._session.id);

    var supervision_listener = function() {
      pub.changed("protwatch", supervision.protocol._id, content());
      Log.info("change publish..sub: ", pub._session.id);
    };
    supervision.on('change', supervision_listener);

    //observe protdef changes
    pub.protdef_handle = Protdef.find({_id: protocol._id}).observeChanges({
      changed: function(id, fields) {
        if(fields.telegrams) {
          for (var i = 0; i < fields.telegrams.length; i++) {
            var telegram_json = fields.telegrams[i];
            var telegram = Telegram.fromJSONValue(telegram_json);
            supervision.protocol.telegrams[i] = telegram;
          }
        }
        //TODO update interfaces

        //TODO why is changed periodically called with identically conversations

        Log.info("update supervisioned protocol:" + id);
      }
    });

    pub.onStop(function() {
      Log.info("subscription stopped..sub: ", pub._session.id);
      supervision.removeListener("change", supervision_listener);
      pub.protdef_handle.stop();
    });
    Log.info("subscription started..sub: ", pub._session.id);
  });

  Meteor.methods({
    sendTelegram: function(protocol_id, telegram, options) {
      options = options || {};
      var direction = options.direction || "pr";
      var count = options.count || 1;
      var supervision = ActiveSupervisions.get(protocol_id);
      if (supervision && telegram instanceof Telegram) {
        supervision.sendMessage(telegram.convertToBuffer(), direction, telegram);
      } else if(supervision) {
        if (count > 0 && count <= 1000) {
          for (var i = 0; i < count; i++) {
            supervision.sendMessage(new Buffer(telegram), direction);
          }
        }
      }
    },

    startWatch: function(protocol, direction) {
      var supervision = ActiveSupervisions.get(protocol._id);
      if (supervision) {
        supervision.startWatch(direction);
      }
    },

    endWatch: function(protocol_id, direction) {
      var supervision = ActiveSupervisions.get(protocol_id);
      if (supervision) {
        supervision.stopWatch(direction);
      }
      //TODO delete ActiveSupervisions.get(protocol_id); if no connection active?
    },

    //TODO just conversation name as parameter?
    startConversation: function(protocol_id, conversation) {
      var supervision = ActiveSupervisions.get(protocol_id);
      if (supervision && conversation instanceof Conversation && conversation.sequence.length > 0) {
        supervision.startConversation(conversation);
        return true;
      }
      return false;
    },

    cancelConversation: function(protocol_id) {
      //TODO just conversation name?
      var supervision = ActiveSupervisions.get(protocol_id);
      if (supervision && supervision.current_conversation) {
        supervision.current_conversation = Conversation.CANCELED;
      }
    },

    updateTelegramValueHistory: function(protocol_id, telegram_id, value_history) {
      Protdef.update({
        _id: protocol_id,
        'telegrams._id': telegram_id
      }, {
        '$set': {
          'telegrams.$.value_history': value_history
        }
      });
      Log.info("telegram history updated: ", telegram_id);
    },

    updateProtocolConversation: function(protocol_id, conversation) {
      conversation.updateSequenceIdx();
      Protdef.update({
        _id: protocol_id,
        'conversations.name': conversation.name
      }, {
        '$set': {
          'conversations.$.sequence': conversation.sequence
        }
      });
      Log.info("conversation updated: ", conversation.name);
    }
  });
}
